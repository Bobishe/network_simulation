import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import {
  GPSSConfig,
  GPSSDistributionParameter,
  createDefaultGPSSConfig,
  createParametersForDistribution,
  gpssDistributionParameters,
  cloneGPSSConfig,
} from '../domain/gpss'
import { setGpssConfig } from '../features/network/networkSlice'

type Option = {
  value: string
  label: string
  description?: string
}

type DistributionParameter = GPSSDistributionParameter

type FormData = GPSSConfig

interface Props {
  onClose: () => void
}

const timeUnitOptions: Option[] = [
  {
    value: 'minutes',
    label: 'минуты',
    description: 'Базовая единица времени — минуты.',
  },
  {
    value: 'seconds',
    label: 'секунды',
    description: 'Используйте для более точного временного разрешения.',
  },
  {
    value: 'hours',
    label: 'часы',
    description: 'Подходит для длительных сценариев моделирования.',
  },
]

const warmUpPolicyOptions: Option[] = [
  {
    value: 'no_warmup',
    label: 'нет прогрева',
    description: 'Стартовые данные учитываются сразу.',
  },
  {
    value: 'fixed_duration',
    label: 'фиксированная длина',
    description: 'Прогрев до заранее заданного времени.',
  },
  {
    value: 'steady_state',
    label: 'до стационарности по метрике',
    description: 'Завершить прогрев при стабилизации выбранной метрики.',
  },
]

const resetPolicyOptions: Option[] = [
  {
    value: 'reset_all',
    label: 'сбросить всё',
    description: 'Обнулить все накопленные показатели.',
  },
  {
    value: 'reset_queues_resources',
    label: 'сбросить очереди и ресурсы',
    description: 'Сбросить только показатели очередей и ресурсов.',
  },
  {
    value: 'no_reset',
    label: 'не сбрасывать',
    description: 'Сохранять статистику, накопленную во время прогрева.',
  },
]

const stopConditionOptions: Option[] = [
  {
    value: 'none',
    label: 'не использовать',
    description: 'Моделирование завершается только по горизонту времени.',
  },
  {
    value: 'processed_requests',
    label: 'по числу обработанных заявок',
    description: 'Останов при достижении заданного количества заявок.',
  },
  {
    value: 'lost_packets',
    label: 'по числу потерянных пакетов',
    description: 'Контроль по максимально допустимым потерям.',
  },
  {
    value: 'total_system_time',
    label: 'по суммарному времени в системе',
    description: 'Завершить при достижении суммарного времени пребывания.',
  },
  {
    value: 'latency_percentile',
    label: 'по целевому перцентилю задержки (p95/p99)',
    description: 'Следить за достижением требуемых перцентилей задержки.',
  },
  {
    value: 'metrics_stability',
    label: 'по стабильности метрик (RSD < 5%)',
    description: 'Останов при стабилизации относительного разброса.',
  },
]

const aggregationOptions: Option[] = [
  {
    value: 'mean',
    label: 'среднее по репликациям',
    description: 'Классическое усреднение по всем прогоном.',
  },
  {
    value: 'median',
    label: 'медиана',
    description: 'Устойчивый показатель к выбросам.',
  },
  {
    value: 'trimmed_mean',
    label: 'усечённое среднее (5%)',
    description: 'Игнорирует 5% крайних наблюдений.',
  },
  {
    value: 'confidence_interval',
    label: 'доверительный интервал 95%',
    description: 'Рассчитать интервал доверия с уровнем 95%.',
  },
  {
    value: 'weighted_mean',
    label: 'взвешенное среднее по длительности',
    description: 'Учитывает длительность каждой репликации.',
  },
]

const seedModeOptions: Option[] = [
  {
    value: 'fixed',
    label: 'фиксированный',
    description: 'Одинаковый seed во всех запусках.',
  },
  {
    value: 'auto_shift',
    label: 'автосдвиг на +k для каждой репликации',
    description: 'Добавлять смещение к seed для каждого повтора.',
  },
  {
    value: 'random',
    label: 'случайный при каждом запуске',
    description: 'Новый seed перед каждым запуском модели.',
  },
]

