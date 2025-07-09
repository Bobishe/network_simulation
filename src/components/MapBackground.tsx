import {
  ComposableMap,
  ZoomableGroup,
  Geographies,
  Geography,
  Marker,
} from 'react-simple-maps'
import { useWindowSize } from '@/hooks/useWindowSize'

const geoUrl = '/russia-topo.json'

export const MapBackground = () => {
  const { width, height } = useWindowSize()

  return (
    <ComposableMap
      width={width - 320}
      height={height - 56}
      projection="geoMercator"
    >
      <ZoomableGroup
        center={[95, 65]}
        translateExtent={[[-180, -90], [180, 90]]}
        zoom={1}
        scale={400}
        minZoom={1}
        maxZoom={8}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map(geo => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="none"
                stroke="#000"
                strokeWidth={1}
              />
            ))
          }
        </Geographies>
        <Marker coordinates={[37.6173, 55.7558]}>
          <circle r={3} fill="#dc2626" />
          <text y={-10} textAnchor="middle" className="text-xs fill-red-600">
            Москва
          </text>
        </Marker>
      </ZoomableGroup>
    </ComposableMap>
  )
}
