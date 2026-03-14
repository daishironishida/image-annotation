import { useRef, useState } from 'react'
import Toolbar from './Toolbar'
import useFabricCanvas from '../hooks/useFabricCanvas'

export default function CanvasEditor({ file, onClose }) {
  const canvasEl = useRef(null)
  const canvasAreaRef = useRef(null)

  const [activeTool, setActiveTool] = useState('select')
  const [strokeColor, setStrokeColor] = useState('#ff3b30')
  const [fillColor, setFillColor] = useState('#ff3b30')
  const [fillEnabled, setFillEnabled] = useState(false)
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [fontSize, setFontSize] = useState(20)
  const [isTextSelected, setIsTextSelected] = useState(false)
  const [isObjectSelected, setIsObjectSelected] = useState(false)
  const [pageNum, setPageNum] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const { undo, redo, canUndo, canRedo, download, zoom, zoomIn, zoomOut, resetZoom } = useFabricCanvas({
    canvasEl,
    file,
    activeTool,
    strokeColor,
    fillColor,
    fillEnabled,
    strokeWidth,
    fontSize,
    pageNum,
    onTotalPages: setTotalPages,
    onToolChange: setActiveTool,
    onSelectionStyle: ({ strokeColor, fillColor, fillEnabled, strokeWidth, fontSize, isText }) => {
      setStrokeColor(strokeColor)
      setFillColor(fillColor)
      setFillEnabled(fillEnabled)
      setStrokeWidth(strokeWidth)
      setFontSize(fontSize)
      setIsTextSelected(!!isText)
      setIsObjectSelected(true)
    },
    onSelectionCleared: () => setIsObjectSelected(false),
    canvasAreaRef,
  })

  function handlePageChange(updater) {
    setPageNum(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      return Math.max(1, Math.min(totalPages, next))
    })
  }

  function downloadExt() {
    if (!file) return '.png'
    if (file.type === 'application/pdf') return '.pdf'
    if (file.type === 'image/jpeg') return '.jpg'
    return '.png'
  }
  const downloadName = file ? file.name.replace(/\.[^.]+$/, '') + downloadExt() : 'annotated.png'

  return (
    <div className="editor">
      <Toolbar
        activeTool={activeTool} onToolChange={setActiveTool}
        strokeColor={strokeColor} onStrokeColorChange={setStrokeColor}
        fillColor={fillColor} onFillColorChange={setFillColor}
        fillEnabled={fillEnabled} onFillEnabledChange={setFillEnabled}
        strokeWidth={strokeWidth} onStrokeWidthChange={setStrokeWidth}
        fontSize={fontSize} onFontSizeChange={setFontSize}
        isTextSelected={isTextSelected}
        isObjectSelected={isObjectSelected}
        onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo}
        onDownload={() => download(downloadName)}
        onClose={onClose}
        pageNum={pageNum} totalPages={totalPages} onPageChange={handlePageChange}
        zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onResetZoom={resetZoom}
      />
      <div className="canvas-area" ref={canvasAreaRef}>
        <div className="canvas-wrap">
          <canvas ref={canvasEl} />
        </div>
      </div>

      <style>{`
        .editor {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
        }
        .canvas-area {
          flex: 1;
          overflow: auto;
          background: #d0d0d0;
          padding: 24px;
        }
        .canvas-wrap {
          box-shadow: 0 4px 24px rgba(0,0,0,0.35);
          border-radius: 2px;
          overflow: hidden;
          line-height: 0;
          margin: 0 auto;
        }
      `}</style>
    </div>
  )
}
