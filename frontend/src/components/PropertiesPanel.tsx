import { Formik, Form, Field, useFormikContext } from 'formik'
import { useEffect } from 'react'
import type { Node } from 'reactflow'
import * as Yup from 'yup'
import { useAppDispatch, useAppSelector } from '../hooks'
import {
  updateNode,
  updateEdge,
  select,
  setElements,
} from '../features/network/networkSlice'
import { latLonToPos, updateEdgesDistances } from '../utils/geo'
import { ALTITUDE_RANGES } from '../utils/altitudes'
import {
  parseInterfaceSelectionId,
  directionLabels,
  NodeInterface,
  updateConnectedLabels,
} from '../utils/interfaces'
import toast from 'react-hot-toast'

const typeNames: Record<string, string> = {
  leo: 'Низкая орбита',
  meo: 'Средняя орбита',
  geo: 'Геостационарная орбита',
  gnd: 'Наземная станция',
  haps: 'Высотная платформа',
}

function NodePositionUpdater({ node }: { node: Node }) {
  const { values } = useFormikContext<any>()
  const dispatch = useAppDispatch()
  const { nodes, edges } = useAppSelector(state => state.network)

  useEffect(() => {
    if (!node) return
    const lat = Number(values.lat)
    const lon = Number(values.lon)
    if (
      isNaN(lat) ||
      isNaN(lon) ||
      (node.data?.lat === lat && node.data?.lon === lon)
    )
      return
    const position = latLonToPos(lat, lon)
    const updatedNodes = nodes.map(n =>
      n.id === node.id
        ? {
            ...node,
            position,
            data: { ...node.data, ...values, lat, lon },
          }
        : n
    )
    const updatedEdges = updateEdgesDistances(updatedNodes, edges)
    dispatch(setElements({ nodes: updatedNodes, edges: updatedEdges }))
  }, [values.lat, values.lon])

  return null
}

