#!/bin/bash

# Generate self-signed certificate for nginx gateway
# This is separate from the mTLS certificates used for backend communication

set -e

CERT_DIR="./certs/nginx"
mkdir -p "${CERT_DIR}"

echo "Generating nginx gateway SSL certificate..."

# Generate private key
openssl genrsa -out "${CERT_DIR}/server-key.pem" 2048

# Generate certificate request
openssl req -new -key "${CERT_DIR}/server-key.pem" \
  -out "${CERT_DIR}/server.csr" \
  -subj "/C=BG/ST=Sofia/L=Sofia/O=eMobility/OU=IT/CN=localhost"

# Sign certificate (self-signed for development)
openssl x509 -req -days 365 -in "${CERT_DIR}/server.csr" \
  -signkey "${CERT_DIR}/server-key.pem" \
  -out "${CERT_DIR}/server-cert.pem" \
  -extensions v3_req -extfile <(
    echo "[v3_req]"
    echo "keyUsage = keyEncipherment, dataEncipherment"
    echo "extendedKeyUsage = serverAuth"
    echo "subjectAltName = @alt_names"
    echo "[alt_names]"
    echo "DNS.1 = localhost"
    echo "IP.1 = 127.0.0.1"
  )

# Cleanup
rm -f "${CERT_DIR}/server.csr"

echo "Nginx gateway certificate generated in ${CERT_DIR}/"
