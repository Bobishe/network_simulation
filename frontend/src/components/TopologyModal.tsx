import { useEffect, useState } from 'react'
import { useAppDispatch } from '../hooks'
import { setTopology } from '../features/network/networkSlice'
import type { Node, Edge } from 'reactflow'

interface Topology {
  id: number
  name: string
  data: { nodes: Node[]; edges: Edge[] }
  updated_at: string
}

interface Props {
  onClose: () => void
}

export default function TopologyModal({ onClose }: Props) {
  const dispatch = useAppDispatch()
  const [topologies, setTopologies] = useState<Topology[]>([])
  const [name, setName] = useState('')

  useEffect(() => {
    fetch('/api/topologies')
      .then(res => res.json())
      .then(data => setTopologies(data))
      .catch(() => setTopologies([]))
  }, [])

  const handleSelect = (topology: Topology) => {
    dispatch(
      setTopology({ id: topology.id, nodes: topology.data.nodes, edges: topology.data.edges })
    )
    onClose()
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    const res = await fetch('/api/topologies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, data: { nodes: [], edges: [] } }),
    })
    if (res.ok) {
      const topology: Topology = await res.json()
      dispatch(
        setTopology({ id: topology.id, nodes: topology.data.nodes, edges: topology.data.edges })
      )
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
      <div className="bg-white p-4 rounded w-96 max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Выберите топологию</h2>
        <ul className="mb-4 space-y-2">
          {topologies.map(t => (
            <li key={t.id} className="flex justify-between items-center">
              <button
                className="text-left text-blue-600 hover:underline flex-1"
                onClick={() => handleSelect(t)}
              >
                {t.name}
              </button>
              <span className="text-sm text-gray-500 ml-2">
                {new Date(t.updated_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Название новой топологии"
            className="border rounded px-2 py-1 flex-1"
          />
          <button
            onClick={handleCreate}
            className="bg-blue-500 text-white px-3 py-1 rounded"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  )
}

