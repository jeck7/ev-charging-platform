#!/bin/bash

# Complete mTLS setup script
# This script generates all certificates and sets up the environment

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== EV Charging Platform - mTLS Setup ===${NC}"
echo ""

# Check if openssl is installed
if ! command -v openssl &> /dev/null; then
    echo "Error: openssl is not installed. Please install it first."
    exit 1
fi

# Check if keytool is installed (for Java keystores)
if ! command -v keytool &> /dev/null; then
    echo "Warning: keytool is not installed. Java keystores will not be created."
    echo "Install Java JDK to generate truststore.jks"
fi

# Step 1: Generate mTLS certificates
echo -e "${YELLOW}Step 1: Generating mTLS certificates...${NC}"
./scripts/generate-certs.sh

# Step 2: Generate nginx gateway certificate
echo ""
echo -e "${YELLOW}Step 2: Generating nginx gateway certificate...${NC}"
cd gateway && ./generate-nginx-certs.sh && cd ..

# Step 3: Copy certificates to Spring Boot resources (for local development)
echo ""
echo -e "${YELLOW}Step 3: Copying certificates to Spring Boot resources...${NC}"

# Station Management
mkdir -p services/station-management/src/main/resources/keystore
cp certs/server/station-management.p12 services/station-management/src/main/resources/keystore/ 2>/dev/null || echo "Warning: Could not copy station-management.p12"
cp certs/truststore.jks services/station-management/src/main/resources/keystore/ 2>/dev/null || echo "Warning: Could not copy truststore.jks"

# Charging Sessions
mkdir -p services/charging-sessions/src/main/resources/keystore
cp certs/server/charging-sessions.p12 services/charging-sessions/src/main/resources/keystore/ 2>/dev/null || echo "Warning: Could not copy charging-sessions.p12"
cp certs/truststore.jks services/charging-sessions/src/main/resources/keystore/ 2>/dev/null || echo "Warning: Could not copy truststore.jks"

echo ""
echo -e "${GREEN}=== Setup Complete! ===${NC}"
echo ""
echo "Next steps:"
echo "1. For local development:"
echo "   - Certificates are in services/*/src/main/resources/keystore/"
echo "   - Run Spring Boot services locally"
echo ""
echo "2. For Docker:"
echo "   - Build Angular: cd frontend && ng build --configuration production"
echo "   - Start services: docker-compose up -d"
echo ""
echo "3. Access:"
echo "   - API Gateway: https://localhost:8443"
echo "   - Station Management: https://localhost:8082"
echo "   - Charging Sessions: https://localhost:8081"
echo ""
echo "See MTLS_SETUP.md for detailed documentation."
