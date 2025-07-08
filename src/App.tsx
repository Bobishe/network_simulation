import { PaletteBar } from '@/components/PaletteBar'
import { Canvas }     from '@/components/Canvas'
import { PropertiesPanel } from '@/components/PropertiesPanel'

export default function App() {
  return (
    <div className="grid grid-rows-[56px_1fr] grid-cols-[1fr_320px] h-screen">
      {/* top bar + palette */}
      <div className="row-start-1 col-span-2 flex items-center px-4">
        <span className="font-semibold">SAT-NET</span>
        <PaletteBar />
      </div>

      {/* canvas */}
      <Canvas className="row-start-2 col-start-1" />

      {/* right props panel */}
      <PropertiesPanel className="row-start-2 col-start-2 border-l overflow-y-auto" />
    </div>
  )
}
