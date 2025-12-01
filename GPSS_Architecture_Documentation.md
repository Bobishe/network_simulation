# Документация: Архитектура GPSS-модели спутниковой сети

## Оглавление
1. [Введение](#введение)
2. [Логика построения GPSS-модели](#логика-построения-gpss-модели)
3. [Структура блоков по типам узлов](#структура-блоков-по-типам-узлов)
4. [Глобальные настройки модели](#глобальные-настройки-модели)
5. [Маршрутизация и терминалы](#маршрутизация-и-терминалы)
6. [Соответствие JSON ↔ GPSS](#соответствие-json--gpss)
7. [Алгоритм генерации кода](#алгоритм-генерации-кода)

---

## Введение

Данный документ описывает архитектуру GPSS (General Purpose Simulation System) модели для симуляции спутниковой сети массового обслуживания. Модель включает следующие типы узлов:

- **AS** (Абонентская Станция) — генератор трафика от абонентов
- **SC** (Satellite/Spacecraft) — КА (космический аппарат) с обработкой на борту
- **HAPS** (High Altitude Platform Station) — высотная платформа с обработкой
- **ES** (Earth Station) — земная станция
- **SSOP** (ССОП) — система связи и обработки данных (терминальный узел)

---

## Логика построения GPSS-модели

### Концептуальная модель

Модель представляет собой **сеть массового обслуживания**, где:
- **Транзакты** — пакеты данных, движущиеся по сети
- **Узлы** — устройства с очередями и обработкой
- **Каналы** — связи между узлами

### Основные принципы архитектуры

1. **Детерминированная нотация имён**
   - Каждый блок, переменная, очередь имеют уникальное имя по шаблону
   - Формат: `<действие>_<тип_узла><номер>` (например, `in_int1_SC`, `processing_HAPS`)

2. **Модульная структура узла**
   ```
   Узел = Входные интерфейсы + Блок обработки + Выходные интерфейсы
   ```

3. **Разделение направлений данных**
   - `type_data = 1` — данные типа 1 (например, от AS к SSOP)
   - `type_data = 2` — данные типа 2 (например, от SSOP к AS)

4. **Стратегия обработки потерь**
   - При переполнении буфера транзакт терминируется
   - Счётчики потерь: `loss_<место>_<узел>` (например, `loss_in_int1_SC`)

---

## Структура блоков по типам узлов

### 1. Генератор трафика (AS)

#### Назначение
Генерирует транзакты, имитирующие трафик от абонентов.

#### Блоки GPSS

```gpss
; === ПАРАМЕТРЫ ===
la_gen_AS EQU 10  ; интенсивность генерации (λ)

; === ГЕНЕРАЦИЯ ===
GENERATE (Exponential(1,0,1/la_gen_AS))
assign cap_data_AS,(V$capacity)              ; объём данных из глобальной переменной
SPLIT (P$cap_data_AS/65535)                  ; разбиение на пакеты (MTU = 65535 байт)
ASSIGN type_data,1                            ; тип данных = 1
TRANSFER ,in_int1_SC                          ; переход к входному интерфейсу SC

; === ТЕРМИНАЛ ===
to_AS TERMINATE
```

#### JSON-соответствие
```json
{
  "nodeType": "AS",
  "generator": {
    "lambda": 10,                    // → la_gen_AS
    "typeData": 1,                   // → ASSIGN type_data,1
    "capacitySource": "capacity",    // → V$capacity
    "target": {
      "nodeId": "SC1",               // → TRANSFER ,in_int1_SC
      "inPortIdx": 1
    }
  }
}
```

---

### 2. Узел с обработкой (SC / HAPS / ES)

Узлы SC, HAPS и ES имеют идентичную структуру, различаются только префиксы.

#### Общая структура

```
┌─────────────────────────────────────────────┐
│              Узел обработки                  │
├─────────────────────────────────────────────┤
│  Входные интерфейсы (N штук)                │
│    ├─ in_int1: TEST → QUEUE → SEIZE →       │
│    │             DEPART → ADVANCE → RELEASE │
│    └─ in_int2: ...                          │
│                     ↓                        │
│  Блок обработки (processing)                │
│    ├─ TEST → QUEUE → ENTER → DEPART →       │
│    │   ADVANCE → LEAVE                       │
│    └─ Маршрутизация по type_data            │
│                     ↓                        │
│  Выходные интерфейсы (M штук)               │
│    ├─ out_int1: TEST → QUEUE → SEIZE →      │
│    │              DEPART → ADVANCE → RELEASE│
│    └─ out_int2: ...                         │
└─────────────────────────────────────────────┘
```

#### Параметры узла

```gpss
; === ВХОДНЫЕ ИНТЕРФЕЙСЫ ===
q_in_int1_SC EQU 20        ; размер буфера входного интерфейса 1
mu_in_int1_SC EQU 10       ; интенсивность обслуживания (μ)

; === БЛОК ОБРАБОТКИ ===
service_SC STORAGE 3       ; количество серверов (STORAGE)
q_SC EQU 20                ; размер буфера обработки
mu_SC EQU 3                ; интенсивность обработки

; === ВЫХОДНЫЕ ИНТЕРФЕЙСЫ ===
q_out_int1_SC EQU 20       ; размер буфера выходного интерфейса
mu_out_int1_SC EQU 9       ; интенсивность обслуживания
```

#### Входной интерфейс

```gpss
in_int1_SC ASSIGN number_in_int_SC,1                      ; метка порта
    TEST L Q$queue_in_int1_SC,q_in_int1_SC,loss_in_int1_SC ; проверка буфера
    QUEUE queue_in_int1_SC                                 ; постановка в очередь
    SEIZE service_in_int1_SC                               ; захват ресурса
    DEPART queue_in_int1_SC                                ; выход из очереди
    ADVANCE (Exponential(1,0,1/mu_in_int1_SC))            ; время обслуживания
    RELEASE service_in_int1_SC                             ; освобождение ресурса
    TRANSFER ,processing_SC                                ; переход к обработке

loss_in_int1_SC SAVEVALUE loss_in_int1_SC_+,1             ; счётчик потерь
    TERMINATE
```

#### JSON-соответствие

```json
{
  "interfaces": [
    {
      "id": "iface-abc123",
      "direction": "in",               // → входной интерфейс
      "idx": 1,                        // → number_in_int_SC = 1
      "edgeId": "edge-xyz",
      "queue": {
        "q_in": 20                     // → q_in_int1_SC EQU 20
      },
      "service": {
        "mu_in": 10,                   // → mu_in_int1_SC EQU 10
        "servers_in": 1,               // → SEIZE/RELEASE (FACILITY)
        "dist_in": "Exponential"       // → Exponential(1,0,1/mu)
      },
      "resourceType": "FACILITY",      // → SEIZE/RELEASE
      "queueCapacity": 20,             // → TEST L Q$queue...,20
      "serviceRate": 10                // → 1/mu_in_int1_SC
    }
  ]
}
```

#### Блок обработки (processing)

```gpss
processing_SC TEST L Q$queue_SC,q_SC,loss_SC              ; проверка буфера
    QUEUE queue_SC                                         ; постановка в очередь
    ENTER service_SC,1                                     ; захват 1 сервера (STORAGE)
    DEPART queue_SC
    ADVANCE (Exponential(1,0,1/mu_SC))                    ; обработка
    LEAVE service_SC,1                                     ; освобождение сервера
    TEST E P$type_data,1,TEST_SC_2                        ; маршрутизация
TEST_SC_1 TRANSFER ,out_int1_SC                           ; type_data == 1
TEST_SC_2 TRANSFER ,out_int2_SC                           ; type_data != 1

loss_SC SAVEVALUE loss_SC_+,1
    TERMINATE
```

#### JSON-соответствие

```json
{
  "processing": {
    "serviceLines": 3,              // → service_SC STORAGE 3
    "queue": 20,                    // → q_SC EQU 20
    "mu": 3,                        // → mu_SC EQU 3
    "dist": "Exponential",          // → Exponential(...)
    "routingTable": [               // → TEST E P$type_data,X,TEST_SC_Y
      { "type": 1, "outPort": 1 },  // type_data=1 → out_int1
      { "type": 2, "outPort": 2 }   // type_data=2 → out_int2
    ]
  }
}
```

#### Выходной интерфейс

```gpss
out_int1_SC ASSIGN number_out_int_SC,1
    TEST L Q$queue_out_int1_SC,q_out_int1_SC,loss_out_int1_SC
    QUEUE queue_out_int1_SC
    SEIZE service_out_int1_SC
    DEPART queue_out_int1_SC
    ADVANCE (Exponential(1,0,1/mu_out_int1_SC))
    RELEASE service_out_int1_SC
    TRANSFER ,in_int1_HAPS                                ; переход к следующему узлу

loss_out_int1_SC SAVEVALUE loss_out_int1_SC_+,1
    TERMINATE
```

#### JSON-соответствие

```json
{
  "interfaces": [
    {
      "direction": "out",
      "idx": 1,
      "queue": { "q_out": 20 },      // → q_out_int1_SC
      "service": {
        "mu_out": 9,                 // → mu_out_int1_SC
        "servers_out": 1,
        "dist_out": "Exponential"
      },
      "nextHop": {
        "nodeId": "HAPS1",           // → TRANSFER ,in_int1_HAPS
        "inPortIdx": 1
      }
    }
  ]
}
```

---

### 3. Терминальный узел (SSOP)

#### Назначение
- Генерирует обратный трафик (`type_data = 2`)
- Принимает входящий трафик (`to_SSOP TERMINATE`)

#### Блоки GPSS

```gpss
; === ПАРАМЕТРЫ ===
la_gen_SSOP EQU 10

; === ТЕРМИНАЛ ВХОДЯЩЕГО ТРАФИКА ===
to_SSOP TERMINATE

; === ГЕНЕРАЦИЯ ОБРАТНОГО ТРАФИКА ===
GENERATE (Exponential(1,0,1/la_gen_SSOP))
assign cap_data_SSOP,(V$capacity)
SPLIT (P$cap_data_SSOP/65535)
ASSIGN type_data,2                           ; обратное направление
TRANSFER ,in_int2_ES                         ; к земной станции
```

#### JSON-соответствие

```json
{
  "nodeType": "SSOP",
  "generator": {
    "lambda": 10,
    "typeData": 2,                    // → ASSIGN type_data,2
    "target": {
      "nodeId": "ES1",
      "inPortIdx": 2
    }
  }
}
```

---

## Глобальные настройки модели

### Переменная объёма данных

```gpss
capacity variable (uniform(1,100,15000000))
```

#### JSON-соответствие

```json
{
  "model": {
    "traffic": {
      "capacity": {
        "dist": "uniform",           // → uniform(...)
        "params": {
          "min": 1,                  // → первый параметр
          "max": 100,                // → второй параметр
          "seed": 15000000           // → третий параметр (seed)
        }
      }
    },
    "packet": {
      "mtu": 65535                   // → SPLIT (P$/65535)
    }
  }
}
```

### Время моделирования

```gpss
GENERATE 1440
TERMINATE 1
START 1
```

#### JSON-соответствие

```json
{
  "model": {
    "sim": {
      "duration": 1440               // → GENERATE 1440
    },
    "time": {
      "unit": "minutes"              // неявно из контекста
    }
  }
}
```

---

## Маршрутизация и терминалы

### Типы назначений в TRANSFER

1. **К входному интерфейсу узла**
   ```gpss
   TRANSFER ,in_int1_HAPS
   ```
   ```json
   {
     "nextHop": {
       "nodeId": "HAPS1",
       "inPortIdx": 1
     }
   }
   ```

2. **К терминалу**
   ```gpss
   TRANSFER ,to_AS
   ```
   ```json
   {
     "nextHop": {
       "terminal": "to_AS"
     }
   }
   ```

### Таблица маршрутизации

В блоке `processing` используется схема:

```gpss
TEST E P$type_data,1,TEST_SC_2    ; если type_data == 1, продолжить
TEST_SC_1 TRANSFER ,out_int1_SC   ; иначе перейти к TEST_SC_2
TEST_SC_2 TRANSFER ,out_int2_SC   ; направление для type_data != 1
```

#### JSON-соответствие

```json
{
  "processing": {
    "routingTable": [
      { "type": 1, "outPort": 1 },   // TEST E P$type_data,1 → out_int1
      { "type": 2, "outPort": 2 }    // иначе → out_int2
    ]
  }
}
```

---

## Соответствие JSON ↔ GPSS

### Полная карта соответствий

| JSON Path | GPSS Элемент | Описание |
|-----------|--------------|----------|
| `nodes[].nodeType` | Префикс блоков (`SC`, `HAPS`, `ES`) | Тип узла |
| `nodes[].code` | Суффикс блоков (`SC1`, `HAPS2`) | Номер экземпляра |
| `nodes[].generator.lambda` | `la_gen_AS EQU X` | Интенсивность генерации |
| `nodes[].generator.typeData` | `ASSIGN type_data,X` | Тип данных |
| `nodes[].generator.target.nodeId` | `TRANSFER ,in_intX_Y` | Следующий узел |
| `nodes[].processing.serviceLines` | `service_X STORAGE N` | Количество серверов |
| `nodes[].processing.queue` | `q_X EQU N` | Размер буфера обработки |
| `nodes[].processing.mu` | `mu_X EQU N` | Интенсивность обработки |
| `nodes[].processing.dist` | `(Exponential(...))` | Распределение времени обслуживания |
| `nodes[].processing.routingTable[].type` | `TEST E P$type_data,X` | Условие маршрутизации |
| `nodes[].processing.routingTable[].outPort` | `TRANSFER ,out_intN_X` | Выходной порт |
| `nodes[].interfaces[].direction` | `in_int` / `out_int` | Направление интерфейса |
| `nodes[].interfaces[].idx` | `in_int1`, `in_int2`, ... | Номер интерфейса |
| `nodes[].interfaces[].queue.q_in` | `q_in_int1_X EQU N` | Размер входного буфера |
| `nodes[].interfaces[].queue.q_out` | `q_out_int1_X EQU N` | Размер выходного буфера |
| `nodes[].interfaces[].service.mu_in` | `mu_in_int1_X EQU N` | μ входного интерфейса |
| `nodes[].interfaces[].service.mu_out` | `mu_out_int1_X EQU N` | μ выходного интерфейса |
| `nodes[].interfaces[].service.servers_in` | SEIZE/RELEASE (1) или ENTER/LEAVE (N) | Тип ресурса |
| `nodes[].interfaces[].service.dist_in` | `(Exponential(...))` | Распределение |
| `nodes[].interfaces[].resourceType` | FACILITY или STORAGE | Тип ресурса GPSS |
| `nodes[].interfaces[].resourceAmount` | STORAGE N или FACILITY (1) | Количество серверов |
| `nodes[].interfaces[].nextHop.nodeId` | `TRANSFER ,in_intX_Y` | Целевой узел |
| `nodes[].interfaces[].nextHop.inPortIdx` | `in_int1` / `in_int2` | Целевой порт |
| `nodes[].interfaces[].nextHop.terminal` | `TRANSFER ,to_AS` | Терминал |
| `edges[].bandwidth` | (для расчёта μ) | Пропускная способность |
| `edges[].propDelay` | (для расчёта μ) | Задержка распространения |
| `edges[].packetSize` | (для расчёта μ) | Размер пакета |
| `model.traffic.capacity.dist` | `capacity variable (uniform(...))` | Распределение объёма |
| `model.traffic.capacity.params` | Параметры распределения | min, max, seed |
| `model.packet.mtu` | `SPLIT (P$/65535)` | MTU пакета |
| `model.sim.duration` | `GENERATE 1440; TERMINATE 1` | Время моделирования |
| `model.time.unit` | Комментарии | Единица времени |
| `model.rng.seed` | seed в распределениях | Начальное значение ГСЧ |

---

## Алгоритм генерации кода

### Этап 1: Глобальные переменные

```javascript
// Генерация capacity variable
const dist = model.traffic.capacity.dist;
const params = model.traffic.capacity.params;
output += `capacity variable (${dist}(${Object.values(params).join(',')}))\n`;
```

### Этап 2: Генераторы трафика

Для каждого узла с `generator`:

```javascript
nodes.forEach(node => {
  if (!node.generator) return;
  
  const code = node.code || node.id;
  const lambda = node.generator.lambda;
  const typeData = node.generator.typeData;
  const target = node.generator.target;
  
  output += `
la_gen_${code} EQU ${lambda}

GENERATE (Exponential(1,0,1/la_gen_${code}))
assign cap_data_${code},(V$capacity)
SPLIT (P$cap_data_${code}/${model.packet.mtu})
ASSIGN type_data,${typeData}
TRANSFER ,${getTargetLabel(target)}
`;
});
```

### Этап 3: Узлы с обработкой

Для каждого узла типа SC/HAPS/ES:

```javascript
nodes.forEach(node => {
  if (!hasProcessing(node.nodeType)) return;
  
  const code = node.code;
  const proc = node.processing;
  const interfaces = node.interfaces;
  
  // 1. Параметры интерфейсов
  interfaces.filter(i => i.direction === 'in').forEach((iface, idx) => {
    const num = idx + 1;
    output += `q_in_int${num}_${code} EQU ${iface.queue.q_in}\n`;
    output += `mu_in_int${num}_${code} EQU ${iface.service.mu_in}\n`;
  });
  
  // 2. Параметры обработки
  output += `service_${code} STORAGE ${proc.serviceLines}\n`;
  output += `q_${code} EQU ${proc.queue}\n`;
  output += `mu_${code} EQU ${proc.mu}\n`;
  
  // 3. Параметры выходных интерфейсов
  interfaces.filter(i => i.direction === 'out').forEach((iface, idx) => {
    const num = idx + 1;
    output += `q_out_int${num}_${code} EQU ${iface.queue.q_out}\n`;
    output += `mu_out_int${num}_${code} EQU ${iface.service.mu_out}\n`;
  });
  
  // 4. Входные интерфейсы
  interfaces.filter(i => i.direction === 'in').forEach((iface, idx) => {
    const num = idx + 1;
    output += generateInputInterface(code, num, iface);
  });
  
  // 5. Блок обработки
  output += generateProcessing(code, proc);
  
  // 6. Выходные интерфейсы
  interfaces.filter(i => i.direction === 'out').forEach((iface, idx) => {
    const num = idx + 1;
    output += generateOutputInterface(code, num, iface);
  });
});
```

### Этап 4: Терминалы

```javascript
// Для AS
output += `to_AS TERMINATE\n`;

// Для SSOP
output += `to_SSOP TERMINATE\n`;
```

### Этап 5: Управление симуляцией

```javascript
output += `
GENERATE ${model.sim.duration}
TERMINATE 1
START 1
`;
```

### Вспомогательные функции

```javascript
function generateInputInterface(code, num, iface) {
  const dist = iface.service.dist_in || 'Exponential';
  const mu = iface.service.mu_in;
  const resourceType = iface.resourceType === 'STORAGE' ? 'ENTER/LEAVE' : 'SEIZE/RELEASE';
  
  return `
in_int${num}_${code} ASSIGN number_in_int_${code},${num}
  TEST L Q$queue_in_int${num}_${code},q_in_int${num}_${code},loss_in_int${num}_${code}
  QUEUE queue_in_int${num}_${code}
  ${resourceType === 'SEIZE/RELEASE' ? 'SEIZE' : 'ENTER'} service_in_int${num}_${code}${resourceType === 'ENTER/LEAVE' ? ',1' : ''}
  DEPART queue_in_int${num}_${code}
  ADVANCE (${dist}(1,0,1/${mu}))
  ${resourceType === 'SEIZE/RELEASE' ? 'RELEASE' : 'LEAVE'} service_in_int${num}_${code}${resourceType === 'ENTER/LEAVE' ? ',1' : ''}
  TRANSFER ,processing_${code}

loss_in_int${num}_${code} SAVEVALUE loss_in_int${num}_${code}_+,1
  TERMINATE
`;
}

function generateProcessing(code, proc) {
  const routing = proc.routingTable;
  let tests = '';
  
  routing.forEach((rule, idx) => {
    const label = idx === 0 ? '' : `TEST_${code}_${idx}`;
    const nextLabel = idx < routing.length - 1 ? `TEST_${code}_${idx + 1}` : '';
    
    if (idx === 0) {
      tests += `  TEST E P$type_data,${rule.type},${nextLabel}\n`;
      tests += `TEST_${code}_1 TRANSFER ,out_int${rule.outPort}_${code}\n`;
    } else {
      tests += `${label} TRANSFER ,out_int${rule.outPort}_${code}\n`;
    }
  });
  
  return `
processing_${code} TEST L Q$queue_${code},q_${code},loss_${code}
  QUEUE queue_${code}
  ENTER service_${code},1
  DEPART queue_${code}
  ADVANCE (${proc.dist}(1,0,1/${proc.mu}))
  LEAVE service_${code},1
${tests}
loss_${code} SAVEVALUE loss_${code}_+,1
  TERMINATE
`;
}

function generateOutputInterface(code, num, iface) {
  const nextHop = iface.nextHop;
  const target = nextHop.terminal 
    ? nextHop.terminal 
    : `in_int${nextHop.inPortIdx}_${getNodeCode(nextHop.nodeId)}`;
  
  return `
out_int${num}_${code} ASSIGN number_out_int_${code},${num}
  TEST L Q$queue_out_int${num}_${code},q_out_int${num}_${code},loss_out_int${num}_${code}
  QUEUE queue_out_int${num}_${code}
  SEIZE service_out_int${num}_${code}
  DEPART queue_out_int${num}_${code}
  ADVANCE (Exponential(1,0,1/mu_out_int${num}_${code}))
  RELEASE service_out_int${num}_${code}
  TRANSFER ,${target}

loss_out_int${num}_${code} SAVEVALUE loss_out_int${num}_${code}_+,1
  TERMINATE
`;
}
```

---

## Примеры трансформации

### Пример 1: Простой узел SC

#### JSON

```json
{
  "id": "sc1",
  "nodeType": "SC",
  "code": "SC1",
  "processing": {
    "serviceLines": 3,
    "queue": 20,
    "mu": 3,
    "dist": "Exponential",
    "routingTable": [
      { "type": 1, "outPort": 1 },
      { "type": 2, "outPort": 2 }
    ]
  },
  "interfaces": [
    {
      "direction": "in",
      "idx": 1,
      "queue": { "q_in": 20 },
      "service": { "mu_in": 10, "servers_in": 1, "dist_in": "Exponential" },
      "resourceType": "FACILITY"
    },
    {
      "direction": "out",
      "idx": 1,
      "queue": { "q_out": 20 },
      "service": { "mu_out": 9, "servers_out": 1, "dist_out": "Exponential" },
      "resourceType": "FACILITY",
      "nextHop": { "nodeId": "haps1", "inPortIdx": 1 }
    }
  ]
}
```

#### GPSS

```gpss
; Параметры
q_in_int1_SC1 EQU 20
mu_in_int1_SC1 EQU 10
service_SC1 STORAGE 3
q_SC1 EQU 20
mu_SC1 EQU 3
q_out_int1_SC1 EQU 20
mu_out_int1_SC1 EQU 9

; Входной интерфейс
in_int1_SC1 ASSIGN number_in_int_SC1,1
  TEST L Q$queue_in_int1_SC1,q_in_int1_SC1,loss_in_int1_SC1
  QUEUE queue_in_int1_SC1
  SEIZE service_in_int1_SC1
  DEPART queue_in_int1_SC1
  ADVANCE (Exponential(1,0,1/mu_in_int1_SC1))
  RELEASE service_in_int1_SC1
  TRANSFER ,processing_SC1

loss_in_int1_SC1 SAVEVALUE loss_in_int1_SC1_+,1
  TERMINATE

; Обработка
processing_SC1 TEST L Q$queue_SC1,q_SC1,loss_SC1
  QUEUE queue_SC1
  ENTER service_SC1,1
  DEPART queue_SC1
  ADVANCE (Exponential(1,0,1/mu_SC1))
  LEAVE service_SC1,1
  TEST E P$type_data,1,TEST_SC1_2
TEST_SC1_1 TRANSFER ,out_int1_SC1
TEST_SC1_2 TRANSFER ,out_int2_SC1

loss_SC1 SAVEVALUE loss_SC1_+,1
  TERMINATE

; Выходной интерфейс
out_int1_SC1 ASSIGN number_out_int_SC1,1
  TEST L Q$queue_out_int1_SC1,q_out_int1_SC1,loss_out_int1_SC1
  QUEUE queue_out_int1_SC1
  SEIZE service_out_int1_SC1
  DEPART queue_out_int1_SC1
  ADVANCE (Exponential(1,0,1/mu_out_int1_SC1))
  RELEASE service_out_int1_SC1
  TRANSFER ,in_int1_HAPS1

loss_out_int1_SC1 SAVEVALUE loss_out_int1_SC1_+,1
  TERMINATE
```

---

## Особенности и ограничения

### 1. Нумерация интерфейсов
- Интерфейсы нумеруются с 1 (не с 0)
- Каждый интерфейс имеет уникальный индекс в пределах направления

### 2. Типы ресурсов
- **FACILITY** (SEIZE/RELEASE) — для одного сервера
- **STORAGE** (ENTER/LEAVE) — для нескольких серверов

### 3. Распределения
- По умолчанию: `Exponential(1,0,1/μ)`
- Поддержка других: Uniform, Normal, Erlang и т.д.

### 4. Счётчики потерь
- Каждый буфер имеет счётчик потерь
- Формат: `loss_<место>_<узел>_+,1`

### 5. Маршрутизация
- Основана на `type_data` (тип данных)
- Реализуется через цепочку TEST блоков

---

## Заключение

Данная архитектура обеспечивает:
- **Детерминированную генерацию кода** из JSON-топологии
- **Модульность** — каждый узел независим
- **Масштабируемость** — легко добавлять новые узлы и интерфейсы
- **Отслеживание потерь** — счётчики на каждом этапе
- **Гибкую маршрутизацию** — поддержка различных типов данных

Генератор GPSS-кода должен следовать описанным выше правилам для обеспечения корректной трансформации JSON → GPSS.
