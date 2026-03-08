import { useRef, useState } from 'react'

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']

export default function FileUpload({ onFile }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)

  function handleFile(file) {
    if (!file) return
    if (!ACCEPTED.includes(file.type)) {
      setError('Unsupported file type. Please use PNG, JPG, WebP, GIF, or PDF.')
      return
    }
    setError(null)
    onFile(file)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  function onDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave(e) {
    // Only clear if leaving the window entirely
    if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false)
  }

  function onInputChange(e) {
    handleFile(e.target.files[0])
    e.target.value = ''
  }

  return (
    <div
      className={`upload-screen ${dragging ? 'dragging' : ''}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {/* Full-screen drag overlay */}
      {dragging && <div className="drag-overlay" />}

      <div className="upload-center">
        <div className="upload-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M24 32V16M16 24l8-8 8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 34c0 2.2 1.8 4 4 4h20c2.2 0 4-1.8 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>

        <h1 className="upload-title">Drop a file to annotate</h1>
        <p className="upload-sub">or{' '}
          <button className="upload-browse" onClick={() => inputRef.current.click()}>
            browse your files
          </button>
        </p>

        <div className="upload-types">
          {['PNG', 'JPG', 'WebP', 'GIF', 'PDF'].map((t, i) => (
            <span key={t}>
              {i > 0 && <span className="upload-dot">·</span>}
              {t}
            </span>
          ))}
        </div>

        {error && <p className="upload-error">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        style={{ display: 'none' }}
        onChange={onInputChange}
      />

      <style>{`
        .upload-screen {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1a1a1a;
          position: relative;
          overflow: hidden;
        }

        /* Subtle grid pattern */
        .upload-screen::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        .drag-overlay {
          position: absolute;
          inset: 0;
          border: 2.5px dashed #007aff;
          border-radius: 0;
          background: rgba(0, 122, 255, 0.06);
          pointer-events: none;
          z-index: 10;
          animation: overlayIn 0.12s ease;
        }

        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .upload-center {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          text-align: center;
          transition: transform 0.15s ease;
        }

        .dragging .upload-center {
          transform: scale(1.04);
        }

        .upload-icon {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          background: #2b2b2b;
          border: 1px solid #3a3a3a;
          color: #888;
          margin-bottom: 8px;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }

        .dragging .upload-icon {
          background: #0a2a4a;
          border-color: #007aff;
          color: #007aff;
        }

        .upload-title {
          font-size: 22px;
          font-weight: 600;
          color: #e0e0e0;
          letter-spacing: -0.3px;
          margin: 0;
          transition: color 0.15s;
        }

        .dragging .upload-title {
          color: #fff;
        }

        .upload-sub {
          font-size: 14px;
          color: #666;
          margin: 0;
        }

        .upload-browse {
          color: #007aff;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          padding: 0;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .upload-browse:hover { color: #3395ff; }

        .upload-types {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
          font-size: 11px;
          color: #444;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .upload-dot { color: #333; }

        .upload-error {
          margin-top: 6px;
          font-size: 13px;
          color: #ff6b6b;
        }
      `}</style>
    </div>
  )
}
