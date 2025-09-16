import { Formik, Form, Field, useFormikContext } from 'formik'
import { useEffect } from 'react'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
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
  InterfaceResourceType,
  InterfaceSpeedMode,
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

type InterfaceFormValues = {
  name: string
  description: string
  idx: number
  queueCapacity: number
  speedMode: InterfaceSpeedMode
  serviceRate: number
  serviceTime: number
  resourceType: InterfaceResourceType
  resourceAmount: number
  portLabel: string
  autoCleanup: boolean
}

function LabelWithTooltip({
  htmlFor,
  text,
  tooltip,
}: {
  htmlFor?: string
  text: string
  tooltip: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-medium text-gray-700 flex items-center gap-1"
    >
      {text}
      <QuestionMarkCircleIcon
        className="w-4 h-4 text-gray-400"
        title={tooltip}
        aria-hidden="true"
      />
    </label>
  )
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
    const directionInterfaces = interfaces.filter(
      i => i.direction === iface.direction
    )
    const fallbackIdx =
      directionInterfaces.findIndex(i => i.id === iface.id) + 1 || 1
    const safeIdx =
      typeof iface.idx === 'number' && !Number.isNaN(iface.idx)
        ? iface.idx
        : fallbackIdx
    const safeQueueCapacity =
      typeof iface.queueCapacity === 'number' && iface.queueCapacity >= 0
        ? Math.floor(iface.queueCapacity)
        : 0
    const rawServiceRate =
      typeof iface.serviceRate === 'number' && iface.serviceRate > 0
        ? iface.serviceRate
        : NaN
    const rawServiceTime =
      typeof iface.serviceTime === 'number' && iface.serviceTime > 0
        ? iface.serviceTime
        : NaN
    const inferredServiceRate = !Number.isNaN(rawServiceRate)
      ? rawServiceRate
      : !Number.isNaN(rawServiceTime)
      ? 1 / rawServiceTime
      : 1
    const inferredServiceTime =
      !Number.isNaN(rawServiceTime) && rawServiceTime > 0
        ? rawServiceTime
        : inferredServiceRate > 0
        ? 1 / inferredServiceRate
        : 1
    const initialSpeedMode: InterfaceSpeedMode =
      iface.speedMode ?? (!Number.isNaN(rawServiceTime) ? 'time' : 'rate')
    const resourceType: InterfaceResourceType =
      iface.resourceType === 'STORAGE' ? 'STORAGE' : 'FACILITY'
    const resourceAmount =
      resourceType === 'STORAGE'
        ? Math.max(
            1,
            Math.floor(
              typeof iface.resourceAmount === 'number' && iface.resourceAmount > 0
                ? iface.resourceAmount
                : 1
            )
          )
        : 1

    const initialValues: InterfaceFormValues = {
      name: iface.name || '',
      description: iface.description || '',
      idx: safeIdx,
      queueCapacity: safeQueueCapacity,
      speedMode: initialSpeedMode,
      serviceRate: inferredServiceRate,
      serviceTime: inferredServiceTime,
      resourceType,
      resourceAmount,
      portLabel: iface.label ?? '',
      autoCleanup: Boolean(iface.autoCleanup),
    }

    const isIncoming = iface.direction === 'in'
    const idxLabel = isIncoming ? 'Индекс входа (idx)' : 'Индекс выхода (idx)'
    const idxTooltip = isIncoming
      ? 'Номер входящего порта узла. Присваивается автоматически и недоступен для редактирования.'
      : 'Номер исходящего порта узла. Присваивается автоматически и недоступен для редактирования.'
    const queueLabel = isIncoming
      ? 'Ёмкость очереди (q_in)'
      : 'Ёмкость очереди (q_out)'
    const queueTooltip = isIncoming
      ? 'Максимальное количество заявок, ожидающих обслуживания перед входом.'
      : 'Максимальное количество заявок, ожидающих передачи на выходе.'
    const rateLabel = isIncoming
      ? 'Интенсивность обслуживания (μ_in)'
      : 'Интенсивность передачи (μ_out)'
    const rateTooltip = isIncoming
      ? 'Количество входящих заявок, обрабатываемых в секунду. Используется при генерации времени обслуживания.'
      : 'Количество заявок, передаваемых через выходной порт в секунду. Используется при расчёте задержки.'
    const timeLabel = isIncoming
      ? 'Среднее время обслуживания (t_in)'
      : 'Среднее время передачи (t_out)'
    const timeTooltip = 'Среднее время одного обслуживания. μ = 1 / t.'
    const speedModeTooltip =
      'Определяет, задаёте ли вы скорость напрямую через μ или через среднее время t (μ = 1 / t).'
    const resourceTypeTooltip =
      'Тип GPSS-ресурса, который будет использоваться для моделирования обслуживания на порту.'
    const resourceAmountTooltip = isIncoming
      ? 'Количество параллельных каналов обслуживания входящего потока.'
      : 'Количество параллельных каналов передачи на выходе.'
    const portLabelTooltip =
      'Подпись, отображаемая в интерфейсе конструктора. На генерируемый GPSS-код не влияет.'
    const autoCleanupTooltip =
      'Если включено, порт автоматически очищается, когда к нему не подключены рёбра.'
    const nameTooltip =
      'Отображаемое имя интерфейса. Используется в списке интерфейсов узла.'
    const descriptionTooltip = 'Краткое описание или заметка для интерфейса.'

    return (
      <div
        className="min-h-full bg-white border-l px-4 py-6"
        data-testid="properties-panel"
      >
        <div className="font-semibold mb-4">ИНТЕРФЕЙС • {nodeTitle}</div>
        <div className="text-sm text-gray-600 space-y-1 mb-4">
          <div>Направление: {directionLabels[iface.direction]}</div>
          <div>Подключено к: {iface.connectedNodeLabel}</div>
          <div>ID канала: {iface.edgeId}</div>
        </div>
        <Formik<InterfaceFormValues>
          initialValues={initialValues}
          enableReinitialize
          validationSchema={Yup.object({
            name: Yup.string().required('Укажите название'),
            description: Yup.string(),
            idx: Yup.number().min(1).required(),
            queueCapacity: Yup.number().min(0).integer().required(),
            speedMode: Yup.mixed<InterfaceSpeedMode>()
              .oneOf(['rate', 'time'])
              .required(),
            serviceRate: Yup.number().when('speedMode', {
              is: 'rate',
              then: schema => schema.moreThan(0).required(),
              otherwise: schema => schema.moreThan(0),
            }),
            serviceTime: Yup.number().when('speedMode', {
              is: 'time',
              then: schema => schema.moreThan(0).required(),
              otherwise: schema => schema.moreThan(0),
            }),
            resourceType: Yup.mixed<InterfaceResourceType>()
              .oneOf(['FACILITY', 'STORAGE'])
              .required(),
            resourceAmount: Yup.number().min(1).integer().required(),
            portLabel: Yup.string(),
            autoCleanup: Yup.boolean(),
          })}
          onSubmit={values => {
            const idxValue = Math.max(1, Math.floor(Number(values.idx)))
            const queueCapacity = Math.max(
              0,
              Math.floor(Number(values.queueCapacity))
            )
            const resourceTypeValue = values.resourceType
            const resourceAmount =
              resourceTypeValue === 'FACILITY'
                ? 1
                : Math.max(1, Math.floor(Number(values.resourceAmount)))
            let serviceRate = Number(values.serviceRate)
            let serviceTime = Number(values.serviceTime)
            if (values.speedMode === 'time') {
              serviceTime = Number(values.serviceTime) > 0 ? Number(values.serviceTime) : 1
              serviceRate = serviceTime > 0 ? 1 / serviceTime : 1
            } else {
              serviceRate = Number(values.serviceRate) > 0 ? Number(values.serviceRate) : 1
              serviceTime = serviceRate > 0 ? 1 / serviceRate : 1
            }

            const updatedNodes = nodes.map(n => {
              if (n.id !== interfaceNode.id) return n
              if (!n.data || !Array.isArray(n.data.interfaces)) return n
              const updatedInterfaces = (n.data.interfaces as NodeInterface[]).map(item =>
                item.id === iface.id
                  ? {
                      ...item,
                      name: values.name,
                      description: values.description,
                      idx: idxValue,
                      queueCapacity,
                      speedMode: values.speedMode,
                      serviceRate,
                      serviceTime,
                      resourceType: resourceTypeValue,
                      resourceAmount,
                      label: values.portLabel,
                      autoCleanup: values.autoCleanup,
                    }
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
          {({ values, setFieldValue }) => (
            <Form className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <LabelWithTooltip
                  htmlFor="name"
                  text="Название"
                  tooltip={nameTooltip}
                />
                <Field id="name" name="name" className="border rounded p-1" />
              </div>
              <div className="flex flex-col gap-1">
                <LabelWithTooltip
                  htmlFor="description"
                  text="Описание"
                  tooltip={descriptionTooltip}
                />
                <Field
                  as="textarea"
                  id="description"
                  name="description"
                  className="border rounded p-1 resize-y min-h-[80px]"
                />
              </div>
              <div className="border-t pt-3 mt-2 space-y-3">
                <div className="text-sm font-semibold">
                  {isIncoming
                    ? 'Параметры входящего интерфейса'
                    : 'Параметры исходящего интерфейса'}
                </div>
                <div className="flex flex-col gap-1">
                  <LabelWithTooltip htmlFor="idx" text={idxLabel} tooltip={idxTooltip} />
                  <input
                    id="idx"
                    name="idx"
                    type="number"
                    className="border rounded p-1 bg-gray-100"
                    value={values.idx}
                    readOnly
                    disabled
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <LabelWithTooltip
                    htmlFor="queueCapacity"
                    text={queueLabel}
                    tooltip={queueTooltip}
                  />
                  <input
                    id="queueCapacity"
                    name="queueCapacity"
                    type="number"
                    min={0}
                    className="border rounded p-1"
                    value={values.queueCapacity}
                    onChange={event =>
                      setFieldValue(
                        'queueCapacity',
                        Math.max(0, Math.floor(Number(event.target.value)))
                      )
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <LabelWithTooltip
                    text="Способ задания скорости"
                    tooltip={speedModeTooltip}
                  />
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="radio"
                        name="speedMode"
                        value="rate"
                        checked={values.speedMode === 'rate'}
                        onChange={() => {
                          setFieldValue('speedMode', 'rate')
                          if (values.serviceRate <= 0 && values.serviceTime > 0) {
                            setFieldValue('serviceRate', 1 / values.serviceTime)
                          }
                        }}
                      />
                      μ
                    </label>
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="radio"
                        name="speedMode"
                        value="time"
                        checked={values.speedMode === 'time'}
                        onChange={() => {
                          setFieldValue('speedMode', 'time')
                          if (values.serviceTime <= 0 && values.serviceRate > 0) {
                            setFieldValue('serviceTime', 1 / values.serviceRate)
                          }
                        }}
                      />
                      t
                    </label>
                  </div>
                </div>
                {values.speedMode === 'rate' ? (
                  <div className="flex flex-col gap-1">
                    <LabelWithTooltip
                      htmlFor="serviceRate"
                      text={rateLabel}
                      tooltip={rateTooltip}
                    />
                    <input
                      id="serviceRate"
                      name="serviceRate"
                      type="number"
                      min="0"
                      step="any"
                      className="border rounded p-1"
                      value={values.serviceRate}
                      onChange={event => {
                        const next = Number(event.target.value)
                        setFieldValue('serviceRate', next)
                        if (next > 0) {
                          setFieldValue('serviceTime', 1 / next)
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <LabelWithTooltip
                      htmlFor="serviceTime"
                      text={timeLabel}
                      tooltip={timeTooltip}
                    />
                    <input
                      id="serviceTime"
                      name="serviceTime"
                      type="number"
                      min="0"
                      step="any"
                      className="border rounded p-1"
                      value={values.serviceTime}
                      onChange={event => {
                        const next = Number(event.target.value)
                        setFieldValue('serviceTime', next)
                        if (next > 0) {
                          setFieldValue('serviceRate', 1 / next)
                        }
                      }}
                    />
                    <div className="text-xs text-gray-500">
                      μ ≈{' '}
                      {values.serviceTime > 0
                        ? (1 / values.serviceTime).toFixed(4)
                        : '—'}
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <LabelWithTooltip text="Ресурс обслуживания" tooltip={resourceTypeTooltip} />
                  <select
                    name="resourceType"
                    className="border rounded p-1"
                    value={values.resourceType}
                    onChange={event => {
                      const next = event.target.value as InterfaceResourceType
                      setFieldValue('resourceType', next)
                      if (next === 'FACILITY') {
                        setFieldValue('resourceAmount', 1)
                      }
                    }}
                  >
                    <option value="FACILITY">FACILITY (1 канал)</option>
                    <option value="STORAGE">STORAGE (несколько каналов)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <LabelWithTooltip
                    htmlFor="resourceAmount"
                    text="Количество каналов"
                    tooltip={resourceAmountTooltip}
                  />
                  <input
                    id="resourceAmount"
                    name="resourceAmount"
                    type="number"
                    min="1"
                    className="border rounded p-1"
                    value={
                      values.resourceType === 'FACILITY'
                        ? 1
                        : values.resourceAmount
                    }
                    disabled={values.resourceType === 'FACILITY'}
                    onChange={event =>
                      setFieldValue(
                        'resourceAmount',
                        Math.max(1, Math.floor(Number(event.target.value)))
                      )
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <LabelWithTooltip
                    htmlFor="portLabel"
                    text="Подпись порта (label)"
                    tooltip={portLabelTooltip}
                  />
                  <input
                    id="portLabel"
                    name="portLabel"
                    type="text"
                    className="border rounded p-1"
                    value={values.portLabel}
                    onChange={event => setFieldValue('portLabel', event.target.value)}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="autoCleanup"
                    checked={values.autoCleanup}
                    onChange={event => setFieldValue('autoCleanup', event.target.checked)}
                  />
                  <span className="flex items-center gap-1">
                    Авто-очистка порта
                    <QuestionMarkCircleIcon
                      className="w-4 h-4 text-gray-400"
                      title={autoCleanupTooltip}
                      aria-hidden="true"
                    />
                  </span>
                </label>
              </div>
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
