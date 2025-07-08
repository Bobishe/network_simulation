import { useState } from 'react'
import { Squares2X2Icon, GlobeAltIcon, CubeIcon, LinkIcon } from '@heroicons/react/24/outline'
import classNames from 'classnames'

const items = [
  { id: 'sat-leo', icon: GlobeAltIcon, label: 'Satellite (LEO)' },
  { id: 'sat-meo', icon: CubeIcon, label: 'Satellite (MEO)' },
  { id: 'sat-geo', icon: Squares2X2Icon, label: 'Satellite (GEO)' },
  { id: 'ground', icon: GlobeAltIcon, label: 'Ground Station' },
  { id: 'link', icon: LinkIcon, label: 'Link' },
]

interface PaletteBarProps {
  onSelect: (type: string) => void
}

export default function PaletteBar({ onSelect }: PaletteBarProps) {
  const [active, setActive] = useState<string | null>(null)

  return (
    <div className="h-14 flex items-center justify-between px-4 bg-gray-800 text-white">
      <div className="font-bold">SAT-NET</div>
      <div className="flex gap-2">
        {items.map(({ id, icon: Icon }) => (
          <button
            key={id}
            className={classNames('w-10 h-10 flex items-center justify-center rounded border', {
              'bg-blue-500': active === id,
              'bg-gray-700': active !== id,
            })}
            onClick={() => {
              setActive(id)
              onSelect(id)
            }}
          >
            <Icon className="w-5 h-5" />
          </button>
        ))}
      </div>
    </div>
  )
}
