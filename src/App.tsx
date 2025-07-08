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
        style={{ gridTemplateRows: '56px 1fr', gridTemplateColumns: '1fr 320px' }}
      >
        <div className="col-span-2 row-start-1 row-end-2">
          <PaletteBar />
        </div>
        <div className="row-start-2 col-start-1 col-end-2 flex">
          <Canvas />
        </div>
        <div
          className="row-start-2 col-start-2 col-end-3"
          style={{ display: selectedId ? 'block' : 'none' }}
        >
          <PropertiesPanel />
        </div>
        <Toaster position="top-right" />
      </div>
  )
}