const streamSeparationOptions: Option[] = [
  {
    value: 'arrivals',
    label: 'прибытия/генераторы',
    description: 'Потоки появления заявок и пакетов.',
  },
  {
    value: 'capacity',
    label: 'объёмы данных (capacity)',
    description: 'Определение размеров и объёмов пакетов.',
  },
  {
    value: 'interfaces_in',
    label: 'обслуживание интерфейсов (вход)',
    description: 'Сервисные времена входящих интерфейсов.',
  },
  {
    value: 'interfaces_out',
    label: 'обслуживание интерфейсов (выход)',
    description: 'Сервисные времена исходящих интерфейсов.',
  },
  {
    value: 'node_processing',
    label: 'обработка узлов (центральная)',
    description: 'Процессы обработки данных в узлах.',
  },
  {
    value: 'links',
    label: 'каналы/линки',
    description: 'Случайность задержек и потерь каналов.',
  },
  {
    value: 'routing',
    label: 'маршрутизация/ветвления',
    description: 'Вероятностный выбор направлений.',
  },
  {
    value: 'other',
    label: 'прочие',
    description: 'Дополнительные пользовательские подсистемы.',
  },
]

const streamPolicyOptions: Option[] = [
  {
    value: 'per_subsystem',
    label: 'каждому подсектору — свой seed',
    description: 'Максимальная независимость потоков случайных чисел.',
  },
  {
    value: 'shared',
    label: 'общий seed на всё',
    description: 'Использовать один поток для всех подсистем.',
  },
]

const dataVolumeDistributionOptions: Option[] = [
  {
    value: 'uniform',
    label: 'Равномерное',
    description: 'Пакеты равновероятно распределены в заданном диапазоне.',
  },
  {
    value: 'exponential',
    label: 'Экспоненциальное',
    description: 'Подходит для моделирования взрывных потоков.',
  },
  {
    value: 'normal',
    label: 'Нормальное',
    description: 'Средние значения с симметричным разбросом.',
  },
  {
    value: 'lognormal',
    label: 'Логнормальное',
    description: 'Асимметричное распределение объёмов пакетов.',
  },
  {
    value: 'erlang',
    label: 'Эрланга',
    description: 'Суперпозиция экспоненциальных фаз.',
  },
  {
    value: 'empirical',
    label: 'Эмпирическое',
    description: 'Использовать ранее собранные данные.',
  },
]

const dataTypeOptions: Option[] = [
  {
    value: 'type1',
    label: 'type=1',
    description: 'Базовый тип трафика.',
  },
  {
    value: 'type2',
    label: 'type=2',
    description: 'Вторичный тип или класс обслуживания.',
  },
  {
    value: 'custom',
    label: 'добавить собственный тип',
    description: 'Определите пользовательский набор параметров.',
  },
]

const dataTypeMixOptions: Option[] = [
  {
    value: 'equal',
    label: 'равные доли',
    description: 'Каждый тип получает одинаковую долю.',
  },
  {
    value: 'vector',
    label: 'по заданному вектору',
    description: 'Указать веса или вероятности вручную.',
  },
  {
    value: 'empirical',
    label: 'по эмпирическому распределению',
    description: 'Загрузить распределение из данных.',
  },
]

const roundingPolicyOptions: Option[] = [
  {
    value: 'ceil',
    label: 'вверх (ceil)',
    description: 'Округлять количество пакетов в большую сторону.',
  },
  {
    value: 'round',
    label: 'математическое округление',
    description: 'Обычное округление до ближайшего целого.',
  },
  {
    value: 'floor',
    label: 'вниз (floor)',
    description: 'Отбрасывать дробную часть в меньшую сторону.',
  },
]

const serviceTimeOptions: Option[] = [
  {
    value: 'exponential',
    label: 'Экспоненциальное',
    description: 'Поток обслуживания с памятью нулевой длины.',
  },
  {
    value: 'erlang',
    label: 'Эрланга(k)',
    description: 'Более детальное представление сервисного времени.',
  },
  {
    value: 'gamma',
    label: 'Гамма',
    description: 'Универсальное распределение положительных значений.',
  },
  {
    value: 'lognormal',
    label: 'Логнормальное',
    description: 'Воспроизводит асимметричные хвосты времени.',
  },
  {
    value: 'weibull',
    label: 'Вэйбулла',
    description: 'Гибкое распределение для надёжности.',
  },
  {
    value: 'deterministic',
    label: 'Детерминированное',
    description: 'Фиксированное время обслуживания.',
  },
  {
    value: 'empirical',
    label: 'Эмпирическое',
    description: 'Использовать замеры или исторические данные.',
  },
]

