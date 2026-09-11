🤖 **Статистика за проекта:**
![Посещения](https://seeyoufarm.com)
![Клонирания](https://shields.io)



📈 eMobility EV Charging Platform  
Live: (self-hosted / private deployments)

Platform for managing and visualizing EV charging stations with routing, connector-level pricing, and integrations to public data sources and charging protocols.

Tech Stack: Angular 17 (standalone), TypeScript, Spring Boot 3 (Java 17), PostgreSQL, Docker, nginx API Gateway, mTLS, Node.js (Playwright Fines scraper)

Key Features:

📍 Interactive Map & List - filter by connector type (CCS, Type 2, CHAdeMO), minimum power, operator and country  
🗺️ Route Planning - custom from/to search, show only stations along the route, persistent route state in the UI  
🔌 Connector-Level Details - per-connector type, power (kW), price, and grouping by equipment/station on the same location  
📥 Data Imports - bulk import of stations from Open Charge Map and Fines with automatic connector extraction from popups  
💸 Price Enrichment - optional integration with external price providers plus per-location default pricing overrides  
⚡ Charging Protocol Integrations - OCPP WebSocket endpoint, ISO 15118 Plug & Charge hook, Tesla API integration points  
🧩 Microservices Architecture - separate station-management and charging-sessions services on PostgreSQL  
🛡️ Secure Infrastructure - mTLS between services, nginx API gateway, Docker & Docker Compose setup  
📊 Admin Tools - import jobs, country-level stats, price enrichment status and manual station management

💼 Available For:

✅ Self-hosting - full EV charging platform for operators, fleets, and internal tools  
✅ Custom Development - additional filters, UI/UX changes, and new integrations to operators/maps  
✅ API Integration - embed station, connector, and pricing data into your applications  
✅ Consulting - architecture, deployment and integration with existing charging infrastructure  

📬 Interested? Contact me to discuss how eMobility EV Charging Platform can support your EV charging operations.

## Tech Stack

- **Backend**: Java 17, Spring Boot 3, PostgreSQL
- **Frontend**: Angular 17, TypeScript
- **Infrastructure**: Docker, Docker Compose
- **Security**: mTLS (mutual TLS), Spring Security, nginx API Gateway
- **Integrations**: Open Charge Map API, OCPP (WebSocket), ISO 15118 Plug & Charge, Tesla API

## Services

| Service | Port | Description |
|---------|------|-------------|
| station-management | 8082 | Charging stations CRUD, locations |
| charging-sessions | 8081 | Start/stop sessions, history |
| postgres | 5432 | Database |

## Quick Start

### 1. Setup mTLS Certificates

```bash
cd ev-charging-platform
./scripts/setup-mtls.sh
```

This generates all required SSL/TLS certificates for mTLS communication.

### 2. Run with Docker Compose

```bash
# Build Angular frontend first
cd frontend && npm install && ng build --configuration production && cd ..

# Start all services
docker-compose up -d
```

- **API Gateway**: https://localhost:8443 (HTTPS with mTLS)
- **Stations API**: https://localhost:8082/api/stations (direct, requires client cert)
- **Sessions API**: https://localhost:8081/api/sessions (direct, requires client cert)
- **Swagger**: https://localhost:8082/swagger-ui.html

**Note**: For detailed mTLS setup instructions, see [MTLS_SETUP.md](./MTLS_SETUP.md)

### 2. Run Frontend (dev)

```bash
cd frontend
npm install
ng serve
```

Open http://localhost:4200

### 3. Run Backend Locally (without Docker)

Create DB:
```bash
createdb ev_charging
```

Run services:
```bash
# Terminal 1 - Station Management
cd services/station-management && mvn spring-boot:run

# Terminal 2 - Charging Sessions
cd services/charging-sessions && mvn spring-boot:run
```

## API Endpoints

### Station Management (8082)
- `GET /api/stations` - List all stations
- `GET /api/stations?city=Munich` - Filter by city
- `GET /api/stations/{id}` - Get station by ID
- `GET /api/stations/stats` - Get station statistics
- `POST /api/stations/import/{countryCode}` - Import stations from Open Charge Map (e.g., `/import/bg`)
- `GET /api/stations/import/status/{jobId}` - Get import job status
- `GET /api/stations/openchargemap/nearby` - Fetch nearby stations from Open Charge Map
- `GET /api/stations/openchargemap/country/{code}` - Fetch stations by country
- `GET /api/integrations/tesla/vehicles` - Get Tesla vehicles (requires OAuth token)
- `POST /api/integrations/iso15118/authenticate` - ISO 15118 Plug & Charge authentication

### OCPP WebSocket
- `ws://localhost:8082/ocpp/{chargePointId}` - OCPP protocol endpoint for charge points

### Charging Sessions (8081)
- `POST /api/sessions/start` - Start session `{"userId":"u1","chargingPointId":1}`
- `POST /api/sessions/{id}/stop` - Stop session
- `GET /api/sessions/user/{userId}` - User session history

## Project Structure

```
ev-charging-platform/
├── services/
│   ├── charging-sessions/   # Sessions microservice
│   └── station-management/  # Stations microservice
├── frontend/                # Angular driver portal
├── docker-compose.yml
└── README.md
```

## License

MIT
