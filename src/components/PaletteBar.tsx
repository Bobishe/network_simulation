import { CubeIcon, HomeModernIcon, ArrowRightIcon } from '@heroicons/react/24/solid'
import { PaletteButton } from './PaletteButton'

export const PaletteBar = () => (
  <div className="fixed top-2 right-4 flex gap-2 z-50">
    <PaletteButton icon={CubeIcon}        data-type="LEO"  />
    <PaletteButton icon={CubeIcon}        data-type="MEO"  />
    <PaletteButton icon={CubeIcon}        data-type="GEO"  />
    <PaletteButton icon={HomeModernIcon}  data-type="GND"  />
    <PaletteButton icon={ArrowRightIcon}  data-type="LINK" />
  </div>
)