const queueDisciplineOptions: Option[] = [
  {
    value: 'fifo',
    label: 'FIFO',
    description: 'Первым пришёл — первым обслужен.',
  },
  {
    value: 'lifo',
    label: 'LIFO',
    description: 'Последним пришёл — первым обслужен.',
  },
  {
    value: 'priority_fixed',
    label: 'приоритетная (fixed)',
    description: 'Статические приоритеты без вытеснения.',
  },
  {
    value: 'priority_preemptive',
    label: 'приоритетная (preemptive)',
    description: 'Высокий приоритет может вытеснить обслуживание.',
  },
  {
    value: 'round_robin',
    label: 'round-robin',
    description: 'Квант времени по кругу для каждой очереди.',
  },
]

const queueLimitOptions: Option[] = [
  {
    value: 'no_limit',
    label: 'не ограничивать',
    description: 'Очередь может расти без ограничений.',
  },
  {
    value: 'global_limit',
    label: 'ограничить общим значением',
    description: 'Один лимит для всех очередей.',
  },
  {
    value: 'resource_class',
    label: 'по классам ресурсов',
    description: 'Отдельные лимиты для разных типов ресурсов.',
  },
]

const throughputUnitOptions: Option[] = [
  {
    value: 'bps',
    label: 'бит/с',
    description: 'Базовая единица пропускной способности.',
  },
  {
    value: 'kbps',
    label: 'Кбит/с',
    description: 'Удобно для типичных сетевых скоростей.',
  },
  {
    value: 'mbps',
    label: 'Мбит/с',
    description: 'Популярная единица для магистральных сетей.',
  },
  {
    value: 'gbps',
    label: 'Гбит/с',
    description: 'Высокоскоростные каналы и дата-центры.',
  },
]

const delayFormulaOptions: Option[] = [
  {
    value: 'propagation_only',
    label: 'только пропагация (S/c)',
    description: 'Учитывается только время распространения.',
  },
  {
    value: 'propagation_and_service',
    label: 'пропагация + сервис на канале',
    description: 'Добавляется время передачи по каналу.',
  },
  {
    value: 'mm1',
    label: 'M/M/1 канал',
    description: 'Классическая очередь с экспоненциальным обслуживанием.',
  },
  {
    value: 'md1',
    label: 'M/D/1 канал',
    description: 'Экспоненциальные прибытия и детерминированный сервис.',
  },
  {
    value: 'custom',
    label: 'пользовательская формула',
    description: 'Определяется внешней функцией задержки.',
  },
]

const jitterOptions: Option[] = [
  {
    value: 'none',
    label: 'отсутствует',
    description: 'Дополнительный джиттер не учитывается.',
  },
  {
    value: 'uniform',
    label: 'равномерный',
    description: 'Варьируется в заданном диапазоне.',
  },
  {
    value: 'normal',
    label: 'нормальный',
    description: 'Колебания с симметричным распределением.',
  },
  {
    value: 'lognormal',
    label: 'логнормальный',
    description: 'Асимметричное распределение джиттера.',
  },
  {
    value: 'exponential',
    label: 'экспоненциальный',
    description: 'Быстрые всплески задержки.',
  },
]

const duplexOptions: Option[] = [
  {
    value: 'full_duplex',
    label: 'full-duplex',
    description: 'Передача в обоих направлениях одновременно.',
  },
  {
    value: 'half_duplex',
    label: 'half-duplex',
    description: 'Поочерёдное направление передачи.',
  },
  {
    value: 'simplex',
    label: 'simplex',
    description: 'Передача только в одном направлении.',
  },
]

