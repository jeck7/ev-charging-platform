# Quick Start - mTLS Setup

Бързо ръководство за стартиране на проекта с mTLS.

## Етап 1: Генериране на Сертификати

```bash
./scripts/setup-mtls.sh
```

Това ще създаде всички необходими сертификати:
- CA сертификат
- Server сертификати за Spring Boot services
- Client сертификат за nginx gateway
- Java keystores и truststores

## Етап 2: Локално Development (без Docker)

### Backend Services

```bash
# Terminal 1 - Station Management
cd services/station-management
mvn spring-boot:run

# Terminal 2 - Charging Sessions  
cd services/charging-sessions
mvn spring-boot:run
```

Services ще бъдат достъпни на:
- https://localhost:8082 (Station Management)
- https://localhost:8081 (Charging Sessions)

**Важно**: За тестване с curl, използвайте client сертификата:
```bash
curl -k --cert certs/client/api-gateway-cert.pem \
     --key certs/client/api-gateway-key.pem \
     https://localhost:8082/api/stations
```

### Frontend (Angular)

```bash
cd frontend
npm install
ng serve --ssl --ssl-cert ../certs/nginx/server-cert.pem --ssl-key ../certs/nginx/server-key.pem
```

Или използвайте nginx gateway (препоръчително).

## Етап 3: Docker Compose (Production-like)

### Build Frontend

```bash
cd frontend
npm install
ng build --configuration production
cd ..
```

### Start Services

```bash
docker-compose up -d
```

### Access

- **Frontend + API Gateway**: https://localhost:8443
- **Direct Backend APIs**: https://localhost:8081, https://localhost:8082

## Тестване

### Тест с curl (с client сертификат)

```bash
# Чрез API Gateway
curl -k --cert certs/client/api-gateway-cert.pem \
     --key certs/client/api-gateway-key.pem \
     https://localhost:8443/api/stations

# Директно към backend (с CA cert)
curl -k --cert certs/client/api-gateway-cert.pem \
     --key certs/client/api-gateway-key.pem \
     --cacert certs/ca/ca-cert.pem \
     https://localhost:8082/api/stations
```

### Тест от браузър

1. Отворете https://localhost:8443
2. Приемете self-signed сертификата (за development)
3. Ако имате инсталиран client сертификат в браузъра, той ще бъде използван автоматично

## Troubleshooting

### "Certificate does not match"
- Проверете SAN (Subject Alternative Names) в server сертификата
- Уверете се, че hostname съвпада

### "Client certificate required"
- Уверете се, че client сертификатът е предоставен
- За curl: използвайте `--cert` и `--key`
- За браузър: инсталирайте client сертификата

### "PKIX path building failed"
- Уверете се, че CA сертификатът е в truststore
- Проверете `certs/truststore.jks`

## Допълнителна Документация

За пълна документация вижте [MTLS_SETUP.md](./MTLS_SETUP.md)
