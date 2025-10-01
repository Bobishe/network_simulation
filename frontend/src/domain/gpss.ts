export type GPSSOption = {
  value: string
  label: string
  description?: string
}

export type GPSSDistributionParameter = {
  key: string
  label: string
  placeholder?: string
  description?: string
}

export const gpssDistributionParameters: Record<
  string,
  GPSSDistributionParameter[]
> = {
  uniform: [
    { key: 'min', label: 'Минимум', placeholder: '0' },
    { key: 'max', label: 'Максимум', placeholder: '100' },
  ],
  exponential: [
    {
      key: 'lambda',
      label: 'Параметр λ',
      placeholder: '0.5',
      description: 'Интенсивность экспоненциального распределения.',
    },
  ],
  normal: [
    { key: 'mean', label: 'Мат. ожидание μ', placeholder: '500' },
    { key: 'std', label: 'Стандартное отклонение σ', placeholder: '100' },
  ],
  lognormal: [
    { key: 'mu', label: 'μ логнормального распределения', placeholder: '6.2' },
    {
      key: 'sigma',
      label: 'σ логнормального распределения',
      placeholder: '0.8',
    },
  ],
  erlang: [
    { key: 'k', label: 'Порядок k', placeholder: '2' },
    { key: 'rate', label: 'Интенсивность λ', placeholder: '0.5' },
  ],
  empirical: [
    {
      key: 'reference',
      label: 'Источник данных',
      placeholder: 'dataset.csv',
      description: 'Укажите файл или идентификатор эмпирического распределения.',
    },
  ],
}

export const createParametersForDistribution = (
  distribution: string,
  previous?: Record<string, string>
): Record<string, string> => {
  const params = gpssDistributionParameters[distribution] ?? []
  const next: Record<string, string> = {}

  params.forEach(parameter => {
    next[parameter.key] = previous?.[parameter.key] ?? ''
  })

  return next
}

export type GPSSExperimentControl = {
  horizon: string
  timeUnit: string
  replications: string
  aggregationMethod: string
  warmUpPolicy: string
  resetPolicy: string
  stopCondition: string
}

export type GPSSRandomGenerators = {
  baseSeed: string
  seedMode: string
  streamSeparation: string[]
  streamPolicy: string
}

export type GPSSTrafficCharacteristics = {
  mtu: string
  dataVolumeDistribution: string
  dataVolumeParameters: Record<string, string>
  dataTypesComposition: string[]
  dataTypeMixMode: string
  roundingPolicy: string
}

export type GPSSServicePolicies = {
  serviceTimeDistribution: string
  queueDiscipline: string
  queueLimits: string
}

export type GPSSChannelModel = {
  defaultThroughputValue: string
  defaultThroughputUnit: string
  delayFormula: string
  jitterDistribution: string
  duplexPolicy: string
}

export type GPSSStatisticsCollection = {
  metrics: string[]
  aggregationGranularity: string
  counterPrefixes: string
  loggingPolicy: string
}

export type GPSSConfig = {
  experimentControl: GPSSExperimentControl
  randomGenerators: GPSSRandomGenerators
  trafficCharacteristics: GPSSTrafficCharacteristics
  servicePolicies: GPSSServicePolicies
  channelModel: GPSSChannelModel
  statisticsCollection: GPSSStatisticsCollection
}

export const defaultTrafficDistribution = 'uniform'

export const createDefaultGPSSConfig = (): GPSSConfig => ({
  experimentControl: {
    horizon: '',
    timeUnit: 'minutes',
    replications: '',
    aggregationMethod: 'mean',
    warmUpPolicy: 'no_warmup',
    resetPolicy: 'reset_all',
    stopCondition: 'none',
  },
  randomGenerators: {
    baseSeed: '',
    seedMode: 'fixed',
    streamSeparation: [],
    streamPolicy: 'per_subsystem',
  },
  trafficCharacteristics: {
    mtu: '65535',
    dataVolumeDistribution: defaultTrafficDistribution,
    dataVolumeParameters: createParametersForDistribution(defaultTrafficDistribution),
    dataTypesComposition: [],
    dataTypeMixMode: 'equal',
    roundingPolicy: 'ceil',
  },
  servicePolicies: {
    serviceTimeDistribution: 'exponential',
    queueDiscipline: 'fifo',
    queueLimits: 'no_limit',
  },
  channelModel: {
    defaultThroughputValue: '',
    defaultThroughputUnit: 'bps',
    delayFormula: 'propagation_only',
    jitterDistribution: 'none',
    duplexPolicy: 'full_duplex',
  },
  statisticsCollection: {
    metrics: [],
    aggregationGranularity: 'none',
    counterPrefixes: '',
    loggingPolicy: 'aggregates',
  },
})

export const cloneGPSSConfig = (config: GPSSConfig): GPSSConfig =>
  JSON.parse(JSON.stringify(config))
