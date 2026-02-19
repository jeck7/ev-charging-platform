# External Integrations Guide

Това ръководство описва всички интегрирани външни API-та и протоколи в EV Charging Platform.

## 1. Open Charge Map API

### Описание
Интеграция с Open Charge Map за получаване на данни за charging stations по света.

### Endpoints

#### GET /api/stations/openchargemap/nearby
Получаване на станции близо до локация.

**Parameters:**
- `latitude` (required) - Географска ширина
- `longitude` (required) - Географска дължина  
- `distance` (optional, default: 10) - Разстояние в км

**Example:**
```bash
curl "https://localhost:8082/api/stations/openchargemap/nearby?latitude=42.6977&longitude=23.3219&distance=20"
```

#### GET /api/stations/openchargemap/country/{countryCode}
Получаване на станции по държава.

**Example:**
```bash
curl "https://localhost:8082/api/stations/openchargemap/country/BG"
```

### Документация
- API: https://openchargemap.org/site/develop/api
- Безплатен достъп, не изисква API key

---

## 2. OCPP (Open Charge Point Protocol)

### Описание
WebSocket сървър за комуникация с Charge Points (charging stations).

### WebSocket Endpoint
```
ws://localhost:8082/ocpp/{chargePointId}
```

### Поддържани OCPP Actions

#### Charge Point → Central System:
- **BootNotification** - При свързване на charge point
- **StatusNotification** - Статус на connectors
- **MeterValues** - Стойности на метри
- **StartTransaction** - Започване на charging session
- **StopTransaction** - Приключване на charging session
- **Heartbeat** - Периодичен ping

#### Central System → Charge Point:
- **RemoteStartTransaction** - Команда за стартиране на charging
- **RemoteStopTransaction** - Команда за спиране на charging

### Примерна OCPP Сообщение

**BootNotification (Charge Point → System):**
```json
[2, "unique-id", "BootNotification", {
  "chargePointVendor": "Tesla",
  "chargePointModel": "Supercharger V3",
  "firmwareVersion": "1.0.0"
}]
```

**Response (System → Charge Point):**
```json
[3, "unique-id", {
  "status": "Accepted",
  "currentTime": "2026-02-19T12:00:00Z",
  "interval": 300
}]
```

### Тестване
Използвайте WebSocket клиент или OCPP симулатор:
- https://github.com/steve-community/ocpp

### Документация
- https://www.openchargealliance.org/
- OCPP 1.6/2.0 спецификация

---

## 3. ISO 15118 Plug & Charge

### Описание
Certificate-based authentication за автоматично автентициране и плащане при свързване на EV към charging station.

### Endpoint

#### POST /api/integrations/iso15118/authenticate
Автентициране на vehicle чрез certificate.

**Request Body:**
```json
{
  "vehicleCertificate": "base64-encoded-cert",
  "contractCertificate": "base64-encoded-cert (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "vehicleId": "vehicle-123",
  "hasContract": true
}
```

### Как работи:
1. Vehicle се свързва към charging station
2. Station изисква vehicle certificate
3. Vehicle изпраща certificate (и contract certificate ако има)
4. Station валидира certificate срещу V2G Root CA
5. Ако валидацията е успешна, charging започва автоматично

### Документация
- ISO 15118 стандарт: https://www.iso.org/standard/55366.html
- V2G Root CA: https://www.v2g-root-ca.org/

---

## 4. Tesla API

### Описание
Интеграция с Tesla API за управление на Tesla vehicles и monitoring на charging статус.

### Автентификация
Tesla API използва OAuth 2.0. За да използвате API-то:

1. Регистрирайте приложение в Tesla Developer Portal
2. Получете `client_id` и `client_secret`
3. Конфигурирайте в `application.properties`:
```properties
tesla.client.id=your-client-id
tesla.client.secret=your-client-secret
```

### Endpoints

#### GET /api/integrations/tesla/vehicles
Получаване на списък с Tesla vehicles за потребителя.

**Headers:**
- `X-Tesla-Access-Token` - OAuth access token

**Example:**
```bash
curl -H "X-Tesla-Access-Token: your-token" \
     https://localhost:8082/api/integrations/tesla/vehicles
```

#### GET /api/integrations/tesla/vehicles/{vehicleId}/charging
Получаване на charging статус на vehicle.

**Response:**
```json
{
  "chargingState": "Charging",
  "batteryLevel": 75,
  "chargeRate": 11.5,
  "timeToFullCharge": 2.5
}
```

#### POST /api/integrations/tesla/vehicles/{vehicleId}/charging/start
Стартиране на charging за Tesla vehicle.

#### POST /api/integrations/tesla/vehicles/{vehicleId}/charging/stop
Спиране на charging за Tesla vehicle.

### Документация
- Tesla API: https://tesla-api.timdorr.com/
- Tesla Developer Portal: https://developer.tesla.com/

---

## Архитектура на Интеграциите

```
┌─────────────────┐
│   EV Vehicle    │
│  (Tesla, etc)   │
└────────┬────────┘
         │ ISO 15118 / OCPP
         ▼
┌─────────────────┐      ┌──────────────────┐
│ Charging Station│◄────►│  Central System   │
│   (OCPP CP)     │      │  (This Platform) │
└─────────────────┘      └────────┬──────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
            ┌─────────────┐ ┌──────────┐ ┌──────────┐
            │Open Charge  │ │  Tesla   │ │   OCPP   │
            │    Map      │ │   API    │ │ WebSocket│
            └─────────────┘ └──────────┘ └──────────┘
```

## Следващи Стъпки

1. **Open Charge Map**: Вече интегрирано ✅
2. **OCPP**: WebSocket сървър готов ✅
3. **ISO 15118**: Базова структура готова ✅
4. **Tesla API**: REST клиент готов ✅

### За Production:

1. **OCPP**: 
   - Добавете пълна OCPP 2.0.1 имплементация
   - Интегрирайте с charging-sessions service
   - Добавете database за charge points

2. **ISO 15118**:
   - Интегрирайте V2G Root CA validation
   - Добавете contract certificate management
   - Имплементирайте пълния ISO 15118 handshake

3. **Tesla API**:
   - Добавете OAuth token refresh
   - Кеширайте vehicle data
   - Добавете error handling и retry logic

4. **Open Charge Map**:
   - Добавете синхронизация на данни в локална база
   - Кеширайте заявки
   - Добавете rate limiting
