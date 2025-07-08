import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import { useViewport } from 'reactflow'
import russia from '../assets/RUS.geo.json'

const cities = [
  { name: 'Москва', coords: [37.6173, 55.7558] },
  { name: 'Санкт-Петербург', coords: [30.3141, 59.9386] },
  { name: 'Новосибирск', coords: [82.9204, 55.0084] },
  { name: 'Екатеринбург', coords: [60.6125, 56.8389] },
  { name: 'Казань', coords: [49.1064, 55.796] },
]

export default function MapBackground() {
  const { x, y, zoom } = useViewport()

  return (
    <div
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        transform: `translate(${x}px, ${y}px) scale(${zoom})`,
        transformOrigin: '0 0',
      }}
    >
      <ComposableMap
        width={1000}
        height={700}
        projection="geoMercator"
        projectionConfig={{ scale: 420, center: [105, 60] }}
        style={{ width: '100%', height: '100%' }}
      >
        <Geographies geography={russia as any}>
          {({ geographies }) =>
            geographies.map(geo => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                style={{ default: { fill: 'none', stroke: '#000', strokeWidth: 1 } }}
              />
            ))
          }
        </Geographies>
        {cities.map(c => (
          <Marker key={c.name} coordinates={c.coords as any}>
            <circle r={5} fill="#dc2626" stroke="#fff" strokeWidth={1} />
            <text
              textAnchor="middle"
              y={-8}
              style={{ fontSize: 12, fill: '#dc2626' }}
            >
              {c.name}
            </text>
          </Marker>
        ))}
      </ComposableMap>
    </div>
  )
}
