import { useState } from 'react'
import FileUpload from './components/FileUpload'
import CanvasEditor from './components/CanvasEditor'
import './App.css'

export default function App() {
  const [file, setFile] = useState(null)

  return (
    <div className="app">
      {file ? (
        <CanvasEditor file={file} onClose={() => setFile(null)} />
      ) : (
        <FileUpload onFile={setFile} />
      )}
    </div>
  )
}
