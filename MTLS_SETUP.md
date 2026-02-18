# mTLS (Mutual TLS) Setup Guide

Това ръководство обяснява как да настроите mTLS (mutual TLS) за secure REST API комуникация в EV Charging Platform.

## Архитектура

```
┌─────────────┐
│   Angular   │  HTTPS (client cert)
│   Frontend  │ ──────────────────┐
└─────────────┘                   │
                                   ▼
                          ┌─────────────────┐
                          │  nginx Gateway  │  mTLS (client cert)
                          │   (Port 8443)   │ ──────────────────┐
                          └─────────────────┘                   │
                                   │                            │
                    ┌──────────────┴──────────────┐            │
                    ▼                             ▼            │
          ┌──────────────────┐         ┌──────────────────┐  │
          │ Station Mgmt     │         │ Charging Sessions│  │
          │ (Port 8082)      │         │ (Port 8081)      │  │
          └──────────────────┘         └──────────────────┘  │
```

## Компоненти

1. **CA (Certificate Authority)** - Издава и подписва сертификати
2. **Server Certificates** - За Spring Boot services (station-management, charging-sessions)
3. **Client Certificate** - За nginx API Gateway (използва се за комуникация с backend-ите)
4. **nginx Gateway** - Терминира mTLS от Angular и изпраща заявки с client cert към backend-ите

## Стъпка 1: Генериране на Сертификати

### 1.1. Генериране на mTLS сертификати

```bash
cd /Users/hristo/Desktop/ev-charging-platform
./scripts/generate-certs.sh
```

Това създава:
- `certs/ca/` - CA сертификат и ключ
- `certs/server/` - Server сертификати и keystores за Spring Boot
- `certs/client/` - Client сертификат за nginx gateway
- `certs/truststore.jks` - Java truststore с CA сертификата

### 1.2. Генериране на nginx gateway сертификат

```bash
cd gateway
./generate-nginx-certs.sh
```

Това създава self-signed сертификат за nginx gateway (`certs/nginx/`).

### 1.3. Копиране на сертификати в Spring Boot resources

За локално development, копирайте сертификатите в resources:

```bash
# Station Management
mkdir -p services/station-management/src/main/resources/keystore
cp certs/server/station-management.p12 services/station-management/src/main/resources/keystore/
cp certs/truststore.jks services/station-management/src/main/resources/keystore/

# Charging Sessions
mkdir -p services/charging-sessions/src/main/resources/keystore
cp certs/server/charging-sessions.p12 services/charging-sessions/src/main/resources/keystore/
cp certs/truststore.jks services/charging-sessions/src/main/resources/keystore/
```

## Стъпка 2: Конфигурация на Spring Boot

### 2.1. SSL/TLS Properties

Сертификатите са конфигурирани в `application.properties`:

```properties
server.ssl.enabled=true
server.ssl.key-store=classpath:keystore/station-management.p12
server.ssl.key-store-password=changeit
server.ssl.key-store-type=PKCS12
server.ssl.key-alias=station-management
server.ssl.trust-store=classpath:keystore/truststore.jks
server.ssl.trust-store-password=changeit
server.ssl.client-auth=need  # Require client certificate
```

### 2.2. Spring Security Configuration

`SecurityConfig.java` конфигурира X.509 client certificate authentication:

```java
.x509(x509 -> x509
    .subjectPrincipalRegex("CN=(.*?)(?:,|$)")
    .userDetailsService(username -> {
        // Load user from certificate CN
        return User.withUsername(username)
            .authorities("ROLE_CLIENT")
            .build();
    })
)
```

## Стъпка 3: nginx API Gateway

### 3.1. Конфигурация

nginx gateway (`gateway/nginx.conf`):
- Слуша на порт 443 (HTTPS)
- Изисква client certificate от Angular (`ssl_verify_client optional`)
- Използва client certificate за комуникация с backend-ите (mTLS)
- Proxy-ва заявки към съответните services

### 3.2. SSL/TLS настройки

```nginx
ssl_client_certificate /etc/nginx/ssl/ca-cert.pem;
ssl_verify_client optional;
proxy_ssl_certificate /etc/nginx/ssl/client-cert.pem;
proxy_ssl_certificate_key /etc/nginx/ssl/client-key.pem;
```

