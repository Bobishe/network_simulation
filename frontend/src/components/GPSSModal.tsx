import { useState } from 'react'

type ExperimentControl = {
  horizon: string
  timeUnit: string
  replications: string
  aggregationMethod: string
  warmUp: string
  resetPolicy: string
  stopCondition: string
}

type RandomGenerators = {
  baseSeed: string
  streamSeparation: string
  reproducibilityPolicy: string
}

type TrafficCharacteristics = {
  mtu: string
  dataVolumeDistribution: string
  dataTypesComposition: string
  roundingPolicy: string
}

type ServicePolicies = {
  serviceTimeDistribution: string
  queueDiscipline: string
  queueLimits: string
}

type ChannelModel = {
  defaultThroughput: string
  delayFormula: string
  duplexPolicy: string
}

type StatisticsCollection = {
  metrics: string
  aggregationGranularity: string
  counterPrefixes: string
  loggingPolicy: string
}

type FormData = {
  experimentControl: ExperimentControl
  randomGenerators: RandomGenerators
  trafficCharacteristics: TrafficCharacteristics
  servicePolicies: ServicePolicies
  channelModel: ChannelModel
  statisticsCollection: StatisticsCollection
}

interface Props {
  onClose: () => void
}

const initialState: FormData = {
  experimentControl: {
    horizon: '',
    timeUnit: '',
    replications: '',
    aggregationMethod: '',
    warmUp: '',
    resetPolicy: '',
    stopCondition: '',
  },
  randomGenerators: {
    baseSeed: '',
    streamSeparation: '',
    reproducibilityPolicy: '',
  },
  trafficCharacteristics: {
    mtu: '',
    dataVolumeDistribution: '',
    dataTypesComposition: '',
    roundingPolicy: '',
  },
  servicePolicies: {
    serviceTimeDistribution: '',
    queueDiscipline: '',
    queueLimits: '',
  },
  channelModel: {
    defaultThroughput: '',
    delayFormula: '',
    duplexPolicy: '',
  },
  statisticsCollection: {
    metrics: '',
    aggregationGranularity: '',
    counterPrefixes: '',
    loggingPolicy: '',
  },
}

