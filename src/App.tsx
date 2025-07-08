import { useState } from 'react'
import PaletteBar from './components/PaletteBar'
import Canvas from './components/Canvas'
import PropertiesPanel from './components/PropertiesPanel'

export default function App() {
  const [mode, setMode] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-full">
      <PaletteBar onSelect={setMode} />
      <div className="flex flex-1">
        <Canvas />
        <PropertiesPanel />
      </div>
    </div>
  )
}