const metricsOptions: Option[] = [
  { value: 'avg_delay', label: 'средняя задержка', description: 'Среднее время прохождения пакета.' },
  { value: 'delay_distribution', label: 'распределение задержки', description: 'Гистограмма задержек.' },
  { value: 'queue_lengths', label: 'длины очередей', description: 'Динамика длины очередей.' },
  { value: 'loss_probability', label: 'вероятность потерь', description: 'Оценка вероятности потерь пакетов.' },
  { value: 'resource_utilization', label: 'загрузка ресурсов', description: 'Процент времени занятости ресурсов.' },
  { value: 'throughput', label: 'throughput', description: 'Пропускная способность системы.' },
  { value: 'percentiles', label: 'перцентили p50/p90/p95/p99', description: 'Высокие перцентили задержки.' },
  { value: 'system_time', label: 'время в системе', description: 'Полное время пребывания пакета.' },
  { value: 'rsd', label: 'отклонение (RSD)', description: 'Относительное стандартное отклонение.' },
]

const aggregationGranularityOptions: Option[] = [
  {
    value: 'none',
    label: 'без разбиения',
    description: 'Хранить только агрегированные показатели.',
  },
  { value: '1m', label: '1 мин', description: 'Интервал агрегации 1 минута.' },
  { value: '5m', label: '5 мин', description: 'Интервал агрегации 5 минут.' },
  { value: '15m', label: '15 мин', description: 'Интервал агрегации 15 минут.' },
  { value: '60m', label: '60 мин', description: 'Интервал агрегации 60 минут.' },
  {
    value: 'custom',
    label: 'пользовательский шаг',
    description: 'Задать произвольный интервал агрегации.',
  },
]

