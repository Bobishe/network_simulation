import PaletteBar from './components/PaletteBar'
import TopBar from './components/TopBar'
import Canvas from './components/Canvas'
import PropertiesPanel from './components/PropertiesPanel'
import { useAppSelector } from './hooks'
import { Toaster } from 'react-hot-toast'

export default function App() {
  const selectedId = useAppSelector(state => state.network.selectedId)

  return (
    <>
      <TopBar />
      <div
        className="h-full pt-12 grid"
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
    </>
  )
}
