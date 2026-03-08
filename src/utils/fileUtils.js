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

export async function renderPdfPage(file, pageNum) {
  const lib = await getPdfjs()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await lib.getDocument({ data: arrayBuffer }).promise
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
