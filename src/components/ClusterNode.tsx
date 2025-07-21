import { NodeProps } from 'reactflow'

export default function ClusterNode({ data }: NodeProps<{ count: number }>) {
  return (
    <div className="bg-white border rounded-full w-6 h-6 flex items-center justify-center cursor-pointer text-xs">
      {data.count}
    </div>
  )
}
