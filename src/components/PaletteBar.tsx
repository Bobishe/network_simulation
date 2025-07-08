import PaletteButton from './PaletteButton'
import {
  CubeIcon,
  CubeTransparentIcon,
  HomeModernIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/solid'

const items = [
  { type: 'leo', icon: CubeIcon, label: 'LEO' },
  { type: 'meo', icon: CubeTransparentIcon, label: 'MEO' },
  { type: 'geo', icon: CubeIcon, label: 'GEO', ring: true },
  { type: 'gnd', icon: HomeModernIcon, label: 'GND' },
  { type: 'link', icon: ArrowRightIcon, label: 'LINK' },
]

export default function PaletteBar() {
  return (
    <div className="sticky top-0 z-10 bg-white flex items-center px-4 h-14">
      <div className="font-bold mr-auto">SAT-NET</div>
      {items.map(item => (
        <PaletteButton
          key={item.type}
          icon={item.icon}
          label={item.label}
          type={item.type}
          ring={'ring' in item ? item.ring : undefined}
        />
      ))}
    </div>
  )
}
