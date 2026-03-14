export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

let pdfjsLib = null

async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib
  pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).href
  return pdfjsLib
}

// Cache the parsed PDF document to avoid re-parsing on every page render
let cachedDoc = null
let cachedFile = null

async function getPdfDocument(file) {
  if (cachedDoc && cachedFile === file) return cachedDoc
  const lib = await getPdfjs()
  const arrayBuffer = await file.arrayBuffer()
  cachedDoc?.destroy()
  cachedDoc = await lib.getDocument({ data: arrayBuffer }).promise
  cachedFile = file
  return cachedDoc
}

export async function renderPdfPage(file, pageNum) {
  const pdf = await getPdfDocument(file)
  const page = await pdf.getPage(pageNum)

  const dpr = window.devicePixelRatio || 1
  const viewport = page.getViewport({ scale: 2 * dpr })
  const offscreen = document.createElement('canvas')
  offscreen.width = viewport.width
  offscreen.height = viewport.height
  await page.render({ canvasContext: offscreen.getContext('2d'), viewport }).promise

  return {
    dataUrl: offscreen.toDataURL('image/png'),
    totalPages: pdf.numPages,
    width: viewport.width / dpr,
    height: viewport.height / dpr,
  }
}

// For export: renders at 1.5x scale, returns an ImageBitmap (no encoding overhead)
async function renderPageForExport(pdf, pageNum) {
  const page = await pdf.getPage(pageNum)
  const viewport = page.getViewport({ scale: 1.5 })
  const offscreen = document.createElement('canvas')
  offscreen.width = viewport.width
  offscreen.height = viewport.height
  await page.render({ canvasContext: offscreen.getContext('2d'), viewport }).promise
  return { canvas: offscreen, width: viewport.width, height: viewport.height }
}

export async function renderAllPdfPagesForExport(file) {
  const pdf = await getPdfDocument(file)
  return Promise.all(
    Array.from({ length: pdf.numPages }, (_, i) => renderPageForExport(pdf, i + 1))
  )
}
