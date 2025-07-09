import { Formik, Form, Field } from 'formik'
import * as Yup from 'yup'
import { useAppDispatch, useAppSelector } from '../hooks'
import {
  updateNode,
  updateEdge,
  select,
  setElements,
} from '../features/network/networkSlice'
import { latLonToPos, updateEdgesDistances } from '../utils/geo'
import toast from 'react-hot-toast'

export default function PropertiesPanel() {
  const dispatch = useAppDispatch()
  const { nodes, edges, selectedId } = useAppSelector(state => state.network)

  const node = nodes.find(n => n.id === selectedId)
  const edge = edges.find(e => e.id === selectedId)

  if (!node && !edge) return null

  if (node) {
    const isSatellite = ['leo', 'meo', 'geo'].includes(node.type || '')
    const isGround = node.type === 'gnd'
    const initialValues: any = {
      label: node.data?.label || '',
      lat: node.data?.lat ?? 0,
      lon: node.data?.lon ?? 0,
    }
    if (isSatellite) initialValues.altitude = node.data?.altitude || ''
    if (isGround) initialValues.location = node.data?.location || ''

    const schemaShape: any = {
      label: Yup.string().required(),
      lat: Yup.number().min(0).max(180).required(),
      lon: Yup.number().min(0).max(360).required(),
    }
    if (isSatellite) schemaShape.altitude = Yup.number().required()
    if (isGround) schemaShape.location = Yup.string().required()

    return (
      <div className="bg-white border-l px-4 py-6 overflow-y-auto" data-testid="properties-panel">
        <div className="font-semibold mb-4">
          {node.type} • {node.id}
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
            const updatedEdges = updateEdgesDistances(updatedNodes, edges)
            dispatch(setElements({ nodes: updatedNodes, edges: updatedEdges }))
            dispatch(select(null))
            toast.success('Свойства сохранены')
          }}
        >
          {() => (
            <Form className="flex flex-col gap-2">
              <label className="text-sm">Label</label>
              <Field name="label" className="border rounded p-1" />
              <label className="text-sm">Latitude</label>
              <Field name="lat" type="number" className="border rounded p-1" />
              <label className="text-sm">Longitude</label>
              <Field name="lon" type="number" className="border rounded p-1" />
              {isSatellite && (
                <>
                  <label className="text-sm">Altitude</label>
                  <Field name="altitude" type="number" className="border rounded p-1" />
                </>
              )}
              {isGround && (
                <>
                  <label className="text-sm">Location</label>
                  <Field name="location" className="border rounded p-1" />
                </>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <button type="submit" className="px-3 py-1 bg-blue-500 text-white rounded">Save</button>
                <button type="button" onClick={() => dispatch(select(null))} className="px-3 py-1 border rounded">Close</button>
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
        <div className="font-semibold mb-4">LINK • {edge.id}</div>
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
              <label className="text-sm">Label</label>
              <Field name="label" className="border rounded p-1" />
              <label className="text-sm">Bandwidth (Mbps)</label>
              <Field name="bandwidth" type="number" className="border rounded p-1" />
              <label className="text-sm">Latency (ms)</label>
              <Field name="latency" type="number" className="border rounded p-1" />
              <div className="flex justify-end gap-2 mt-4">
                <button type="submit" className="px-3 py-1 bg-blue-500 text-white rounded">Save</button>
                <button type="button" onClick={() => dispatch(select(null))} className="px-3 py-1 border rounded">Close</button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    )
  }

  return null
}
