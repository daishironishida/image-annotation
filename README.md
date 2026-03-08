# Image & PDF Annotation Tool

A lightweight browser-based annotation tool for images and PDFs. Draw shapes, add text, adjust styles, and export your annotated file as a PNG.

## Features

- **File support** — Open JPEG, PNG, WebP, GIF images and multi-page PDFs
- **Drawing tools** — Rectangle, ellipse, and line shapes
- **Text** — Add resizable text labels anywhere on the canvas
- **Style controls** — Stroke color, stroke width, fill color and toggle
- **Select & edit** — Click any shape to select it and modify its style
- **Undo / Redo** — Full history with Cmd+Z / Cmd+Shift+Z
- **Delete** — Remove selected shapes with Backspace or Delete
- **Export** — Download the annotated image as a PNG

## Tech Stack

- [React 19](https://react.dev)
- [Fabric.js 7](https://fabricjs.com) — canvas rendering and interaction
- [PDF.js](https://mozilla.github.io/pdf.js/) — PDF page rendering
- [Vite](https://vitejs.dev) — dev server and bundler

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
npm run build
```

Output is written to `dist/`.
