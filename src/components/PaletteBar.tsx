import PaletteButton from './PaletteButton'
import {
  RocketLaunchIcon as SatelliteIcon,
  HomeModernIcon,
  ArrowRightIcon,
  MinusCircleIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/solid'

export default function PaletteBar() {
  return (
    <div className="fixed top-0 right-3 flex gap-2">
      <PaletteButton icon={SatelliteIcon} type="LEO" />
      <PaletteButton icon={MinusCircleIcon} type="MEO" />
      <PaletteButton icon={PlusCircleIcon} type="GEO" />
      <PaletteButton icon={HomeModernIcon} type="GND" />
      <PaletteButton icon={ArrowRightIcon} type="LINK" />
    </div>
  )
}
