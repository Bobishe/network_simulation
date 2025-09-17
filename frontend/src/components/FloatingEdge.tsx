import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  Position,
  useReactFlow,
  type Node,
} from 'reactflow'

const getNodeCenter = (node: Node | null | undefined) => {
  if (!node) {
    return { x: 0, y: 0 }
  }
  const width = node.width ?? 0
  const height = node.height ?? 0
  const position = node.positionAbsolute ?? node.position
  return {
    x: position.x + width / 2,
    y: position.y + height / 2,
  }
}

const getNodeIntersection = (
  node: Node | null | undefined,
  point: { x: number; y: number }
) => {
  const width = node?.width ?? 0
  const height = node?.height ?? 0
  const position = node?.positionAbsolute ?? node?.position ?? { x: 0, y: 0 }

  const center = {
    x: position.x + width / 2,
    y: position.y + height / 2,
  }

  const dx = point.x - center.x
  const dy = point.y - center.y

  const halfWidth = width / 2
  const halfHeight = height / 2

  if (halfWidth === 0 || halfHeight === 0) {
    return center
  }

  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  if (absDx === 0 && absDy === 0) {
    return center
  }

  const scaleX = absDx === 0 ? Number.POSITIVE_INFINITY : halfWidth / absDx
  const scaleY = absDy === 0 ? Number.POSITIVE_INFINITY : halfHeight / absDy

  const scale = Math.min(scaleX, scaleY)

  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale,
  }
}

const getHandlePosition = (
  center: { x: number; y: number },
  point: { x: number; y: number }
): Position => {
  const dx = Math.abs(point.x - center.x)
  const dy = Math.abs(point.y - center.y)

  if (dx > dy) {
    return point.x < center.x ? Position.Left : Position.Right
  }

  return point.y < center.y ? Position.Top : Position.Bottom
}

const getPerpendicularOffset = (
  sourceCenter: { x: number; y: number },
  targetCenter: { x: number; y: number },
  offset: number
) => {
  if (!offset) {
    return { x: 0, y: 0 }
  }

  const dx = targetCenter.x - sourceCenter.x
  const dy = targetCenter.y - sourceCenter.y
  const length = Math.sqrt(dx * dx + dy * dy)

  if (!length) {
    return { x: 0, y: 0 }
  }

  const nx = (-dy / length) * offset
  const ny = (dx / length) * offset

  return { x: nx, y: ny }
}

const ARROW_OFFSET = 10

type FloatingEdgeData = {
  parallelOffset?: number
  [key: string]: unknown
}

export default function FloatingEdge({
  id,
  source,
  target,
  style,
  data,
  label,
}: EdgeProps<FloatingEdgeData>) {
  const { getNode } = useReactFlow()
  const sourceNode = getNode(source)
  const targetNode = getNode(target)

  if (!sourceNode || !targetNode) {
    return null
  }

  const sourceCenter = getNodeCenter(sourceNode)
  const targetCenter = getNodeCenter(targetNode)
  const offset = typeof data?.parallelOffset === 'number' ? data.parallelOffset : 0
  const offsetVector = getPerpendicularOffset(sourceCenter, targetCenter, offset)

  const sourceIntersection = getNodeIntersection(sourceNode, {
    x: targetCenter.x + offsetVector.x,
    y: targetCenter.y + offsetVector.y,
  })

  const targetIntersection = getNodeIntersection(targetNode, {
    x: sourceCenter.x + offsetVector.x,
    y: sourceCenter.y + offsetVector.y,
  })

  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = {
    sourceX: sourceIntersection.x,
    sourceY: sourceIntersection.y,
    targetX: targetIntersection.x,
    targetY: targetIntersection.y,
    sourcePosition: getHandlePosition(sourceCenter, sourceIntersection),
    targetPosition: getHandlePosition(targetCenter, targetIntersection),
  }

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const markerId = `floating-arrow-${id}`
  const markerUrl = `url(#${markerId})`
  const strokeColor =
    typeof style?.stroke === 'string' && style.stroke.trim() !== ''
      ? style.stroke
      : '#b1b1b7'
  const markerWidth = 25
  const markerHeight = 25

  return (
    <>
      <defs>
        <marker
          id={markerId}
          markerWidth={markerWidth + ARROW_OFFSET}
          markerHeight={markerHeight}
          viewBox={`0 0 ${markerWidth + ARROW_OFFSET} ${markerHeight}`}
          refX={markerWidth + ARROW_OFFSET}
          refY={markerHeight / 2}
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path
            d={`M 0 0 L ${markerWidth} ${markerHeight / 2} L 0 ${markerHeight} z`}
            fill={strokeColor}
          />
        </marker>
      </defs>
      <BaseEdge id={id} path={edgePath} markerEnd={markerUrl} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            className="nodrag nopan text-xs bg-white px-1 rounded border"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