## Стъпка 4: Angular Frontend

### 4.1. Environment Configuration

`environment.ts` е актуализиран да използва HTTPS:

```typescript
export const environment = {
  production: false,
  stationsApiUrl: 'https://localhost:8443/api',
  sessionsApiUrl: 'https://localhost:8443/api',
};
```

### 4.2. Client Certificate в Browser

**Важно**: Браузърите не поддържат директно client сертификати за API извиквания. Затова:

1. **Development**: Използвайте nginx gateway, който терминира mTLS
2. **Production**: Инсталирайте client сертификата в браузъра или използвайте reverse proxy

За локално тестване, можете да инсталирате client сертификата в браузъра:
- Chrome/Edge: Settings → Privacy and Security → Security → Manage certificates → Import `certs/client/api-gateway-cert.pem`

## Стъпка 5: Стартиране с Docker

### 5.1. Генериране на сертификати

```bash
./scripts/generate-certs.sh
cd gateway && ./generate-nginx-certs.sh && cd ..
```

### 5.2. Build на Angular frontend

```bash
cd frontend
npm install
ng build --configuration production
cd ..
```

### 5.3. Стартиране на services

```bash
docker-compose up -d
```

Services ще бъдат достъпни на:
- **API Gateway**: https://localhost:8443
- **Station Management**: https://localhost:8082 (директен достъп, изисква client cert)
- **Charging Sessions**: https://localhost:8081 (директен достъп, изисква client cert)

## Стъпка 6: Тестване

### 6.1. Тестване на API Gateway

```bash
# С client сертификат
curl -k --cert certs/client/api-gateway-cert.pem \
     --key certs/client/api-gateway-key.pem \
     https://localhost:8443/api/stations
```

### 6.2. Тестване на директния backend (с client cert)

```bash
# Station Management
curl -k --cert certs/client/api-gateway-cert.pem \
     --key certs/client/api-gateway-key.pem \
     --cacert certs/ca/ca-cert.pem \
     https://localhost:8082/api/stations
```

### 6.3. Тестване от Angular

1. Отворете браузър на https://localhost:8443
2. Приемете self-signed сертификата (за development)
3. Ако е настроен client cert в браузъра, той ще бъде използван автоматично

## Стъпка 7: Production Considerations

### 7.1. Сертификати

- Използвайте сертификати от доверена CA (Let's Encrypt, DigiCert, etc.)
- Не използвайте self-signed сертификати в production
- Ротация на сертификати и ключове

### 7.2. Security Headers

nginx конфигурацията включва security headers:
- `Strict-Transport-Security`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `X-XSS-Protection`

### 7.3. Client Certificate Management

В production:
- Използвайте PKI система за управление на client сертификати
- Имплементирайте revocation (CRL или OCSP)
- Логирайте и мониторирайте client certificate използване

### 7.4. JWT/OAuth2 Integration

mTLS може да се комбинира с JWT/OAuth2:
- mTLS за service-to-service комуникация
- JWT/OAuth2 за user authentication
- API Gateway може да валидира и двата

## Troubleshooting

### Проблем: "PKIX path building failed"

**Решение**: Уверете се, че CA сертификатът е в truststore:
```bash
keytool -import -file certs/ca/ca-cert.pem -alias ca -keystore certs/truststore.jks
```

### Проблем: "Client certificate required"

**Решение**: Уверете се, че client сертификатът е предоставен:
- За curl: използвайте `--cert` и `--key`
- За nginx: проверете `ssl_verify_client` настройката

### Проблем: "Certificate does not match"

**Решение**: Проверете Subject Alternative Names (SAN) в server сертификата:
```bash
openssl x509 -in certs/server/station-management-cert.pem -text -noout | grep -A 1 "Subject Alternative Name"
```

## Допълнителни Ресурси

- [Spring Boot SSL/TLS Documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/howto.html#howto.webserver.configure-ssl)
- [nginx SSL/TLS Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [mTLS Best Practices](https://www.cloudflare.com/learning/access-management/what-is-mutual-tls/)