export default function GPSSModal({ onClose }: Props) {
  const [formData, setFormData] = useState<FormData>(initialState)

  const updateField = <K extends keyof FormData, T extends keyof FormData[K]>(
    section: K,
    field: T,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))
  }

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(formData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'gpss-config.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40"
      onClick={onClose}
    >
      <div
        className="bg-white w-11/12 max-w-5xl max-h-[90vh] overflow-y-auto rounded-lg p-6"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-2xl font-semibold">Глобальные параметры моделирования (GPSS)</h2>
          <button
            type="button"
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="text-lg font-semibold mb-3">Управление экспериментом</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm">
                Горизонт моделирования (временной лимит)
                <input
                  type="text"
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.experimentControl.horizon}
                  onChange={e => updateField('experimentControl', 'horizon', e.target.value)}
                />
              </label>
              <label className="flex flex-col text-sm">
                Единица времени модели (мин/сек/час)
                <input
                  type="text"
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.experimentControl.timeUnit}
                  onChange={e => updateField('experimentControl', 'timeUnit', e.target.value)}
                />
              </label>
              <label className="flex flex-col text-sm">
                Число повторов (replications)
                <input
                  type="text"
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.experimentControl.replications}
                  onChange={e => updateField('experimentControl', 'replications', e.target.value)}
                />
              </label>
              <label className="flex flex-col text-sm">
                Длина прогрева и политика сброса статистики
                <textarea
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.experimentControl.warmUp}
                  onChange={e => updateField('experimentControl', 'warmUp', e.target.value)}
                />
              </label>
              <label className="flex flex-col text-sm md:col-span-2">
                Условие останова по счётчику
                <textarea
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.experimentControl.stopCondition}
                  onChange={e => updateField('experimentControl', 'stopCondition', e.target.value)}
                />
              </label>
              <label className="flex flex-col text-sm">
                Политика сброса статистики после прогрева
                <textarea
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.experimentControl.resetPolicy}
                  onChange={e => updateField('experimentControl', 'resetPolicy', e.target.value)}
                />
              </label>
              <label className="flex flex-col text-sm">
                Способ агрегации результатов
                <input
                  type="text"
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.experimentControl.aggregationMethod}
                  onChange={e =>
                    updateField('experimentControl', 'aggregationMethod', e.target.value)
                  }
                />
              </label>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Генераторы случайных чисел</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm">
                Базовый seed эксперимента
                <input
                  type="text"
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.randomGenerators.baseSeed}
                  onChange={e => updateField('randomGenerators', 'baseSeed', e.target.value)}
                />
              </label>
              <label className="flex flex-col text-sm">
                Разделение потоков СВ по подсистемам
                <textarea
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.randomGenerators.streamSeparation}
                  onChange={e =>
                    updateField('randomGenerators', 'streamSeparation', e.target.value)
                  }
                />
              </label>
              <label className="flex flex-col text-sm md:col-span-2">
                Политика воспроизводимости
                <textarea
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.randomGenerators.reproducibilityPolicy}
                  onChange={e =>
                    updateField('randomGenerators', 'reproducibilityPolicy', e.target.value)
                  }
                />
              </label>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Пакетизация и характеристики трафика</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm">
                MTU (размер пакета, байт)
                <input
                  type="text"
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.trafficCharacteristics.mtu}
                  onChange={e => updateField('trafficCharacteristics', 'mtu', e.target.value)}
                />
              </label>
              <label className="flex flex-col text-sm">
                Распределение объёма передаваемых данных
                <textarea
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.trafficCharacteristics.dataVolumeDistribution}
                  onChange={e =>
                    updateField('trafficCharacteristics', 'dataVolumeDistribution', e.target.value)
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Состав типов данных и глобальные доли
                <textarea
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.trafficCharacteristics.dataTypesComposition}
                  onChange={e =>
                    updateField('trafficCharacteristics', 'dataTypesComposition', e.target.value)
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Глобальная политика округления числа пакетов
                <input
                  type="text"
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.trafficCharacteristics.roundingPolicy}
                  onChange={e =>
                    updateField('trafficCharacteristics', 'roundingPolicy', e.target.value)
                  }
                />
              </label>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Политики обслуживания по умолчанию</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm">
                Базовое распределение времен обслуживания
                <input
                  type="text"
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.servicePolicies.serviceTimeDistribution}
                  onChange={e =>
                    updateField('servicePolicies', 'serviceTimeDistribution', e.target.value)
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Базовая дисциплина очереди и приоритеты
                <textarea
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.servicePolicies.queueDiscipline}
                  onChange={e =>
                    updateField('servicePolicies', 'queueDiscipline', e.target.value)
                  }
                />
              </label>
              <label className="flex flex-col text-sm md:col-span-2">
                Глобальные верхние пределы длины очередей
                <textarea
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.servicePolicies.queueLimits}
                  onChange={e => updateField('servicePolicies', 'queueLimits', e.target.value)}
                />
              </label>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Канальная модель</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm">
                Глобальная скорость/пропускная способность по умолчанию
                <input
                  type="text"
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.channelModel.defaultThroughput}
                  onChange={e =>
                    updateField('channelModel', 'defaultThroughput', e.target.value)
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Базовая формула задержки и распределение джиттера
                <textarea
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.channelModel.delayFormula}
                  onChange={e => updateField('channelModel', 'delayFormula', e.target.value)}
                />
              </label>
              <label className="flex flex-col text-sm md:col-span-2">
                Политика half/full-duplex и направление по умолчанию
                <textarea
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.channelModel.duplexPolicy}
                  onChange={e => updateField('channelModel', 'duplexPolicy', e.target.value)}
                />
              </label>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Сбор статистики и метрики</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm">
                Перечень собираемых метрик
                <textarea
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.statisticsCollection.metrics}
                  onChange={e => updateField('statisticsCollection', 'metrics', e.target.value)}
                />
              </label>
              <label className="flex flex-col text-sm">
                Интервалы/гранулярность агрегации
                <textarea
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.statisticsCollection.aggregationGranularity}
                  onChange={e =>
                    updateField('statisticsCollection', 'aggregationGranularity', e.target.value)
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Имена/префиксы глобальных счётчиков
                <textarea
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.statisticsCollection.counterPrefixes}
                  onChange={e =>
                    updateField('statisticsCollection', 'counterPrefixes', e.target.value)
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Политика логирования
                <textarea
                  className="mt-1 border rounded px-3 py-2"
                  value={formData.statisticsCollection.loggingPolicy}
                  onChange={e => updateField('statisticsCollection', 'loggingPolicy', e.target.value)}
                />
              </label>
            </div>
          </section>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded border"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={handleDownload}
          >
            МОДЕЛТРОВАТЬ
          </button>
        </div>
      </div>
    </div>
  )
}
