import PaletteBar from './components/PaletteBar'
import Canvas from './components/Canvas'
import PropertiesPanel from './components/PropertiesPanel'
import { useAppSelector } from './hooks'
import { Toaster } from 'react-hot-toast'

export default function App() {
  const selectedId = useAppSelector(state => state.network.selectedId)

  return (
    <div
      className="h-full grid"
      style={{ gridTemplateColumns: selectedId ? '80px 1fr 320px' : '80px 1fr' }}
    >
      <PaletteBar />
      <div className="flex">
        <Canvas />
      </div>
      <div style={{ display: selectedId ? 'block' : 'none' }}>
        <PropertiesPanel />
      </div>
      <Toaster position="top-right" />
    </div>
  )
}
