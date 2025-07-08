import { Formik, Form, Field } from 'formik'
import * as Yup from 'yup'
import { useAppDispatch, useAppSelector } from '../hooks'
import { updateNode, select } from '../features/network/networkSlice'
import toast from 'react-hot-toast'

export default function PropertiesPanel() {
  const dispatch = useAppDispatch()
  const { nodes, selectedId } = useAppSelector(state => state.network)
  const node = nodes.find(n => n.id === selectedId)

  if (!node) return null

  return (
    <div className="bg-white border-l px-4 py-6 overflow-y-auto" data-testid="properties-panel">
      <div className="font-semibold mb-4">
        {node.type} • {node.id}
      </div>
      <Formik
        initialValues={{ label: node.data?.label || '' }}
        validationSchema={Yup.object({ label: Yup.string().required() })}
        onSubmit={values => {
          dispatch(updateNode({ ...node, data: { ...node.data, label: values.label } }))
          dispatch(select(null))
          toast.success('Свойства сохранены')
        }}
      >
        {() => (
          <Form className="flex flex-col gap-2">
            <label className="text-sm">Label</label>
            <Field name="label" className="border rounded p-1" />
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
