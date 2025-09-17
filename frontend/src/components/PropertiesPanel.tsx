import { Formik, Form, Field, FieldArray, useFormikContext } from 'formik'
import { useEffect } from 'react'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import type { Node } from 'reactflow'
import * as Yup from 'yup'
import { useAppDispatch, useAppSelector } from '../hooks'
import {
  updateNode,
  updateEdge,
  select,
  setModel,
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
  GeneratorConfig,
  updateConnectedLabels,
} from '../utils/interfaces'
import {
  generateNodeCode,
  hasProcessing,
  normalizeProcessing,
} from '../utils/nodeProcessing'
import { createDefaultGenerator } from '../utils/generatorConfig'
import toast from 'react-hot-toast'
import type { ModelConfig } from '../domain/types'

const typeNames: Record<string, string> = {
  leo: 'Низкая орбита',
  meo: 'Средняя орбита',
  geo: 'Геостационарная орбита',
  gnd: 'Наземная станция',
  haps: 'Высотная платформа',
  as: 'Узел AS',
  ssop: 'Узел SSOP',
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

type RoutingFormValue = {
  type: number
  outPort: number
}

interface ModelFormValues {
  modelId: string
  duration: number
  timeUnit: string
  seed: number | ''
  capacityDist: string
  minBytes: number
  maxBytes: number
  mtu: number
  dataTypes: string
}

interface NodeFormValues {
  label: string
  lat: number
  lon: number
  altitude?: number | ''
  location?: string
  code?: string
  serviceLines: number
  queue: number
  mu: number
  dist: string
  routingTable: RoutingFormValue[]
}

interface GeneratorFormValues {
  label: string
  lat: number
  lon: number
  lambda: number
  typeData: number
  capacitySource: 'capacity' | 'custom'
  targetNodeId: string
  targetInPortId: string
  targetInPortIdx: number | null
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

const COORDINATE_EPSILON = 1e-6

function NodePositionUpdater({ node }: { node: Node }) {
  const { values } = useFormikContext<any>()
  const dispatch = useAppDispatch()
  const { nodes, edges } = useAppSelector(state => state.network)

  useEffect(() => {
    if (!node) return
    const lat = Number(values.lat)
    const lon = Number(values.lon)
    if (isNaN(lat) || isNaN(lon)) return

    const currentLat =
      typeof node.data?.lat === 'number' ? node.data.lat : undefined
    const currentLon =
      typeof node.data?.lon === 'number' ? node.data.lon : undefined

    if (
      currentLat !== undefined &&
      currentLon !== undefined &&
      Math.abs(currentLat - lat) < COORDINATE_EPSILON &&
      Math.abs(currentLon - lon) < COORDINATE_EPSILON
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
  const { nodes, edges, model, selectedId } = useAppSelector(
    state => state.network
  )
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
        className="min-h-full bg-white border-l px-4 py-6 overflow-auto"
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

  if (!node && !edge) {
    const params = model.traffic.capacity.params
    const initialValues: ModelFormValues = {
      modelId: model.model.id,
      duration: model.sim.duration,
      timeUnit: model.time?.unit ?? '',
      seed:
        typeof model.rng?.seed === 'number' && !Number.isNaN(model.rng.seed)
          ? model.rng.seed
          : '',
      capacityDist: model.traffic.capacity.dist,
      minBytes: typeof params?.minBytes === 'number' ? params.minBytes : 0,
      maxBytes: typeof params?.maxBytes === 'number' ? params.maxBytes : 0,
      mtu: model.packet.mtu,
      dataTypes: Array.isArray(model.dataTypes)
        ? model.dataTypes.join(', ')
        : '',
    }

    return (
      <div className="bg-white border-l px-4 py-6 overflow-auto" data-testid="properties-panel">
        <div className="font-semibold mb-4">ГЛОБАЛЬНАЯ МОДЕЛЬ</div>
        <Formik<ModelFormValues>
          initialValues={initialValues}
          enableReinitialize
          validationSchema={Yup.object({
            modelId: Yup.string().required(),
            duration: Yup.number().moreThan(0).required(),
            timeUnit: Yup.string(),
            seed: Yup.number()
              .integer()
              .nullable()
              .transform(value => (Number.isNaN(value) ? null : value)),
            capacityDist: Yup.string().required(),
            minBytes: Yup.number().min(0).required(),
            maxBytes: Yup.number()
              .min(Yup.ref('minBytes') as unknown as number)
              .required(),
            mtu: Yup.number().min(1).required(),
            dataTypes: Yup.string(),
          })}
          onSubmit={values => {
            const seedValue =
              values.seed === '' || values.seed === null
                ? undefined
                : Number(values.seed)
            const parsedDataTypes = values.dataTypes
              .split(',')
              .map(part => Number(part.trim()))
              .filter(num => Number.isInteger(num) && num > 0)
            const nextParams = { ...model.traffic.capacity.params }
            nextParams.minBytes = Number(values.minBytes)
            nextParams.maxBytes = Number(values.maxBytes)

            const nextModel: ModelConfig = {
              model: { id: values.modelId.trim() || model.model.id },
              sim: { duration: Number(values.duration) },
              time: values.timeUnit ? { unit: values.timeUnit } : undefined,
              rng: seedValue !== undefined ? { seed: seedValue } : undefined,
              traffic: {
                capacity: {
                  dist: values.capacityDist || model.traffic.capacity.dist,
                  params: nextParams,
                },
              },
              packet: { mtu: Number(values.mtu) },
              dataTypes: parsedDataTypes.length > 0 ? parsedDataTypes : undefined,
            }

            dispatch(setModel(nextModel))
            toast.success('Глобальные настройки сохранены')
          }}
        >
          {({ values, setFieldValue }) => (
            <Form className="flex flex-col gap-2 min-w-[360px]">
              <label className="text-sm">ID модели</label>
              <Field name="modelId" className="border rounded p-1" />
              <label className="text-sm">Длительность моделирования (sim.duration)</label>
              <Field name="duration" type="number" className="border rounded p-1" />
              <label className="text-sm">Единица времени (time.unit)</label>
              <Field name="timeUnit" className="border rounded p-1" />
              <label className="text-sm">Seed ГСЧ (rng.seed)</label>
              <Field name="seed" type="number" className="border rounded p-1" />
              <label className="text-sm">Распределение traffic.capacity.dist</label>
              <Field name="capacityDist" className="border rounded p-1" />
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-sm">minBytes</label>
                  <Field name="minBytes" type="number" className="border rounded p-1" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm">maxBytes</label>
                  <Field name="maxBytes" type="number" className="border rounded p-1" />
                </div>
              </div>
              <label className="text-sm">MTU пакета (packet.mtu)</label>
              <Field name="mtu" type="number" className="border rounded p-1" />
              <label className="text-sm">Допустимые типы данных (через запятую)</label>
              <input
                name="dataTypes"
                className="border rounded p-1"
                value={values.dataTypes}
                onChange={event => setFieldValue('dataTypes', event.target.value)}
              />
              <div className="flex justify-end gap-2 mt-4">
                <button type="submit" className="px-3 py-1 bg-blue-500 text-white rounded">
                  Сохранить
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    )
  }

  if (node) {
    const type = node.type || ''
    if (type === 'as' || type === 'ssop') {
      const generatorDefaults =
        (node.data?.generator as GeneratorConfig | undefined) ??
        createDefaultGenerator(type) ?? {
          lambda: 1,
          typeData: type === 'ssop' ? 2 : 1,
          capacitySource: 'capacity' as const,
          target: { nodeId: '', inPortId: '', inPortIdx: null },
        }

      const initialValues: GeneratorFormValues = {
        label: node.data?.label || '',
        lat: node.data?.lat ?? 0,
        lon: node.data?.lon ?? 0,
        lambda: generatorDefaults.lambda,
        typeData: generatorDefaults.typeData,
        capacitySource: generatorDefaults.capacitySource ?? 'capacity',
        targetNodeId: generatorDefaults.target?.nodeId ?? '',
        targetInPortId: generatorDefaults.target?.inPortId ?? '',
        targetInPortIdx:
          typeof generatorDefaults.target?.inPortIdx === 'number'
            ? generatorDefaults.target!.inPortIdx!
            : null,
      }

      const schema = Yup.object({
        label: Yup.string().required(),
        lat: Yup.number().min(0).max(180).required(),
        lon: Yup.number().min(0).max(360).required(),
        lambda: Yup.number().moreThan(0).required(),
        typeData: Yup.number().min(1).integer().required(),
        capacitySource: Yup.mixed<'capacity' | 'custom'>()
          .oneOf(['capacity', 'custom'])
          .required(),
        targetNodeId: Yup.string().required('Укажите целевой узел'),
        targetInPortId: Yup.string(),
        targetInPortIdx: Yup.number()
          .min(1)
          .integer()
          .nullable()
          .transform(value => (Number.isNaN(value) ? null : value))
          .test('port-ref', 'Укажите ID или индекс порта', function (value) {
            const { targetInPortId } = this.parent as GeneratorFormValues
            const portId = targetInPortId?.trim?.() ?? ''
            const idxValid = typeof value === 'number' && value > 0
            return portId.length > 0 || idxValid
          }),
      })

      const availableTargets = nodes.filter(n => n.id !== node.id)

      return (
        <div
          className="bg-white border-l px-4 py-6 overflow-auto"
          data-testid="properties-panel"
        >
          <div className="font-semibold mb-4">
            {typeNames[node.type || '']} • {node.id}
          </div>
          <Formik<GeneratorFormValues>
            initialValues={initialValues}
            enableReinitialize
            validationSchema={schema}
            onSubmit={values => {
              const lat = Number(values.lat)
              const lon = Number(values.lon)
              const position = latLonToPos(lat, lon)
              const baseData = { ...(node.data ?? {}) } as any
              baseData.label = values.label
              baseData.lat = lat
              baseData.lon = lon
              baseData.generator = {
                lambda: Number(values.lambda),
                typeData: Math.max(1, Math.floor(Number(values.typeData))),
                capacitySource: values.capacitySource,
                target: {
                  nodeId: values.targetNodeId,
                  inPortId: values.targetInPortId?.trim() || undefined,
                  inPortIdx:
                    typeof values.targetInPortIdx === 'number'
                      ? Math.max(1, Math.floor(values.targetInPortIdx))
                      : undefined,
                },
              }

              const updatedNodes = nodes.map(n =>
                n.id === node.id
                  ? {
                      ...node,
                      position,
                      data: baseData,
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
            {({ values, setFieldValue, errors }) => (
              <Form className="flex flex-col gap-2 min-w-[360px]">
                <NodePositionUpdater node={node} />
                <label className="text-sm">Метка</label>
                <Field name="label" className="border rounded p-1" />
                <label className="text-sm">Широта</label>
                <Field name="lat" type="number" className="border rounded p-1" />
                <label className="text-sm">Долгота</label>
                <Field name="lon" type="number" className="border rounded p-1" />
                <div className="flex flex-col gap-1">
                  <LabelWithTooltip
                    htmlFor="lambda"
                    text="Интенсивность потока (λ)"
                    tooltip="Среднее число заявок в единицу времени. Используется в GENERATE."
                  />
                  <Field
                    name="lambda"
                    type="number"
                    min={0}
                    step="any"
                    className="border rounded p-1"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <LabelWithTooltip
                    htmlFor="typeData"
                    text="Тип данных (type_data)"
                    tooltip="Значение поля type_data, присваиваемое заявкам."
                  />
                  <Field
                    name="typeData"
                    type="number"
                    min={1}
                    className="border rounded p-1"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <LabelWithTooltip
                    text="Источник ёмкости"
                    tooltip="Определяет, брать ли размер сообщения из глобального распределения или задавать своё."
                  />
                  <select
                    name="capacitySource"
                    className="border rounded p-1"
                    value={values.capacitySource}
                    onChange={event =>
                      setFieldValue(
                        'capacitySource',
                        event.target.value as 'capacity' | 'custom'
                      )
                    }
                  >
                    <option value="capacity">Использовать traffic.capacity</option>
                    <option value="custom">Пользовательское распределение</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <LabelWithTooltip
                    text="Целевой узел"
                    tooltip="Узел, на вход которого будут передаваться заявки."
                  />
                  <select
                    name="targetNodeId"
                    className="border rounded p-1"
                    value={values.targetNodeId}
                    onChange={event =>
                      setFieldValue('targetNodeId', event.target.value)
                    }
                  >
                    <option value="">— Не выбран —</option>
                    {values.targetNodeId &&
                      !availableTargets.some(target => target.id === values.targetNodeId) && (
                        <option value={values.targetNodeId}>
                          {values.targetNodeId} (недоступен)
                        </option>
                      )}
                    {availableTargets.map(target => (
                      <option key={target.id} value={target.id}>
                        {target.data?.label || target.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <LabelWithTooltip
                    htmlFor="targetInPortId"
                    text="ID входящего порта"
                    tooltip="Строковый идентификатор входящего интерфейса (in_intX_Node)."
                  />
                  <Field
                    name="targetInPortId"
                    id="targetInPortId"
                    className="border rounded p-1"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <LabelWithTooltip
                    htmlFor="targetInPortIdx"
                    text="Индекс входа"
                    tooltip="Номер входящего интерфейса (idx). Можно оставить пустым, если указан ID."
                  />
                  <Field
                    name="targetInPortIdx"
                    id="targetInPortIdx"
                    type="number"
                    min={1}
                    className="border rounded p-1"
                  />
                  {typeof errors.targetInPortIdx === 'string' && (
                    <div className="text-xs text-red-600">{errors.targetInPortIdx}</div>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="submit"
                    className="px-3 py-1 bg-blue-500 text-white rounded"
                  >
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
    const isSatellite = ['leo', 'meo', 'geo', 'haps'].includes(type)
    const isGround = type === 'gnd'
    const processingEnabled = hasProcessing(type)
    const normalizedProcessing = normalizeProcessing(
      (node.data?.processing as any) ?? undefined
    )
    let initialCode = node.data?.code ?? ''
    if (processingEnabled && !initialCode) {
      initialCode = generateNodeCode(node.type, nodes) ?? ''
    }
    const initialValues: NodeFormValues = {
      label: node.data?.label || '',
      lat: node.data?.lat ?? 0,
      lon: node.data?.lon ?? 0,
      altitude: isSatellite
        ? node.data?.altitude ?? ALTITUDE_RANGES[node.type || '']?.min ?? ''
        : undefined,
      location: isGround ? node.data?.location || '' : '',
      code: initialCode,
      serviceLines: normalizedProcessing.serviceLines,
      queue: normalizedProcessing.queue,
      mu: normalizedProcessing.mu,
      dist: normalizedProcessing.dist ?? 'Exponential',
      routingTable: normalizedProcessing.routingTable,
    }

    const schemaShape: Record<string, any> = {
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
    if (processingEnabled) {
      schemaShape.code = Yup.string().required()
      schemaShape.serviceLines = Yup.number().min(1).integer().required()
      schemaShape.queue = Yup.number().min(0).integer().required()
      schemaShape.mu = Yup.number().moreThan(0).required()
      schemaShape.dist = Yup.string().required()
      schemaShape.routingTable = Yup.array()
        .of(
          Yup.object({
            type: Yup.number().min(1).integer().required(),
            outPort: Yup.number().min(1).integer().required(),
          })
        )
        .min(1)
    }

    return (
      <div className="bg-white border-l px-4 py-6 overflow-auto" data-testid="properties-panel">
        <div className="font-semibold mb-4">
          {typeNames[node.type || '']} • {node.id}
        </div>
        <Formik<NodeFormValues>
          initialValues={initialValues}
          enableReinitialize
          validationSchema={Yup.object(schemaShape)}
          onSubmit={values => {
            const lat = Number(values.lat)
            const lon = Number(values.lon)
            const position = latLonToPos(lat, lon)
            const baseData = { ...(node.data ?? {}) } as any
            delete baseData.serviceLines
            delete baseData.queue
            delete baseData.mu
            delete baseData.routingTable
            delete baseData.dist

            baseData.label = values.label
            baseData.lat = lat
            baseData.lon = lon

            if (isSatellite) {
              baseData.altitude = Number(values.altitude)
            } else {
              delete baseData.altitude
            }

            if (isGround) {
              baseData.location = values.location ?? ''
            } else {
              delete baseData.location
            }

            if (processingEnabled) {
              const sanitizedProcessing = normalizeProcessing({
                serviceLines: Number(values.serviceLines),
                queue: Number(values.queue),
                mu: Number(values.mu),
                dist: values.dist,
                routingTable: values.routingTable,
              })
              const rawCode = (values.code ?? '').trim()
              if (rawCode) {
                baseData.code = rawCode
              } else {
                const generated = generateNodeCode(node.type, nodes)
                if (generated) baseData.code = generated
                else delete baseData.code
              }
              baseData.processing = sanitizedProcessing
            } else {
              delete baseData.code
              delete baseData.processing
            }

            const updatedNodes = nodes.map(n =>
              n.id === node.id
                ? {
                    ...node,
                    position,
                    data: baseData,
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
          {({ values, setFieldValue }) => (
            <Form className="flex flex-col gap-2 min-w-[360px]">
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
              {processingEnabled && (
                <div className="border-t pt-3 mt-2 space-y-3">
                  <div className="text-sm font-semibold">Параметры обработки</div>
                  <div className="flex flex-col gap-1">
                    <LabelWithTooltip
                      htmlFor="code"
                      text="ID/код узла"
                      tooltip="Используется при генерации имён меток в GPSS (processing_SC1, in_int1_SC1 и т.п.)."
                    />
                    <Field id="code" name="code" className="border rounded p-1" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <LabelWithTooltip
                      htmlFor="serviceLines"
                      text="Линии обработки (serviceLines)"
                      tooltip="Количество параллельных линий обслуживания. Используется в объявлении STORAGE."
                    />
                    <input
                      id="serviceLines"
                      name="serviceLines"
                      type="number"
                      min={1}
                      className="border rounded p-1"
                      value={values.serviceLines}
                      onChange={event =>
                        setFieldValue(
                          'serviceLines',
                          Math.max(1, Math.floor(Number(event.target.value)))
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <LabelWithTooltip
                      htmlFor="queue"
                      text="Размер очереди (q_node)"
                      tooltip="Максимальное количество заявок в очереди обработки."
                    />
                    <input
                      id="queue"
                      name="queue"
                      type="number"
                      min={0}
                      className="border rounded p-1"
                      value={values.queue}
                      onChange={event =>
                        setFieldValue(
                          'queue',
                          Math.max(0, Math.floor(Number(event.target.value)))
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <LabelWithTooltip
                      htmlFor="mu"
                      text="Интенсивность обработки (μ_node)"
                      tooltip="Количество обслуживаний в секунду (1 / среднее время). Используется в операторе ADVANCE."
                    />
                    <input
                      id="mu"
                      name="mu"
                      type="number"
                      min={0}
                      step="any"
                      className="border rounded p-1"
                      value={values.mu}
                      onChange={event => setFieldValue('mu', Number(event.target.value))}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <LabelWithTooltip
                      htmlFor="dist"
                      text="Распределение обслуживания"
                      tooltip="Определяет вид распределения времени обслуживания (для ADVANCE)."
                    />
                    <select
                      id="dist"
                      name="dist"
                      className="border rounded p-1"
                      value={values.dist}
                      onChange={event => setFieldValue('dist', event.target.value)}
                    >
                      <option value="Exponential">Exponential</option>
                      <option value="Deterministic">Deterministic</option>
                      <option value="Uniform">Uniform</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <LabelWithTooltip
                      text="Маршрутизация по типам данных"
                      tooltip="Сопоставляет type_data номеру выходного порта (out_int{idx})."
                    />
                    <FieldArray name="routingTable">
                      {arrayHelpers => {
                        const routingValues = Array.isArray(values.routingTable)
                          ? values.routingTable
                          : []

                        return (
                          <div className="flex flex-col gap-2">
                            {routingValues.length === 0 && (
                              <div className="text-sm text-gray-500">
                                Нет правил маршрутизации. Добавьте правило.
                              </div>
                            )}

                            {routingValues.map((route, index) => {
                              const safeRoute = (
                                route && typeof route === 'object'
                                  ? route
                                  : { type: 1, outPort: 1 }
                              ) as RoutingFormValue

                              return (
                                <div
                                  key={index}
                                  className="flex flex-wrap gap-2 items-end min-w-[320px]"
                                >
                                  <div className="flex flex-col gap-1">
                                    <label
                                      className="text-sm"
                                      htmlFor={`routingTable-${index}-type`}
                                    >
                                      type_data
                                    </label>
                                    <input
                                      id={`routingTable-${index}-type`}
                                      type="number"
                                      min={1}
                                      className="border rounded p-1 w-28"
                                      value={safeRoute?.type ?? ''}
                                      onChange={event =>
                                        setFieldValue(
                                          `routingTable[${index}].type`,
                                          Math.max(
                                            1,
                                            Math.floor(Number(event.target.value))
                                          )
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label
                                      className="text-sm"
                                      htmlFor={`routingTable-${index}-out`}
                                    >
                                      Выходной порт (idx)
                                    </label>
                                    <input
                                      id={`routingTable-${index}-out`}
                                      type="number"
                                      min={1}
                                      className="border rounded p-1 w-32"
                                      value={safeRoute?.outPort ?? ''}
                                      onChange={event =>
                                        setFieldValue(
                                          `routingTable[${index}].outPort`,
                                          Math.max(
                                            1,
                                            Math.floor(Number(event.target.value))
                                          )
                                        )
                                      }
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                                    onClick={() => arrayHelpers.remove(index)}
                                    disabled={routingValues.length <= 1}
                                  >
                                    Удалить
                                  </button>
                                </div>
                              )
                            })}

                            <button
                              type="button"
                              className="self-start px-2 py-1 text-sm border rounded"
                              onClick={() => {
                                const nextType =
                                  routingValues.length > 0
                                    ? Math.max(
                                        ...routingValues.map(item =>
                                          Number(item?.type) || 0
                                        )
                                      ) + 1
                                    : 1

                                const newRule: RoutingFormValue = {
                                  type: nextType,
                                  outPort: 1,
                                }

                                if (!Array.isArray(values.routingTable)) {
                                  setFieldValue('routingTable', [newRule])
                                } else {
                                  arrayHelpers.push(newRule)
                                }
                              }}
                            >
                              Добавить правило
                            </button>
                          </div>
                        )
                      }}
                    </FieldArray>
                  </div>
                </div>
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
      <div className="bg-white border-l px-4 py-6 overflow-auto" data-testid="properties-panel">
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
