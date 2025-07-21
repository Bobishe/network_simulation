import { NodeProps } from 'reactflow'

export default function ClusterNode({ data }: NodeProps) {
  return (
    <div
      onClick={data.onExpand}
      className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer border border-gray-400 select-none text-sm"
    >
      {data.size}
    </div>
  )
}
