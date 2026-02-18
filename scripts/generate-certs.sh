#!/bin/bash

# Generate certificates for mTLS setup
# This script creates:
# - CA (Certificate Authority)
# - Server certificates for each service
# - Client certificate for API Gateway/Angular

set -e

CERT_DIR="./certs"
CA_DIR="${CERT_DIR}/ca"
SERVER_DIR="${CERT_DIR}/server"
CLIENT_DIR="${CERT_DIR}/client"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Generating mTLS Certificates ===${NC}"

# Create directories
mkdir -p "${CA_DIR}" "${SERVER_DIR}" "${CLIENT_DIR}"

# 1. Generate CA Private Key
echo -e "${YELLOW}1. Generating CA private key...${NC}"
openssl genrsa -out "${CA_DIR}/ca-key.pem" 4096

# 2. Generate CA Certificate
echo -e "${YELLOW}2. Generating CA certificate...${NC}"
openssl req -new -x509 -days 3650 -key "${CA_DIR}/ca-key.pem" \
  -out "${CA_DIR}/ca-cert.pem" \
  -subj "/C=BG/ST=Sofia/L=Sofia/O=eMobility/OU=IT/CN=ev-charging-ca"

# 3. Generate Server Private Key (for station-management)
echo -e "${YELLOW}3. Generating server private key (station-management)...${NC}"
openssl genrsa -out "${SERVER_DIR}/station-management-key.pem" 2048

# 4. Generate Server Certificate Request (station-management)
echo -e "${YELLOW}4. Generating server certificate request (station-management)...${NC}"
openssl req -new -key "${SERVER_DIR}/station-management-key.pem" \
  -out "${SERVER_DIR}/station-management.csr" \
  -subj "/C=BG/ST=Sofia/L=Sofia/O=eMobility/OU=IT/CN=station-management"

# 5. Sign Server Certificate (station-management)
echo -e "${YELLOW}5. Signing server certificate (station-management)...${NC}"
openssl x509 -req -days 365 -in "${SERVER_DIR}/station-management.csr" \
  -CA "${CA_DIR}/ca-cert.pem" \
  -CAkey "${CA_DIR}/ca-key.pem" \
  -CAcreateserial \
  -out "${SERVER_DIR}/station-management-cert.pem" \
  -extensions v3_req -extfile <(
    echo "[v3_req]"
    echo "keyUsage = keyEncipherment, dataEncipherment"
    echo "extendedKeyUsage = serverAuth"
    echo "subjectAltName = @alt_names"
    echo "[alt_names]"
    echo "DNS.1 = station-management"
    echo "DNS.2 = localhost"
    echo "IP.1 = 127.0.0.1"
  )

# 6. Generate Server Private Key (for charging-sessions)
echo -e "${YELLOW}6. Generating server private key (charging-sessions)...${NC}"
openssl genrsa -out "${SERVER_DIR}/charging-sessions-key.pem" 2048

# 7. Generate Server Certificate Request (charging-sessions)
echo -e "${YELLOW}7. Generating server certificate request (charging-sessions)...${NC}"
openssl req -new -key "${SERVER_DIR}/charging-sessions-key.pem" \
  -out "${SERVER_DIR}/charging-sessions.csr" \
  -subj "/C=BG/ST=Sofia/L=Sofia/O=eMobility/OU=IT/CN=charging-sessions"

# 8. Sign Server Certificate (charging-sessions)
echo -e "${YELLOW}8. Signing server certificate (charging-sessions)...${NC}"
openssl x509 -req -days 365 -in "${SERVER_DIR}/charging-sessions.csr" \
  -CA "${CA_DIR}/ca-cert.pem" \
  -CAkey "${CA_DIR}/ca-key.pem" \
  -CAcreateserial \
  -out "${SERVER_DIR}/charging-sessions-cert.pem" \
  -extensions v3_req -extfile <(
    echo "[v3_req]"
    echo "keyUsage = keyEncipherment, dataEncipherment"
    echo "extendedKeyUsage = serverAuth"
    echo "subjectAltName = @alt_names"
    echo "[alt_names]"
    echo "DNS.1 = charging-sessions"
    echo "DNS.2 = localhost"
    echo "IP.1 = 127.0.0.1"
  )

