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
  // Integer distributions (целочисленные)
  duniform: [
    { key: 'rn', label: 'Номер генератора RN (1-7)', placeholder: '1', description: 'Номер потока случайных чисел (RNj).' },
    { key: 'min', label: 'Минимум (min)', placeholder: '64', description: 'Наименьшее значение генерируемой СВ.' },
    { key: 'max', label: 'Максимум (max)', placeholder: '1500', description: 'Наибольшее значение генерируемой СВ.' },
  ],
  binomial: [
    { key: 'rn', label: 'Номер генератора RN (1-7)', placeholder: '1', description: 'Номер потока случайных чисел (RNj).' },
    { key: 'n', label: 'Число испытаний (n)', placeholder: '10', description: 'Число испытаний Бернулли.' },
    { key: 'p', label: 'Вероятность успеха (p)', placeholder: '0.5', description: 'Вероятность успеха при каждом испытании (0-1).' },
  ],
  negbinom: [
    { key: 'rn', label: 'Номер генератора RN (1-7)', placeholder: '1', description: 'Номер потока случайных чисел (RNj).' },
    { key: 'nc', label: 'Число успехов (nc)', placeholder: '5', description: 'Требуемое число успехов.' },
    { key: 'p', label: 'Вероятность успеха (p)', placeholder: '0.5', description: 'Вероятность успеха при каждом испытании (0-1).' },
  ],
  geometric: [
    { key: 'rn', label: 'Номер генератора RN (1-7)', placeholder: '1', description: 'Номер потока случайных чисел (RNj).' },
    { key: 'p', label: 'Вероятность успеха (p)', placeholder: '0.3', description: 'Вероятность успеха (0-1).' },
  ],
  poisson: [
    { key: 'rn', label: 'Номер генератора RN (1-7)', placeholder: '1', description: 'Номер потока случайных чисел (RNj).' },
    { key: 'm', label: 'Математическое ожидание (m)', placeholder: '100', description: 'Среднее значение распределения.' },
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

export const defaultTrafficDistribution = 'duniform'

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
