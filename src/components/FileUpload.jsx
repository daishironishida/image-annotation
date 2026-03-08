import { useRef, useState } from 'react'

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']

export default function FileUpload({ onFile }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)

  function handleFile(file) {
    if (!file) return
    if (!ACCEPTED.includes(file.type)) {
      setError('Unsupported file type. Please upload a PNG, JPG, WebP, GIF, or PDF.')
      return
    }
    setError(null)
    onFile(file)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  function onDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave() {
    setDragging(false)
  }

  function onInputChange(e) {
    handleFile(e.target.files[0])
    e.target.value = ''
  }

  return (
    <div className="upload-screen">
      <div
        className={`drop-zone ${dragging ? 'dragging' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current.click()}
      >
        <div className="drop-icon">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <rect x="8" y="10" width="40" height="36" rx="4" stroke="currentColor" strokeWidth="2.5" fill="none"/>
            <path d="M20 28l8-8 8 8M28 20v18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="drop-title">Drop a file here</p>
        <p className="drop-sub">or click to browse</p>
        <p className="drop-types">PNG · JPG · WebP · GIF · PDF</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          style={{ display: 'none' }}
          onChange={onInputChange}
        />
      </div>
      {error && <p className="upload-error">{error}</p>}

      <style>{`
        .upload-screen {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
          gap: 12px;
        }
        .drop-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 360px;
          height: 260px;
          border: 2px dashed #b0b0b0;
          border-radius: 16px;
          background: #fafafa;
          cursor: pointer;
          color: #666;
          transition: border-color 0.15s, background 0.15s, color 0.15s;
          user-select: none;
        }
        .drop-zone:hover, .drop-zone.dragging {
          border-color: #007aff;
          background: #f0f6ff;
          color: #007aff;
        }
        .drop-icon { opacity: 0.7; }
        .drop-title { font-size: 17px; font-weight: 600; color: #333; }
        .drop-sub { font-size: 13px; color: #888; }
        .drop-types { font-size: 11px; color: #aaa; margin-top: 4px; letter-spacing: 0.04em; }
        .upload-error { font-size: 13px; color: #cc3333; }
      `}</style>
    </div>
  )
}