# 9. Generate Client Private Key (for API Gateway/Angular)
echo -e "${YELLOW}9. Generating client private key (api-gateway)...${NC}"
openssl genrsa -out "${CLIENT_DIR}/api-gateway-key.pem" 2048

# 10. Generate Client Certificate Request
echo -e "${YELLOW}10. Generating client certificate request (api-gateway)...${NC}"
openssl req -new -key "${CLIENT_DIR}/api-gateway-key.pem" \
  -out "${CLIENT_DIR}/api-gateway.csr" \
  -subj "/C=BG/ST=Sofia/L=Sofia/O=eMobility/OU=IT/CN=api-gateway"

# 11. Sign Client Certificate
echo -e "${YELLOW}11. Signing client certificate (api-gateway)...${NC}"
openssl x509 -req -days 365 -in "${CLIENT_DIR}/api-gateway.csr" \
  -CA "${CA_DIR}/ca-cert.pem" \
  -CAkey "${CA_DIR}/ca-key.pem" \
  -CAcreateserial \
  -out "${CLIENT_DIR}/api-gateway-cert.pem" \
  -extensions v3_req -extfile <(
    echo "[v3_req]"
    echo "keyUsage = digitalSignature, keyEncipherment"
    echo "extendedKeyUsage = clientAuth"
  )

# 12. Create PKCS12 keystores for Spring Boot (Java format)
echo -e "${YELLOW}12. Creating PKCS12 keystores for Spring Boot...${NC}"

# Station Management keystore
openssl pkcs12 -export \
  -in "${SERVER_DIR}/station-management-cert.pem" \
  -inkey "${SERVER_DIR}/station-management-key.pem" \
  -out "${SERVER_DIR}/station-management.p12" \
  -name "station-management" \
  -password pass:changeit \
  -CAfile "${CA_DIR}/ca-cert.pem" \
  -caname "ev-charging-ca"

# Charging Sessions keystore
openssl pkcs12 -export \
  -in "${SERVER_DIR}/charging-sessions-cert.pem" \
  -inkey "${SERVER_DIR}/charging-sessions-key.pem" \
  -out "${SERVER_DIR}/charging-sessions.p12" \
  -name "charging-sessions" \
  -password pass:changeit \
  -CAfile "${CA_DIR}/ca-cert.pem" \
  -caname "ev-charging-ca"

# 13. Create truststore (CA certificate) for Spring Boot
echo -e "${YELLOW}13. Creating truststore for Spring Boot...${NC}"
keytool -import -noprompt -trustcacerts \
  -file "${CA_DIR}/ca-cert.pem" \
  -alias "ev-charging-ca" \
  -keystore "${CERT_DIR}/truststore.jks" \
  -storepass changeit \
  -storetype JKS

# 14. Create client certificate bundle for nginx
echo -e "${YELLOW}14. Creating client certificate bundle for nginx...${NC}"
cat "${CLIENT_DIR}/api-gateway-cert.pem" "${CLIENT_DIR}/api-gateway-key.pem" > "${CLIENT_DIR}/api-gateway-bundle.pem"

# Cleanup CSR files
rm -f "${SERVER_DIR}"/*.csr "${CLIENT_DIR}"/*.csr "${CA_DIR}"/*.srl

echo -e "${GREEN}=== Certificate generation complete! ===${NC}"
echo ""
echo "Certificates created in:"
echo "  - CA: ${CA_DIR}/"
echo "  - Server: ${SERVER_DIR}/"
echo "  - Client: ${CLIENT_DIR}/"
echo ""
echo "For Spring Boot services:"
echo "  - Keystores: ${SERVER_DIR}/*.p12 (password: changeit)"
echo "  - Truststore: ${CERT_DIR}/truststore.jks (password: changeit)"
echo ""
echo "For nginx API Gateway:"
echo "  - Client cert bundle: ${CLIENT_DIR}/api-gateway-bundle.pem"
echo "  - CA cert: ${CA_DIR}/ca-cert.pem"
