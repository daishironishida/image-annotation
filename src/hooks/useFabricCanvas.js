import { useEffect, useRef, useCallback, useState } from 'react'
import { Canvas, Rect, Ellipse, Line, Textbox } from 'fabric'
import { readFileAsDataURL, renderPdfPage, renderAllPdfPagesForExport } from '../utils/fileUtils'

export default function useFabricCanvas({
  canvasEl,
  file,
  activeTool,
  strokeColor,
  fillColor,
  fillEnabled,
  strokeWidth,
  pageNum,
  onTotalPages,
  fontSize,
  onToolChange,
  onSelectionStyle,
  onSelectionCleared,
  canvasAreaRef,
}) {
  const fabricRef = useRef(null)
  const drawRef = useRef({ isDrawing: false, startX: 0, startY: 0, shape: null })
  const toolOptsRef = useRef({ strokeColor, fillColor, fillEnabled, strokeWidth, activeTool })
  // Holds the background image element + its drawn dimensions
  const bgRef = useRef({ img: null, w: 0, h: 0 })
  const historyStack = useRef([])
  const historyIdx = useRef(-1)
  const isRestoring = useRef(false)
  const saveDebounceRef = useRef(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [zoom, setZoomState] = useState(1)
  const zoomRef = useRef(1)
  const pendingScrollRef = useRef(null)
  // Per-page annotation state for PDFs
  const fileRef = useRef(null)
  const totalPagesRef = useRef(1)
  const currentPageRef = useRef(1)
  const pageStatesRef = useRef({})
  const prevFileRef = useRef(null)

  // Apply zoom: resize canvas, optionally scroll to keep viewport center stable
  const applyZoom = useCallback((newZoom) => {
    newZoom = Math.max(0.1, Math.min(4, newZoom))
    const area = canvasAreaRef?.current
    const oldZoom = zoomRef.current
    if (area) {
      const scale = newZoom / oldZoom
      const cx = area.scrollLeft + area.clientWidth / 2
      const cy = area.scrollTop + area.clientHeight / 2
      pendingScrollRef.current = {
        left: cx * scale - area.clientWidth / 2,
        top: cy * scale - area.clientHeight / 2,
      }
    }
    setZoomState(newZoom)
  }, [canvasAreaRef])

  // Keep tool opts ref in sync
  useEffect(() => {
    toolOptsRef.current = { strokeColor, fillColor, fillEnabled, strokeWidth, fontSize, activeTool }
  }, [strokeColor, fillColor, fillEnabled, strokeWidth, fontSize, activeTool])

  // Apply style changes to the currently selected object (select mode only)
  useEffect(() => {
    if (activeTool !== 'select') return
    const canvas = fabricRef.current
    if (!canvas) return
    const obj = canvas.getActiveObject()
    if (!obj) return
    const isText = obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text'
    if (isText) {
      obj.set({ fill: strokeColor, fontSize })
    } else {
      const oldStrokeWidth = obj.strokeWidth ?? 0
      const delta = strokeWidth - oldStrokeWidth
      const updates = {
        stroke: strokeColor,
        fill: fillEnabled ? fillColor : 'transparent',
        strokeWidth,
      }
      if (obj.type === 'rect') {
        updates.width = Math.max(0, obj.width - delta)
        updates.height = Math.max(0, obj.height - delta)
      } else if (obj.type === 'ellipse') {
        updates.rx = Math.max(0, obj.rx - delta / 2)
        updates.ry = Math.max(0, obj.ry - delta / 2)
      } else {
        updates.left = obj.left - delta / 2
        updates.top = obj.top - delta / 2
      }
      obj.set(updates)
      obj.setCoords()
    }
    canvas.renderAll()
    clearTimeout(saveDebounceRef.current)
    saveDebounceRef.current = setTimeout(saveState, 400)
  }, [strokeColor, fillColor, fillEnabled, strokeWidth, fontSize]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── History helpers ─────────────────────────────────────────────────────────
  const saveState = useCallback(() => {
    if (isRestoring.current) return
    const canvas = fabricRef.current
    if (!canvas) return
    const json = canvas.toJSON()
    historyStack.current = historyStack.current.slice(0, historyIdx.current + 1)
    historyStack.current.push(json)
    historyIdx.current = historyStack.current.length - 1
    setCanUndo(historyIdx.current > 0)
    setCanRedo(false)
  }, [])

  const restoreState = useCallback(async (idx) => {
    const canvas = fabricRef.current
    if (!canvas) return
    isRestoring.current = true
    await canvas.loadFromJSON(historyStack.current[idx])
    const isSelect = toolOptsRef.current.activeTool === 'select'
    canvas.getObjects().forEach(obj => {
      obj.selectable = isSelect
      obj.evented = isSelect
      if (obj.type === 'textbox') {
        obj.setControlsVisibility({ mt: false, mb: false })
      }
    })
    canvas.selection = isSelect
    canvas.renderAll()
    isRestoring.current = false
  }, [])

  const undo = useCallback(async () => {
    clearTimeout(saveDebounceRef.current)
    if (historyIdx.current <= 0) return
    historyIdx.current--
    await restoreState(historyIdx.current)
    setCanUndo(historyIdx.current > 0)
    setCanRedo(true)
  }, [restoreState])

  const redo = useCallback(async () => {
    clearTimeout(saveDebounceRef.current)
    if (historyIdx.current >= historyStack.current.length - 1) return
    historyIdx.current++
    await restoreState(historyIdx.current)
    setCanUndo(true)
    setCanRedo(historyIdx.current < historyStack.current.length - 1)
  }, [restoreState])

  // ── Initialize Fabric canvas ────────────────────────────────────────────────
  useEffect(() => {
    if (fabricRef.current) return
    const canvas = new Canvas(canvasEl.current, {
      selection: true,
      enableRetinaScaling: true,
      uniformScaling: false,
    })
    fabricRef.current = canvas

    // Draw background image before every Fabric render pass.
    // Use e.ctx (not canvas.getContext()) so it works for both live render and toDataURL's offscreen canvas.
    canvas.on('before:render', (e) => {
      const { img, w, h } = bgRef.current
      if (!img) return
      e.ctx.drawImage(img, 0, 0, w * zoomRef.current, h * zoomRef.current)
    })

    // Mouse wheel: Ctrl/Cmd+scroll zooms, plain scroll falls through to container
    canvas.on('mouse:wheel', (opt) => {
      const e = opt.e
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      e.stopPropagation()
      const oldZoom = zoomRef.current
      let newZoom = oldZoom * Math.pow(0.999, e.deltaY)
      newZoom = Math.max(0.1, Math.min(4, newZoom))
      const area = canvasAreaRef?.current
      if (area) {
        const rect = area.getBoundingClientRect()
        const mouseX = e.clientX - rect.left + area.scrollLeft
        const mouseY = e.clientY - rect.top + area.scrollTop
        const scale = newZoom / oldZoom
        pendingScrollRef.current = {
          left: mouseX * scale - (e.clientX - rect.left),
          top: mouseY * scale - (e.clientY - rect.top),
        }
      }
      setZoomState(newZoom)
    })

    canvas.on('object:modified', saveState)

    // Enter commits text editing; Shift+Enter inserts a newline (default).
    canvas.on('text:editing:entered', (e) => {
      const obj = e.target
      const textarea = obj.hiddenTextarea
      if (!textarea) return
      const handler = (ke) => {
        if (ke.key === 'Enter' && !ke.shiftKey) {
          ke.preventDefault()
          ke.stopImmediatePropagation()
          obj.exitEditing()
          canvas.renderAll()
          saveState()
        }
      }
      obj._enterHandler = handler
      textarea.addEventListener('keydown', handler, true) // capture → fires before Fabric's handler
    })
    canvas.on('text:editing:exited', (e) => {
      const obj = e.target
      if (obj._enterHandler && obj.hiddenTextarea) {
        obj.hiddenTextarea.removeEventListener('keydown', obj._enterHandler, true)
        delete obj._enterHandler
      }
    })

    // For Textbox: convert scaleX → width (no font stretch), cancel scaleY (height = content).
    canvas.on('object:scaling', (e) => {
      const obj = e.target
      if (obj.type !== 'textbox') return
      obj.set({ width: obj.width * obj.scaleX, scaleX: 1, scaleY: 1 })
      obj.setCoords()
    })

    // Sync toolbar when an object is selected
    const syncSelection = (e) => {
      const obj = e?.selected?.[0] ?? canvas.getActiveObject()
      if (!obj || !onSelectionStyle) return
      const isText = obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text'
      onSelectionStyle({
        strokeColor: (isText ? obj.fill : obj.stroke) ?? '#ff3b30',
        fillColor: (!isText && obj.fill && obj.fill !== 'transparent') ? obj.fill : '#ff3b30',
        fillEnabled: !isText && !!obj.fill && obj.fill !== 'transparent',
        strokeWidth: obj.strokeWidth ?? 2,
        fontSize: obj.fontSize ?? 20,
        isText,
      })
    }
    canvas.on('selection:created', syncSelection)
    canvas.on('selection:updated', syncSelection)
    canvas.on('selection:cleared', () => onSelectionCleared?.())

    return () => {
      canvas.dispose()
      fabricRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Zoom ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current
    const { w, h } = bgRef.current
    if (!canvas || !w) return
    zoomRef.current = zoom
    canvas.setZoom(zoom)
    canvas.setDimensions({ width: w * zoom, height: h * zoom })
    canvas.renderAll()
    if (pendingScrollRef.current && canvasAreaRef?.current) {
      const { left, top } = pendingScrollRef.current
      pendingScrollRef.current = null
      canvasAreaRef.current.scrollLeft = left
      canvasAreaRef.current.scrollTop = top
    }
  }, [zoom]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load file ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!fabricRef.current || !file) return
    const canvas = fabricRef.current

    async function load() {
      const isNewFile = file !== prevFileRef.current
      if (isNewFile) {
        // New file: reset all per-page state
        pageStatesRef.current = {}
        prevFileRef.current = file
        fileRef.current = file
      } else {
        // Page navigation within same PDF: save current page annotations
        const objects = canvas.getObjects()
        if (objects.length > 0) {
          pageStatesRef.current[currentPageRef.current] = canvas.toJSON()
        }
      }
      currentPageRef.current = pageNum

      // Clear annotations and history
      canvas.clear()
      bgRef.current = { img: null, w: 0, h: 0 }
      historyStack.current = []
      historyIdx.current = -1
      setCanUndo(false)
      setCanRedo(false)

      let dataUrl, naturalW, naturalH, totalPages = 1

      if (file.type === 'application/pdf') {
        const result = await renderPdfPage(file, pageNum)
        dataUrl = result.dataUrl
        naturalW = result.width
        naturalH = result.height
        totalPages = result.totalPages
        totalPagesRef.current = totalPages
      } else {
        dataUrl = await readFileAsDataURL(file)
        await new Promise(resolve => {
          const tmp = new Image()
          tmp.onload = () => { naturalW = tmp.naturalWidth; naturalH = tmp.naturalHeight; resolve() }
          tmp.src = dataUrl
        })
      }

      onTotalPages(totalPages)

      // Scale to fit viewport
      const maxW = window.innerWidth - 48   // 24px padding each side
      const maxH = window.innerHeight - 52 - 48
      const scale = Math.min(maxW / naturalW, maxH / naturalH, 1)
      const w = Math.round(naturalW * scale)
      const h = Math.round(naturalH * scale)

      // Load full-res image element for the background renderer
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = dataUrl
      })

      bgRef.current = { img, w, h }
      // Reset zoom to 1 for new file/page
      zoomRef.current = 1
      pendingScrollRef.current = null
      canvas.setZoom(1)
      canvas.setDimensions({ width: w, height: h })
      if (canvasAreaRef?.current) {
        canvasAreaRef.current.scrollLeft = 0
        canvasAreaRef.current.scrollTop = 0
      }
      // Restore saved annotations for this page if returning to it
      const savedState = pageStatesRef.current[pageNum]
      if (savedState) {
        isRestoring.current = true
        await canvas.loadFromJSON(savedState)
        const isSelect = toolOptsRef.current.activeTool === 'select'
        canvas.getObjects().forEach(obj => {
          obj.selectable = isSelect
          obj.evented = isSelect
          if (obj.type === 'textbox') obj.setControlsVisibility({ mt: false, mb: false })
        })
        canvas.selection = isSelect
        isRestoring.current = false
      }
      canvas.renderAll()
      saveState()
      setZoomState(1)
    }

    load()
  }, [file, pageNum]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tool event handlers ─────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    canvas.off('mouse:down')
    canvas.off('mouse:move')
    canvas.off('mouse:up')
    canvas.off('object:added')

    const isSelect = activeTool === 'select'
    canvas.selection = isSelect
    canvas.getObjects().forEach(obj => {
      obj.selectable = isSelect
      obj.evented = isSelect
    })
    canvas.renderAll()

    if (activeTool === 'select') return

    if (activeTool === 'text') {
      canvas.on('mouse:down', (e) => {
        if (e.target) return
        const pointer = e.scenePoint
        const { strokeColor, fontSize } = toolOptsRef.current
        const text = new Textbox('Text', {
          left: pointer.x,
          top: pointer.y,
          originX: 'left',
          originY: 'top',
          width: 200,
          fontSize,
          fill: strokeColor,
          fontFamily: '-apple-system, Helvetica Neue, Arial, sans-serif',
          selectable: true,
          evented: true,
          splitByGrapheme: false,
        })
        // Hide top/bottom-only handles — they only do scaleY which we cancel for textboxes
        text.setControlsVisibility({ mt: false, mb: false })
        canvas.add(text)
        canvas.setActiveObject(text)
        text.enterEditing()
        text.selectAll()
        canvas.renderAll()
        saveState()
        onToolChange('select')
      })
      return
    }

    // Shape tools
    canvas.on('mouse:down', (e) => {
      if (e.target) return
      const pointer = e.scenePoint
      drawRef.current.isDrawing = true
      drawRef.current.startX = pointer.x
      drawRef.current.startY = pointer.y

      const { strokeColor, fillColor, fillEnabled, strokeWidth } = toolOptsRef.current
      const fill = fillEnabled ? fillColor : 'transparent'

      let shape
      const base = {
        left: pointer.x,
        top: pointer.y,
        originX: 'left',
        originY: 'top',
        stroke: strokeColor,
        strokeWidth,
        fill,
        selectable: false,
        evented: false,
        strokeUniform: true,
      }

      if (activeTool === 'rect') {
        shape = new Rect({ ...base, width: 0, height: 0 })
      } else if (activeTool === 'ellipse') {
        shape = new Ellipse({ ...base, rx: 0, ry: 0 })
      } else if (activeTool === 'line') {
        shape = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: strokeColor,
          strokeWidth,
          selectable: false,
          evented: false,
          strokeUniform: true,
        })
      }

      drawRef.current.shape = shape
      canvas.add(shape)
    })

    canvas.on('mouse:move', (e) => {
      if (!drawRef.current.isDrawing || !drawRef.current.shape) return
      const pointer = e.scenePoint
      const { startX, startY, shape } = drawRef.current

      if (activeTool === 'rect') {
        shape.set({
          left: Math.min(pointer.x, startX),
          top: Math.min(pointer.y, startY),
          width: Math.abs(pointer.x - startX),
          height: Math.abs(pointer.y - startY),
        })
      } else if (activeTool === 'ellipse') {
        shape.set({
          left: Math.min(pointer.x, startX),
          top: Math.min(pointer.y, startY),
          rx: Math.abs(pointer.x - startX) / 2,
          ry: Math.abs(pointer.y - startY) / 2,
        })
      } else if (activeTool === 'line') {
        shape.set({ x2: pointer.x, y2: pointer.y })
      }

      canvas.renderAll()
    })

    canvas.on('mouse:up', () => {
      if (!drawRef.current.isDrawing) return
      drawRef.current.isDrawing = false
      const shape = drawRef.current.shape
      drawRef.current.shape = null
      if (!shape) return
      const tooSmall =
        (activeTool === 'rect' && (shape.width < 2 || shape.height < 2)) ||
        (activeTool === 'ellipse' && (shape.rx < 1 || shape.ry < 1)) ||
        (activeTool === 'line' && Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1) < 4)
      if (tooSmall) { canvas.remove(shape); return }
      shape.set({ selectable: true, evented: true })
      canvas.setActiveObject(shape)
      canvas.renderAll()
      saveState()
      onToolChange('select')
    })
  }, [activeTool, saveState])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e) {
      const canvas = fabricRef.current
      if (!canvas) return
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault(); undo()
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault(); redo()
      } else if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault(); applyZoom(Math.min(4, zoomRef.current * 1.25))
      } else if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault(); applyZoom(Math.max(0.1, zoomRef.current / 1.25))
      } else if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault(); applyZoom(1)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = canvas.getActiveObject()
        if (active && !active.isEditing) {
          e.preventDefault()
          canvas.remove(active)
          canvas.discardActiveObject()
          canvas.renderAll()
          saveState()
        }
      } else if (e.key === 'Escape') {
        canvas.discardActiveObject()
        canvas.renderAll()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo, saveState, applyZoom])

  // ── Download ────────────────────────────────────────────────────────────────
  const download = useCallback(async (filename = 'annotated.png') => {
    const canvas = fabricRef.current
    if (!canvas) return
    const file = fileRef.current
    const { w, h } = bgRef.current

    // ── Image files ──────────────────────────────────────────────────────────
    if (!file || file.type !== 'application/pdf') {
      const format = file?.type === 'image/jpeg' ? 'jpeg' : 'png'
      const savedZoom = zoomRef.current
      if (savedZoom !== 1) {
        canvas.setZoom(1)
        canvas.setDimensions({ width: w, height: h })
      }
      const dataUrl = canvas.toDataURL({ format, multiplier: 1 })
      if (savedZoom !== 1) {
        canvas.setZoom(savedZoom)
        canvas.setDimensions({ width: w * savedZoom, height: h * savedZoom })
        canvas.renderAll()
      }
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = filename
      a.click()
      return
    }

    // ── PDF files: composite each page then save as PDF ──────────────────────
    // Save current page's annotations before iterating
    pageStatesRef.current[currentPageRef.current] = canvas.toJSON()

    const [{ jsPDF }, pageResults] = await Promise.all([
      import('jspdf'),
      renderAllPdfPagesForExport(file),
    ])

    // Composite each page (background + annotations) in parallel
    // renderPageForExport now returns a canvas directly — no PNG encode/decode round-trip
    const composites = await Promise.all(pageResults.map(async (pageResult, i) => {
      const p = i + 1
      const { canvas: bgCanvas, width: pgW, height: pgH } = pageResult

      // If no annotations, use the rendered canvas directly
      const pageState = pageStatesRef.current[p]
      if (!pageState?.objects?.length) {
        return { dataUrl: bgCanvas.toDataURL('image/jpeg', 0.92), pgW, pgH }
      }

      // Composite: draw PDF background then annotation layer
      const offscreen = document.createElement('canvas')
      offscreen.width = pgW
      offscreen.height = pgH
      const ctx = offscreen.getContext('2d')
      ctx.drawImage(bgCanvas, 0, 0)

      const tempEl = document.createElement('canvas')
      tempEl.width = pgW
      tempEl.height = pgH
      const tempFabric = new Canvas(tempEl, { enableRetinaScaling: false })
      await tempFabric.loadFromJSON(pageState)
      ctx.drawImage(tempEl, 0, 0)
      tempFabric.dispose()

      return { dataUrl: offscreen.toDataURL('image/jpeg', 0.92), pgW, pgH }
    }))

    const pxToPt = 72 / 96
    let pdf = null
    for (const { dataUrl, pgW, pgH } of composites) {
      if (!pdf) {
        pdf = new jsPDF({
          orientation: pgW >= pgH ? 'landscape' : 'portrait',
          unit: 'pt',
          format: [pgW * pxToPt, pgH * pxToPt],
        })
      } else {
        pdf.addPage([pgW * pxToPt, pgH * pxToPt], pgW >= pgH ? 'landscape' : 'portrait')
      }
      pdf.addImage(dataUrl, 'JPEG', 0, 0, pgW * pxToPt, pgH * pxToPt)
    }

    pdf.save(filename)
  }, [])

  return {
    undo, redo, canUndo, canRedo, download,
    zoom,
    zoomIn:    () => applyZoom(Math.min(4,   zoomRef.current * 1.25)),
    zoomOut:   () => applyZoom(Math.max(0.1, zoomRef.current / 1.25)),
    resetZoom: () => applyZoom(1),
  }
}