const loggingPolicyOptions: Option[] = [
  {
    value: 'aggregates',
    label: 'только агрегаты Default',
    description: 'Сохранять только итоговые показатели.',
  },
  {
    value: 'aggregates_with_queues',
    label: 'агрегаты + покадровые очереди',
    description: 'Добавить временные ряды длин очередей.',
  },
  {
    value: 'full',
    label: 'всё, включая события',
    description: 'Сохранять полные журналы событий.',
  },
  {
    value: 'disabled',
    label: 'отключить',
    description: 'Полностью отключить логирование.',
  },
]

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Выберите…',
  description,
  required,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  description?: string
  required?: boolean
  error?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)

  const selectedOption = options.find(option => option.value === value)

  const filteredOptions = useMemo(() => {
    const lowerSearch = search.toLowerCase()
    return options.filter(option => option.label.toLowerCase().includes(lowerSearch))
  }, [options, search])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setSearch('')
    }
  }, [isOpen])

  return (
    <label className="flex flex-col text-sm">
      <span className="flex items-center gap-1">
        {label}
        {required ? <span className="text-red-500">*</span> : null}
      </span>
      <div className="relative mt-1" ref={containerRef}>
        <button
          type="button"
          className={`w-full border rounded px-3 py-2 text-left flex items-center justify-between gap-2 ${
            error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
          }`}
          onClick={() => setIsOpen(prev => !prev)}
        >
          <span className={selectedOption ? '' : 'text-gray-400'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <span className="text-gray-400">▾</span>
        </button>
        {isOpen ? (
          <div className="absolute z-20 mt-1 w-full rounded border border-gray-200 bg-white shadow-lg">
            <div className="p-2 border-b">
              <input
                type="text"
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                placeholder="Поиск..."
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </div>
            <ul className="max-h-48 overflow-y-auto py-1 text-sm">
              {filteredOptions.length ? (
                filteredOptions.map(option => (
                  <li key={option.value}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(option.value)
                        setIsOpen(false)
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-blue-50 ${
                        option.value === value ? 'bg-blue-100' : ''
                      }`}
                    >
                      <div>{option.label}</div>
                      {option.description ? (
                        <div className="text-xs text-gray-500">{option.description}</div>
                      ) : null}
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-gray-500">Нет совпадений</li>
              )}
            </ul>
          </div>
        ) : null}
      </div>
      {description ? <span className="mt-1 text-xs text-gray-500">{description}</span> : null}
      {error ? <span className="mt-1 text-xs text-red-600">{error}</span> : null}
    </label>
  )
}

function MultiSelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Выберите…',
  description,
  required,
  error,
}: {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  options: Option[]
  placeholder?: string
  description?: string
  required?: boolean
  error?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)

  const filteredOptions = useMemo(() => {
    const lowerSearch = search.toLowerCase()
    return options.filter(option => option.label.toLowerCase().includes(lowerSearch))
  }, [options, search])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setSearch('')
    }
  }, [isOpen])

  const toggleValue = (optionValue: string) => {
    onChange(
      value.includes(optionValue)
        ? value.filter(item => item !== optionValue)
        : [...value, optionValue]
    )
  }

  const selectedLabels = value
    .map(item => options.find(option => option.value === item)?.label)
    .filter((item): item is string => Boolean(item))

  return (
    <label className="flex flex-col text-sm">
      <span className="flex items-center gap-1">
        {label}
        {required ? <span className="text-red-500">*</span> : null}
      </span>
      <div className="relative mt-1" ref={containerRef}>
        <button
          type="button"
          className={`w-full border rounded px-3 py-2 text-left flex items-center justify-between gap-2 ${
            error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
          }`}
          onClick={() => setIsOpen(prev => !prev)}
        >
          <span className={selectedLabels.length ? '' : 'text-gray-400'}>
            {selectedLabels.length ? selectedLabels.join(', ') : placeholder}
          </span>
          <span className="text-gray-400">▾</span>
        </button>
        {isOpen ? (
          <div className="absolute z-20 mt-1 w-full rounded border border-gray-200 bg-white shadow-lg">
            <div className="p-2 border-b">
              <input
                type="text"
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                placeholder="Поиск..."
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </div>
            <ul className="max-h-48 overflow-y-auto py-1 text-sm">
              {filteredOptions.length ? (
                filteredOptions.map(option => {
                  const isSelected = value.includes(option.value)
                  return (
                    <li key={option.value}>
                      <button
                        type="button"
                        onClick={() => toggleValue(option.value)}
                        className={`w-full px-3 py-2 text-left flex flex-col hover:bg-blue-50 ${
                          isSelected ? 'bg-blue-100' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex h-4 w-4 items-center justify-center rounded border text-xs ${
                              isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'
                            }`}
                          >
                            {isSelected ? '✓' : ''}
                          </span>
                          <span>{option.label}</span>
                        </div>
                        {option.description ? (
                          <div className="ml-6 text-xs text-gray-500">{option.description}</div>
                        ) : null}
                      </button>
                    </li>
                  )
                })
              ) : (
                <li className="px-3 py-2 text-gray-500">Нет совпадений</li>
              )}
            </ul>
          </div>
        ) : null}
      </div>
      {description ? <span className="mt-1 text-xs text-gray-500">{description}</span> : null}
      {error ? <span className="mt-1 text-xs text-red-600">{error}</span> : null}
    </label>
  )
}

function NumberInputField({
  label,
  value,
  onChange,
  required,
  placeholder,
  description,
  error,
  min,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
  description?: string
  error?: string
  min?: number
}) {
  return (
    <label className="flex flex-col text-sm">
      <span className="flex items-center gap-1">
        {label}
        {required ? <span className="text-red-500">*</span> : null}
      </span>
      <input
        type="number"
        min={min}
        className={`mt-1 border rounded px-3 py-2 ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
        }`}
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
      />
      {description ? <span className="mt-1 text-xs text-gray-500">{description}</span> : null}
      {error ? <span className="mt-1 text-xs text-red-600">{error}</span> : null}
    </label>
  )
}

function TextInputField({
  label,
  value,
  onChange,
  description,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  description?: string
  placeholder?: string
}) {
  return (
    <label className="flex flex-col text-sm">
      <span>{label}</span>
      <input
        type="text"
        className="mt-1 border border-gray-300 rounded px-3 py-2"
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
      />
      {description ? <span className="mt-1 text-xs text-gray-500">{description}</span> : null}
    </label>
  )
}

export default function GPSSModal({ onClose }: Props) {
  const dispatch = useAppDispatch()
  const { nodes, edges, model, gpss } = useAppSelector(state => state.network)
  const [formData, setFormData] = useState<FormData>(createDefaultGPSSConfig())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const isInitializedRef = useRef(false)
  const shouldSyncRef = useRef(false)

  useEffect(() => {
    if (!isInitializedRef.current) {
      setFormData(cloneGPSSConfig(gpss))
      isInitializedRef.current = true
    }
  }, [gpss])

  useEffect(() => {
    if (!isInitializedRef.current) return
    if (!shouldSyncRef.current) {
      shouldSyncRef.current = true
      return
    }
    dispatch(setGpssConfig(formData))
  }, [formData, dispatch])

  const updateField = <
    Section extends keyof FormData,
    Field extends keyof FormData[Section]
  >(
    section: Section,
    field: Field,
    value: FormData[Section][Field]
  ) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))
  }

  const handleDistributionChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      trafficCharacteristics: {
        ...prev.trafficCharacteristics,
        dataVolumeDistribution: value,
        dataVolumeParameters: createParametersForDistribution(
          value,
          prev.trafficCharacteristics.dataVolumeParameters
        ),
      },
    }))
  }

  const currentDistributionParameters = useMemo(
    () =>
      gpssDistributionParameters[
        formData.trafficCharacteristics.dataVolumeDistribution
      ] ?? [],
    [formData.trafficCharacteristics.dataVolumeDistribution]
  )

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.experimentControl.horizon) {
      newErrors['experimentControl.horizon'] = 'Укажите горизонт моделирования.'
    }

    if (!formData.experimentControl.timeUnit) {
      newErrors['experimentControl.timeUnit'] = 'Выберите единицу времени.'
    }

    if (!formData.trafficCharacteristics.mtu) {
      newErrors['trafficCharacteristics.mtu'] = 'Укажите MTU.'
    }

    if (!formData.trafficCharacteristics.dataVolumeDistribution) {
      newErrors['trafficCharacteristics.dataVolumeDistribution'] =
        'Выберите распределение объёма данных.'
    }

    currentDistributionParameters.forEach(parameter => {
      if (!formData.trafficCharacteristics.dataVolumeParameters[parameter.key]) {
        newErrors[`trafficCharacteristics.dataVolumeParameters.${parameter.key}`] =
          'Заполните параметр распределения.'
      }
    })

    setErrors(newErrors)
    return newErrors
  }

  const handleDownload = () => {
    const validationResult = validate()

    if (Object.keys(validationResult).length > 0) {
      return
    }

    dispatch(setGpssConfig(formData))

    const blob = new Blob(
      [
        JSON.stringify(
          {
            model,
            nodes,
            edges,
            gpss: formData,
          },
          null,
          2
        ),
      ],
      {
        type: 'application/json',
      }
    )
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
              <NumberInputField
                label="Горизонт моделирования (временной лимит)"
                required
                placeholder="В минутах"
                description="Установите временной лимит моделирования. Значение задаётся в минутах по умолчанию."
                value={formData.experimentControl.horizon}
                onChange={value =>
                  updateField('experimentControl', 'horizon', value)
                }
                error={errors['experimentControl.horizon']}
                min={0}
              />
              <SelectField
                label="Единица времени модели (мин/сек/час)"
                required
                value={formData.experimentControl.timeUnit}
                onChange={value =>
                  updateField('experimentControl', 'timeUnit', value)
                }
                options={timeUnitOptions}
                description="Определяет единицу времени, в которой задаются параметры модели."
                error={errors['experimentControl.timeUnit']}
              />
              <NumberInputField
                label="Число повторов (replications)"
                value={formData.experimentControl.replications}
                onChange={value =>
                  updateField('experimentControl', 'replications', value)
                }
                description="Количество независимых запусков модели для оценки статистики."
                placeholder="1"
                min={0}
              />
              <SelectField
                label="Политика прогрева"
                value={formData.experimentControl.warmUpPolicy}
                onChange={value =>
                  updateField('experimentControl', 'warmUpPolicy', value)
                }
                options={warmUpPolicyOptions}
                description="Выберите политику разгона модели перед сбором статистики."
              />
              <SelectField
                label="Сброс статистики после прогрева"
                value={formData.experimentControl.resetPolicy}
                onChange={value =>
                  updateField('experimentControl', 'resetPolicy', value)
                }
                options={resetPolicyOptions}
                description="Определяет, какие метрики сбрасываются после завершения прогрева."
              />
              <SelectField
                label="Условие останова по счётчику"
                value={formData.experimentControl.stopCondition}
                onChange={value =>
                  updateField('experimentControl', 'stopCondition', value)
                }
                options={stopConditionOptions}
                description="Задайте дополнительное условие остановки модели."
              />
              <SelectField
                label="Способ агрегации результатов"
                value={formData.experimentControl.aggregationMethod}
                onChange={value =>
                  updateField('experimentControl', 'aggregationMethod', value)
                }
                options={aggregationOptions}
                description="Определяет метод обобщения результатов множества прогонов."
              />
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Генераторы случайных чисел</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <NumberInputField
                label="Базовый seed эксперимента"
                value={formData.randomGenerators.baseSeed}
                onChange={value =>
                  updateField('randomGenerators', 'baseSeed', value)
                }
                description="Стартовое значение генератора случайных чисел."
                placeholder="Например, 12345"
              />
              <SelectField
                label="Режим seed"
                value={formData.randomGenerators.seedMode}
                onChange={value =>
                  updateField('randomGenerators', 'seedMode', value)
                }
                options={seedModeOptions}
                description="Определяет стратегию инициализации seed при репликациях."
              />
              <MultiSelectField
                label="Разделение потоков СВ по подсистемам"
                value={formData.randomGenerators.streamSeparation}
                onChange={value =>
                  updateField('randomGenerators', 'streamSeparation', value)
                }
                options={streamSeparationOptions}
                description="Выберите подсистемы, для которых требуется отдельный поток случайных чисел."
              />
              <SelectField
                label="Политика разделения"
                value={formData.randomGenerators.streamPolicy}
                onChange={value =>
                  updateField('randomGenerators', 'streamPolicy', value)
                }
                options={streamPolicyOptions}
                description="Определяет, делить ли seed по подсистемам или использовать общий."
              />
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Пакетизация и характеристики трафика</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <NumberInputField
                label="MTU (размер пакета, байт)"
                required
                value={formData.trafficCharacteristics.mtu}
                onChange={value =>
                  updateField('trafficCharacteristics', 'mtu', value)
                }
                description="Максимальный размер пакета. Значение по умолчанию — 65535 байт."
                placeholder="65535"
                error={errors['trafficCharacteristics.mtu']}
                min={0}
              />
              <SelectField
                label="Распределение объёма передаваемых данных"
                required
                value={formData.trafficCharacteristics.dataVolumeDistribution}
                onChange={handleDistributionChange}
                options={dataVolumeDistributionOptions}
                description="Тип распределения, определяющий объём данных в пакете."
                error={errors['trafficCharacteristics.dataVolumeDistribution']}
              />
              {currentDistributionParameters.map(parameter => (
                <NumberInputField
                  key={parameter.key}
                  label={parameter.label}
                  value={
                    formData.trafficCharacteristics.dataVolumeParameters[
                      parameter.key
                    ] ?? ''
                  }
                  onChange={value =>
                    updateField('trafficCharacteristics', 'dataVolumeParameters', {
                      ...formData.trafficCharacteristics.dataVolumeParameters,
                      [parameter.key]: value,
                    })
                  }
                  placeholder={parameter.placeholder}
                  description={parameter.description}
                  required
                  error={
                    errors[
                      `trafficCharacteristics.dataVolumeParameters.${parameter.key}`
                    ]
                  }
                />
              ))}
              <MultiSelectField
                label="Состав типов данных и глобальные доли"
                value={formData.trafficCharacteristics.dataTypesComposition}
                onChange={value =>
                  updateField('trafficCharacteristics', 'dataTypesComposition', value)
                }
                options={dataTypeOptions}
                description="Выберите глобальные типы данных, присутствующие в модели."
              />
              <SelectField
                label="Режим распределения долей типов данных"
                value={formData.trafficCharacteristics.dataTypeMixMode}
                onChange={value =>
                  updateField('trafficCharacteristics', 'dataTypeMixMode', value)
                }
                options={dataTypeMixOptions}
                description="Определяет, как рассчитываются глобальные доли типов данных."
              />
              <SelectField
                label="Глобальная политика округления числа пакетов"
                value={formData.trafficCharacteristics.roundingPolicy}
                onChange={value =>
                  updateField('trafficCharacteristics', 'roundingPolicy', value)
                }
                options={roundingPolicyOptions}
                description="Правило округления числа пакетов при расчётах."
              />
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Политики обслуживания по умолчанию</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField
                label="Базовое распределение времен обслуживания"
                value={formData.servicePolicies.serviceTimeDistribution}
                onChange={value =>
                  updateField('servicePolicies', 'serviceTimeDistribution', value)
                }
                options={serviceTimeOptions}
                description="Выберите распределение для базовых времен обслуживания ресурсов."
              />
              <SelectField
                label="Базовая дисциплина очереди и приоритеты"
                value={formData.servicePolicies.queueDiscipline}
                onChange={value =>
                  updateField('servicePolicies', 'queueDiscipline', value)
                }
                options={queueDisciplineOptions}
                description="Определяет механизм обслуживания в очередях по умолчанию."
              />
              <SelectField
                label="Глобальные верхние пределы длины очередей"
                value={formData.servicePolicies.queueLimits}
                onChange={value =>
                  updateField('servicePolicies', 'queueLimits', value)
                }
                options={queueLimitOptions}
                description="Выберите ограничение на длину очередей в модели."
              />
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Канальная модель</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <NumberInputField
                label="Глобальная скорость/пропускная способность по умолчанию"
                value={formData.channelModel.defaultThroughputValue}
                onChange={value =>
                  updateField('channelModel', 'defaultThroughputValue', value)
                }
                description="Числовое значение пропускной способности."
                placeholder="Например, 100"
                min={0}
              />
              <SelectField
                label="Единицы измерения пропускной способности"
                value={formData.channelModel.defaultThroughputUnit}
                onChange={value =>
                  updateField('channelModel', 'defaultThroughputUnit', value)
                }
                options={throughputUnitOptions}
                description="Выберите единицу измерения для указанной пропускной способности."
              />
              <SelectField
                label="Базовая формула задержки"
                value={formData.channelModel.delayFormula}
                onChange={value =>
                  updateField('channelModel', 'delayFormula', value)
                }
                options={delayFormulaOptions}
                description="Определяет основную формулу расчёта задержки в канале."
              />
              <SelectField
                label="Джиттер"
                value={formData.channelModel.jitterDistribution}
                onChange={value =>
                  updateField('channelModel', 'jitterDistribution', value)
                }
                options={jitterOptions}
                description="Выберите распределение вариативности задержки."
              />
              <SelectField
                label="Политика half/full-duplex и направление"
                value={formData.channelModel.duplexPolicy}
                onChange={value =>
                  updateField('channelModel', 'duplexPolicy', value)
                }
                options={duplexOptions}
                description="Режим работы канала по направлению передачи."
              />
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Сбор статистики и метрики</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <MultiSelectField
                label="Перечень собираемых метрик"
                value={formData.statisticsCollection.metrics}
                onChange={value =>
                  updateField('statisticsCollection', 'metrics', value)
                }
                options={metricsOptions}
                description="Выберите показатели, которые следует собирать во время моделирования."
              />
              <SelectField
                label="Интервалы/гранулярность агрегации"
                value={formData.statisticsCollection.aggregationGranularity}
                onChange={value =>
                  updateField('statisticsCollection', 'aggregationGranularity', value)
                }
                options={aggregationGranularityOptions}
                description="Определяет шаг агрегации метрик."
              />
              <TextInputField
                label="Имена/префиксы глобальных счётчиков"
                value={formData.statisticsCollection.counterPrefixes}
                onChange={value =>
                  updateField('statisticsCollection', 'counterPrefixes', value)
                }
                description="Необязательный текстовый префикс для глобальных счётчиков."
                placeholder="global_"
              />
              <SelectField
                label="Политика логирования"
                value={formData.statisticsCollection.loggingPolicy}
                onChange={value =>
                  updateField('statisticsCollection', 'loggingPolicy', value)
                }
                options={loggingPolicyOptions}
                description="Уровень детализации журналов моделирования."
              />
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
            МОДЕЛИРОВАТЬ
          </button>
        </div>
      </div>
    </div>
  )
}
