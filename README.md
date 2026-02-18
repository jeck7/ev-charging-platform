# eMobility EV Charging Platform

EV charging services platform – microservices backend (Java/Spring Boot) and Angular driver portal.

## Tech Stack

- **Backend**: Java 17, Spring Boot 3, PostgreSQL
- **Frontend**: Angular 17, TypeScript
- **Infrastructure**: Docker, Docker Compose
- **Security**: mTLS (mutual TLS), Spring Security, nginx API Gateway

## Services

| Service | Port | Description |
|---------|------|-------------|
| station-management | 8082 | Charging stations CRUD, locations |
| charging-sessions | 8081 | Start/stop sessions, history |
| postgres | 5432 | Database |

## Quick Start

### 1. Setup mTLS Certificates

```bash
cd /Users/hristo/Desktop/ev-charging-platform
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
