const TOOLS = [
  {
    id: 'select',
    label: 'Select',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 2l12 7-6.5 1.5L7 16 3 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
  },
  {
    id: 'rect',
    label: 'Rectangle',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2.5" y="4.5" width="13" height="9" rx="1" stroke="currentColor" strokeWidth="1.6"/>
      </svg>
    ),
  },
  {
    id: 'ellipse',
    label: 'Ellipse',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <ellipse cx="9" cy="9" rx="6.5" ry="5" stroke="currentColor" strokeWidth="1.6"/>
      </svg>
    ),
  },
  {
    id: 'line',
    label: 'Line',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <line x1="2" y1="16" x2="16" y2="2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'text',
    label: 'Text',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 4h12M9 4v10M6 14h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
]

import { useState, useEffect } from 'react'

export default function Toolbar({
  activeTool, onToolChange,
  strokeColor, onStrokeColorChange,
  fillColor, fillEnabled, onFillColorChange, onFillEnabledChange,
  strokeWidth, onStrokeWidthChange,
  fontSize, onFontSizeChange, isTextSelected,
  onUndo, onRedo, canUndo, canRedo,
  onDownload, onClose,
  pageNum, totalPages, onPageChange,
}) {
  const [fontSizeInput, setFontSizeInput] = useState(String(fontSize))

  // Sync input when the external fontSize changes (e.g. selecting a different object)
  useEffect(() => {
    setFontSizeInput(String(fontSize))
  }, [fontSize])

  function commitFontSize() {
    const val = parseInt(fontSizeInput, 10)
    if (!isNaN(val) && val >= 8) onFontSizeChange(val)
    else setFontSizeInput(String(fontSize)) // revert if invalid
  }

  return (
    <div className="toolbar">
      {/* Back */}
      <button className="tb-btn tb-back" onClick={onClose} title="Close">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="tb-sep" />

      {/* Tools */}
      <div className="tb-group">
        {TOOLS.map(tool => (
          <button
            key={tool.id}
            className={`tb-btn tb-tool ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => onToolChange(tool.id)}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div className="tb-sep" />

      {/* Colors & stroke */}
      {(
        <div className="tb-group">
          {/* Stroke color */}
          <label className="tb-color-wrap" title="Stroke color">
            <span className="tb-color-label">Stroke</span>
            <span className="tb-color-swatch" style={{ background: strokeColor }}>
              <input
                type="color"
                value={strokeColor}
                onChange={e => onStrokeColorChange(e.target.value)}
                className="tb-color-input"
              />
            </span>
          </label>

          {/* Fill color — not shown for line/text */}
          {activeTool !== 'line' && activeTool !== 'text' && (
            <label className="tb-color-wrap" title="Fill color">
              <span className="tb-color-label">Fill</span>
              <span className={`tb-color-swatch ${!fillEnabled ? 'no-fill' : ''}`} style={{ background: fillEnabled ? fillColor : 'transparent' }}>
                <input
                  type="color"
                  value={fillColor}
                  onChange={e => { onFillColorChange(e.target.value); onFillEnabledChange(true) }}
                  className="tb-color-input"
                />
              </span>
              <button
                className={`tb-fill-toggle ${!fillEnabled ? 'active' : ''}`}
                onClick={() => onFillEnabledChange(!fillEnabled)}
                title="Toggle fill"
              >
                {fillEnabled ? '✕' : '○'}
              </button>
            </label>
          )}

          {/* Stroke width — not shown for text */}
          {activeTool !== 'text' && !isTextSelected && (
            <label className="tb-slider-wrap" title="Stroke width">
              <span className="tb-color-label">Width</span>
              <input
                type="range"
                min="1"
                max="20"
                value={strokeWidth}
                onChange={e => onStrokeWidthChange(Number(e.target.value))}
                className="tb-slider"
              />
              <span className="tb-slider-val">{strokeWidth}</span>
            </label>
          )}

          {/* Font size — shown for text tool or selected text */}
          {(activeTool === 'text' || isTextSelected) && (
            <label className="tb-slider-wrap" title="Font size">
              <span className="tb-color-label">Size</span>
              <input
                type="number"
                min="8"
                max="200"
                value={fontSizeInput}
                onChange={e => setFontSizeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { commitFontSize(); e.target.blur() } }}
                onBlur={commitFontSize}
                className="tb-fontsize"
              />
            </label>
          )}
        </div>
      )}

      <div className="tb-spacer" />

      {/* PDF page navigation */}
      {totalPages > 1 && (
        <>
          <div className="tb-group tb-pages">
            <button
              className="tb-btn"
              onClick={() => onPageChange(p => Math.max(1, p - 1))}
              disabled={pageNum <= 1}
              title="Previous page"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="tb-page-info">{pageNum} / {totalPages}</span>
            <button
              className="tb-btn"
              onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
              disabled={pageNum >= totalPages}
              title="Next page"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className="tb-sep" />
        </>
      )}

      {/* Undo / Redo */}
      <div className="tb-group">
        <button className="tb-btn" onClick={onUndo} disabled={!canUndo} title="Undo (⌘Z)">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 7h8a4 4 0 010 8H7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M3 7l3-3M3 7l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className="tb-btn" onClick={onRedo} disabled={!canRedo} title="Redo (⌘⇧Z)">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M15 7H7a4 4 0 000 8h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M15 7l-3-3M15 7l-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="tb-sep" />

      {/* Download */}
      <button className="tb-btn tb-download" onClick={onDownload} title="Download as PNG">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 3v9M5 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 14h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        <span>Save</span>
      </button>

      <style>{`
        .toolbar {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 0 10px;
          height: 52px;
          background: #2b2b2b;
          border-bottom: 1px solid #1a1a1a;
          flex-shrink: 0;
          overflow-x: auto;
        }
        .toolbar::-webkit-scrollbar { display: none; }
        .tb-group {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .tb-sep {
          width: 1px;
          height: 24px;
          background: #444;
          margin: 0 6px;
          flex-shrink: 0;
        }
        .tb-spacer { flex: 1; }
        .tb-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 8px;
          border-radius: 6px;
          color: #ccc;
          background: transparent;
          transition: background 0.12s, color 0.12s;
          white-space: nowrap;
        }
        .tb-btn:hover:not(:disabled) { background: #3d3d3d; color: #fff; }
        .tb-btn:disabled { opacity: 0.3; cursor: default; }
        .tb-btn.active { background: #007aff; color: #fff; }
        .tb-back { color: #aaa; }
        .tb-download { color: #4cd964; font-weight: 500; }
        .tb-download:hover:not(:disabled) { background: #1e3d1e; color: #4cd964; }

        .tb-color-wrap {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 6px;
          cursor: pointer;
        }
        .tb-color-label { color: #999; font-size: 11px; }
        .tb-color-swatch {
          width: 22px;
          height: 22px;
          border-radius: 4px;
          border: 1.5px solid #555;
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }
        .tb-color-swatch.no-fill {
          background: repeating-linear-gradient(
            45deg, #555 0, #555 2px, transparent 2px, transparent 6px
          ) !important;
        }
        .tb-color-input {
          position: absolute;
          inset: -4px;
          opacity: 0;
          cursor: pointer;
          width: 130%;
          height: 130%;
        }
        .tb-fill-toggle {
          font-size: 11px;
          color: #888;
          padding: 2px 4px;
          border-radius: 4px;
          transition: background 0.1s;
        }
        .tb-fill-toggle:hover { background: #3d3d3d; color: #fff; }
        .tb-fill-toggle.active { color: #ff6b6b; }

        .tb-slider-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 6px;
        }
        .tb-slider {
          width: 80px;
          accent-color: #007aff;
          cursor: pointer;
        }
        .tb-slider-val { color: #aaa; font-size: 11px; min-width: 18px; }
        .tb-fontsize {
          width: 52px;
          background: #3a3a3a;
          border: 1px solid #555;
          border-radius: 4px;
          color: #eee;
          font-size: 13px;
          padding: 2px 6px;
          text-align: center;
        }
        .tb-fontsize:focus { outline: none; border-color: #007aff; }

        .tb-pages { gap: 4px; }
        .tb-page-info { color: #aaa; font-size: 12px; min-width: 48px; text-align: center; }
      `}</style>
    </div>
  )
}
