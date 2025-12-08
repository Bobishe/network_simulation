import PaletteBar from './components/PaletteBar'
import TopBar from './components/TopBar'
import Canvas from './components/Canvas'
import PropertiesPanel from './components/PropertiesPanel'
import StatusBar from './components/StatusBar'
import { useAppSelector } from './hooks'
import { useState } from 'react'
import TopologyModal from './components/TopologyModal'

export default function App() {
  const { selectedId, nodes, edges } = useAppSelector(state => state.network)
  const [showModal, setShowModal] = useState(nodes.length === 0 && edges.length === 0)

  return (
    <>
      <TopBar />
      <div
        className="h-full pt-12 pb-10 grid"
        style={{ gridTemplateColumns: selectedId ? '80px 1fr 416px' : '80px 1fr' }}
      >
        <PaletteBar />
        <div className="flex">
          <Canvas />
        </div>
        <div
          style={{ display: selectedId ? 'block' : 'none' }}
          className="h-full min-h-0 overflow-y-auto"
        >
          <PropertiesPanel />
        </div>
      </div>
      <StatusBar />
      {showModal && <TopologyModal onClose={() => setShowModal(false)} />}
    </>
  )
}
