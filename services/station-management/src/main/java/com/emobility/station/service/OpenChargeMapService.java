package com.emobility.station.service;

import com.emobility.station.entity.ChargingStation;
import com.emobility.station.repository.ChargingStationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Service for integrating with Open Charge Map API
 * Documentation: https://openchargemap.org/site/develop/api
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OpenChargeMapService {

    private static final String OPEN_CHARGE_MAP_API_URL = "https://api.openchargemap.io/v3/poi/";
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final ChargingStationRepository stationRepository;

    /**
     * Fetch charging stations from Open Charge Map API
     * @param latitude Latitude coordinate
     * @param longitude Longitude coordinate
     * @param distance Distance in km (default: 10)
     * @return List of charging stations
     */
    public List<Map<String, Object>> fetchNearbyStations(BigDecimal latitude, BigDecimal longitude, Integer distance) {
        try {
            String url = String.format("%s?output=json&latitude=%s&longitude=%s&distance=%d&distanceunit=KM&maxresults=50",
                    OPEN_CHARGE_MAP_API_URL, latitude, longitude, distance != null ? distance : 10);
            
            log.info("Fetching stations from Open Charge Map: {}", url);
            
            String response = restTemplate.getForObject(url, String.class);
            JsonNode jsonNode = objectMapper.readTree(response);
            
            List<Map<String, Object>> stations = new ArrayList<>();
            if (jsonNode.isArray()) {
                for (JsonNode stationNode : jsonNode) {
                    stations.add(parseStationData(stationNode));
                }
            }
            
            log.info("Fetched {} stations from Open Charge Map", stations.size());
            return stations;
        } catch (Exception e) {
            log.error("Error fetching stations from Open Charge Map", e);
            return new ArrayList<>();
        }
    }

    /**
     * Fetch stations by country
     */
    public List<Map<String, Object>> fetchStationsByCountry(String countryCode) {
        try {
            String url = String.format("%s?output=json&countrycode=%s&maxresults=100",
                    OPEN_CHARGE_MAP_API_URL, countryCode);
            
            log.info("Fetching stations by country from Open Charge Map: {}", url);
            
            String response = restTemplate.getForObject(url, String.class);
            JsonNode jsonNode = objectMapper.readTree(response);
            
            List<Map<String, Object>> stations = new ArrayList<>();
            if (jsonNode.isArray()) {
                for (JsonNode stationNode : jsonNode) {
                    stations.add(parseStationData(stationNode));
                }
            }
            
            log.info("Fetched {} stations from Open Charge Map for country {}", stations.size(), countryCode);
            return stations;
        } catch (Exception e) {
            log.error("Error fetching stations by country from Open Charge Map", e);
            return new ArrayList<>();
        }
    }

    /**
     * Import all stations from Open Charge Map for a country into local database
     * @param countryCode Country code (e.g., "BG" for Bulgaria)
     * @return Import result with counts
     */
    public ImportResult importStationsFromOpenChargeMap(String countryCode) {
        int imported = 0;
        int updated = 0;
        int skipped = 0;
        
        try {
            // Fetch all stations (Open Charge Map allows up to 10000 results)
            String url = String.format("%s?output=json&countrycode=%s&maxresults=10000",
                    OPEN_CHARGE_MAP_API_URL, countryCode);
            
            log.info("Importing stations from Open Charge Map for country: {}", countryCode);
            
            String response = restTemplate.getForObject(url, String.class);
            JsonNode jsonNode = objectMapper.readTree(response);
            
            if (jsonNode.isArray()) {
                for (JsonNode stationNode : jsonNode) {
                    try {
                        ChargingStation station = parseAndSaveStation(stationNode);
                        if (station.getId() == null) {
                            imported++;
                        } else {
                            updated++;
                        }
                    } catch (Exception e) {
                        log.warn("Error importing station: {}", e.getMessage());
                        skipped++;
                    }
                }
            }
            
            log.info("Import completed: {} imported, {} updated, {} skipped", imported, updated, skipped);
            return new ImportResult(imported, updated, skipped);
            
        } catch (Exception e) {
            log.error("Error importing stations from Open Charge Map", e);
            return new ImportResult(0, 0, 0);
        }
    }

    private ChargingStation parseAndSaveStation(JsonNode stationNode) {
        String externalId = stationNode.has("ID") ? String.valueOf(stationNode.get("ID").asLong()) : null;
        if (externalId == null) {
            throw new IllegalArgumentException("Station missing ID");
        }

        JsonNode addressInfo = stationNode.has("AddressInfo") ? stationNode.get("AddressInfo") : null;
        if (addressInfo == null) {
            throw new IllegalArgumentException("Station missing AddressInfo");
        }

        String name = addressInfo.has("Title") ? addressInfo.get("Title").asText() : "Unknown Station";
        String address = addressInfo.has("AddressLine1") ? addressInfo.get("AddressLine1").asText() : "";
        String city = addressInfo.has("Town") ? addressInfo.get("Town").asText() : "";
        String country = addressInfo.has("Country") && addressInfo.get("Country").has("ISOCode")
                ? addressInfo.get("Country").get("ISOCode").asText() : "";
        
        BigDecimal latitude = addressInfo.has("Latitude") 
                ? BigDecimal.valueOf(addressInfo.get("Latitude").asDouble()) : null;
        BigDecimal longitude = addressInfo.has("Longitude")
                ? BigDecimal.valueOf(addressInfo.get("Longitude").asDouble()) : null;

        if (latitude == null || longitude == null) {
            throw new IllegalArgumentException("Station missing coordinates");
        }

        // Parse operator
        String operator = stationNode.has("OperatorInfo") && stationNode.get("OperatorInfo").has("Title")
                ? stationNode.get("OperatorInfo").get("Title").asText() : null;

        // Calculate max power from connectors
        BigDecimal maxPowerKw = calculateMaxPower(stationNode);

        // Check if station already exists
        ChargingStation existingStation = stationRepository.findByExternalId(externalId);
        
        if (existingStation != null) {
            // Update existing station
            existingStation.setName(name);
            existingStation.setAddress(address);
            existingStation.setCity(city);
            existingStation.setCountry(country);
            existingStation.setLatitude(latitude);
            existingStation.setLongitude(longitude);
            existingStation.setOperator(operator);
            existingStation.setMaxPowerKw(maxPowerKw);
            // Keep existing status unless it's maintenance
            if (existingStation.getStatus() == ChargingStation.StationStatus.MAINTENANCE) {
                existingStation.setStatus(ChargingStation.StationStatus.ACTIVE);
            }
            return stationRepository.save(existingStation);
        } else {
            // Create new station
            ChargingStation newStation = ChargingStation.builder()
                    .externalId(externalId)
                    .name(name)
                    .address(address)
                    .city(city)
                    .country(country)
                    .latitude(latitude)
                    .longitude(longitude)
                    .operator(operator)
                    .maxPowerKw(maxPowerKw)
                    .status(ChargingStation.StationStatus.ACTIVE)
                    .build();
            return stationRepository.save(newStation);
        }
    }

    private BigDecimal calculateMaxPower(JsonNode stationNode) {
        BigDecimal maxPower = BigDecimal.ZERO;
        if (stationNode.has("Connections") && stationNode.get("Connections").isArray()) {
            for (JsonNode connNode : stationNode.get("Connections")) {
                if (connNode.has("PowerKW")) {
                    BigDecimal power = BigDecimal.valueOf(connNode.get("PowerKW").asDouble());
                    if (power.compareTo(maxPower) > 0) {
                        maxPower = power;
                    }
                }
            }
        }
        return maxPower;
    }

    public static class ImportResult {
        private final int imported;
        private final int updated;
        private final int skipped;

        public ImportResult(int imported, int updated, int skipped) {
            this.imported = imported;
            this.updated = updated;
            this.skipped = skipped;
        }

        public int getImported() { return imported; }
        public int getUpdated() { return updated; }
        public int getSkipped() { return skipped; }
        public int getTotal() { return imported + updated + skipped; }
    }

    private Map<String, Object> parseStationData(JsonNode stationNode) {
        return Map.of(
            "externalId", stationNode.has("ID") ? stationNode.get("ID").asText() : "",
            "name", stationNode.has("AddressInfo") && stationNode.get("AddressInfo").has("Title") 
                    ? stationNode.get("AddressInfo").get("Title").asText() : "Unknown",
            "address", stationNode.has("AddressInfo") && stationNode.get("AddressInfo").has("AddressLine1")
                    ? stationNode.get("AddressInfo").get("AddressLine1").asText() : "",
            "city", stationNode.has("AddressInfo") && stationNode.get("AddressInfo").has("Town")
                    ? stationNode.get("AddressInfo").get("Town").asText() : "",
            "country", stationNode.has("AddressInfo") && stationNode.get("AddressInfo").has("Country")
                    ? stationNode.get("AddressInfo").get("Country").get("ISOCode").asText() : "",
            "latitude", stationNode.has("AddressInfo") && stationNode.get("AddressInfo").has("Latitude")
                    ? stationNode.get("AddressInfo").get("Latitude").asDouble() : 0.0,
            "longitude", stationNode.has("AddressInfo") && stationNode.get("AddressInfo").has("Longitude")
                    ? stationNode.get("AddressInfo").get("Longitude").asDouble() : 0.0,
            "connectors", parseConnectors(stationNode),
            "operator", stationNode.has("OperatorInfo") && stationNode.get("OperatorInfo").has("Title")
                    ? stationNode.get("OperatorInfo").get("Title").asText() : "Unknown"
        );
    }

    private List<Map<String, String>> parseConnectors(JsonNode stationNode) {
        List<Map<String, String>> connectors = new ArrayList<>();
        if (stationNode.has("Connections") && stationNode.get("Connections").isArray()) {
            for (JsonNode connNode : stationNode.get("Connections")) {
                connectors.add(Map.of(
                    "type", connNode.has("ConnectionType") && connNode.get("ConnectionType").has("Title")
                            ? connNode.get("ConnectionType").get("Title").asText() : "Unknown",
                    "power", connNode.has("PowerKW") ? connNode.get("PowerKW").asText() : "0",
                    "status", connNode.has("StatusType") && connNode.get("StatusType").has("Title")
                            ? connNode.get("StatusType").get("Title").asText() : "Unknown"
                ));
            }
        }
        return connectors;
    }
}