export default function PropertiesPanel() {
  const dispatch = useAppDispatch()
  const { nodes, edges, selectedId } = useAppSelector(state => state.network)
  const interfaceSelection = parseInterfaceSelectionId(selectedId)

  useEffect(() => {
    if (!interfaceSelection) return
    const interfaceNode = nodes.find(n => n.id === interfaceSelection.nodeId)
    if (
      !interfaceNode ||
      !interfaceNode.data ||
      !Array.isArray(interfaceNode.data.interfaces)
    ) {
      dispatch(select(null))
      return
    }
    const exists = (interfaceNode.data.interfaces as NodeInterface[]).some(
      iface => iface.id === interfaceSelection.interfaceId
    )
    if (!exists) {
      dispatch(select(null))
    }
  }, [dispatch, interfaceSelection, nodes])

  if (interfaceSelection) {
    const interfaceNode = nodes.find(n => n.id === interfaceSelection.nodeId)
    if (!interfaceNode || !interfaceNode.data) return null
    if (!Array.isArray(interfaceNode.data.interfaces)) return null

    const interfaces = interfaceNode.data.interfaces as NodeInterface[]
    const iface = interfaces.find(i => i.id === interfaceSelection.interfaceId)
    if (!iface) return null

    const nodeTitle = interfaceNode.data.label
      ? String(interfaceNode.data.label)
      : interfaceNode.id
    const initialValues = {
      name: iface.name || '',
      description: iface.description || '',
    }

    return (
      <div className="bg-white border-l px-4 py-6 overflow-y-auto" data-testid="properties-panel">
        <div className="font-semibold mb-4">ИНТЕРФЕЙС • {nodeTitle}</div>
        <div className="text-sm text-gray-600 space-y-1 mb-4">
          <div>Направление: {directionLabels[iface.direction]}</div>
          <div>Подключено к: {iface.connectedNodeLabel}</div>
          <div>ID канала: {iface.edgeId}</div>
        </div>
        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={Yup.object({
            name: Yup.string().required(),
            description: Yup.string(),
          })}
          onSubmit={values => {
            const updatedNodes = nodes.map(n => {
              if (n.id !== interfaceNode.id) return n
              if (!n.data || !Array.isArray(n.data.interfaces)) return n
              const updatedInterfaces = (n.data.interfaces as NodeInterface[]).map(
                item =>
                  item.id === iface.id
                    ? { ...item, name: values.name, description: values.description }
                    : item
              )
              return {
                ...n,
                data: { ...(n.data ?? {}), interfaces: updatedInterfaces },
              }
            })
            dispatch(setElements({ nodes: updatedNodes, edges }))
            dispatch(select(null))
            toast.success('Свойства сохранены')
          }}
        >
          {() => (
            <Form className="flex flex-col gap-2">
              <label className="text-sm">Название</label>
              <Field name="name" className="border rounded p-1" />
              <label className="text-sm">Описание</label>
              <Field
                as="textarea"
                name="description"
                className="border rounded p-1 resize-y min-h-[80px]"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button type="submit" className="px-3 py-1 bg-blue-500 text-white rounded">
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => dispatch(select(null))}
                  className="px-3 py-1 border rounded"
                >
                  Закрыть
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    )
  }

  const node = nodes.find(n => n.id === selectedId)
  const edge = edges.find(e => e.id === selectedId)

  if (!node && !edge) return null

  if (node) {
    const isSatellite = ['leo', 'meo', 'geo', 'haps'].includes(node.type || '')
    const isGround = node.type === 'gnd'
    const initialValues: any = {
      label: node.data?.label || '',
      lat: node.data?.lat ?? 0,
      lon: node.data?.lon ?? 0,
    }
    if (isSatellite)
      initialValues.altitude =
        node.data?.altitude ?? ALTITUDE_RANGES[node.type || '']?.min ?? ''
    if (isGround) initialValues.location = node.data?.location || ''

    const schemaShape: any = {
      label: Yup.string().required(),
      lat: Yup.number().min(0).max(180).required(),
      lon: Yup.number().min(0).max(360).required(),
    }
    if (isSatellite) {
      const range = ALTITUDE_RANGES[node.type || '']
      if (range) {
        schemaShape.altitude = Yup.number()
          .min(range.min)
          .max(range.max)
          .required()
      } else {
        schemaShape.altitude = Yup.number().required()
      }
    }
    if (isGround) schemaShape.location = Yup.string().required()

    return (
      <div className="bg-white border-l px-4 py-6 overflow-y-auto" data-testid="properties-panel">
        <div className="font-semibold mb-4">
          {typeNames[node.type || '']} • {node.id}
        </div>
        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={Yup.object(schemaShape)}
          onSubmit={values => {
            const position = latLonToPos(
              Number(values.lat),
              Number(values.lon)
            )
            const updatedNodes = nodes.map(n =>
              n.id === node.id
                ? {
                    ...node,
                    position,
                    data: {
                      ...node.data,
                      ...values,
                      lat: Number(values.lat),
                      lon: Number(values.lon),
                    },
                  }
                : n
            )
            const nodesWithLabels = updateConnectedLabels(
              updatedNodes,
              node.id,
              values.label
            )
            const updatedEdges = updateEdgesDistances(nodesWithLabels, edges)
            dispatch(setElements({ nodes: nodesWithLabels, edges: updatedEdges }))
            dispatch(select(null))
            toast.success('Свойства сохранены')
          }}
        >
          {() => (
            <Form className="flex flex-col gap-2">
              <NodePositionUpdater node={node} />
              <label className="text-sm">Метка</label>
              <Field name="label" className="border rounded p-1" />
              <label className="text-sm">Широта</label>
              <Field name="lat" type="number" className="border rounded p-1" />
              <label className="text-sm">Долгота</label>
              <Field name="lon" type="number" className="border rounded p-1" />
              {isSatellite && (
                <>
                  <label className="text-sm">Высота</label>
                  <Field name="altitude" type="number" className="border rounded p-1" />
                </>
              )}
              {isGround && (
                <>
                  <label className="text-sm">Местоположение</label>
                  <Field name="location" className="border rounded p-1" />
                </>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <button type="submit" className="px-3 py-1 bg-blue-500 text-white rounded">Сохранить</button>
                <button type="button" onClick={() => dispatch(select(null))} className="px-3 py-1 border rounded">Закрыть</button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    )
  }

  if (edge) {
    const initialValues = {
      label: (edge as any).label || '',
      bandwidth: edge.data?.bandwidth || '',
      latency: edge.data?.latency || '',
    }
    return (
      <div className="bg-white border-l px-4 py-6 overflow-y-auto" data-testid="properties-panel">
        <div className="font-semibold mb-4">СВЯЗЬ • {edge.id}</div>
        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={Yup.object({
            bandwidth: Yup.number().required(),
            latency: Yup.number().required(),
            label: Yup.string(),
          })}
          onSubmit={values => {
            dispatch(
              updateEdge({
                ...edge,
                label: values.label,
                data: { ...edge.data, bandwidth: values.bandwidth, latency: values.latency },
              })
            )
            dispatch(select(null))
            toast.success('Свойства сохранены')
          }}
        >
          {() => (
            <Form className="flex flex-col gap-2">
              <label className="text-sm">Метка</label>
              <Field name="label" className="border rounded p-1" />
              <label className="text-sm">Пропускная способность (Мбит/с)</label>
              <Field name="bandwidth" type="number" className="border rounded p-1" />
              <label className="text-sm">Задержка (мс)</label>
              <Field name="latency" type="number" className="border rounded p-1" />
              <div className="flex justify-end gap-2 mt-4">
                <button type="submit" className="px-3 py-1 bg-blue-500 text-white rounded">Сохранить</button>
                <button type="button" onClick={() => dispatch(select(null))} className="px-3 py-1 border rounded">Закрыть</button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    )
  }

  return null
}
