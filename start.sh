#!/bin/bash
set -e
echo "Starting eMobility EV Charging Platform..."
docker-compose up -d
echo ""
echo "Services:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Station Management API: http://localhost:8082/api/stations"
echo "  - Charging Sessions API: http://localhost:8081/api/sessions"
echo "  - Swagger UI: http://localhost:8082/swagger-ui.html"
echo ""
echo "To run the Angular frontend:"
echo "  cd frontend && npm install && ng serve"
echo "  Then open http://localhost:4200"
