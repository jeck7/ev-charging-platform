package com.emobility.station.service;

import com.emobility.station.entity.ChargingStation;
import com.emobility.station.repository.ChargingStationRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Service for integrating with Open Charge Map API
 * Documentation: https://openchargemap.org/site/develop/api
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OpenChargeMapService {

    private static final String OPEN_CHARGE_MAP_API_URL = "https://api.openchargemap.io/v3/poi/";
    private static final String OPEN_CHARGE_MAP_REFERENCE_URL = "https://api.openchargemap.io/v3/referencedata/";

    @Value("${openchargemap.api.key:}")
    private String apiKey;
    
    private final RestTemplate restTemplate;
    
    @Autowired
    private ObjectMapper objectMapper;
    
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
            String url = buildUrl("output=json&latitude=%s&longitude=%s&distance=%d&distanceunit=KM&maxresults=50",
                    latitude, longitude, distance != null ? distance : 10);
            
            log.info("Fetching stations from Open Charge Map: {}", url);
            
            String response = restTemplate.getForObject(url, String.class);
            if (response == null || response.trim().isEmpty()) {
                log.warn("Empty response from Open Charge Map API");
                return new ArrayList<>();
            }
            
            JsonNode jsonNode = objectMapper.readTree(response);
            
            List<Map<String, Object>> stations = new ArrayList<>();
            if (jsonNode.isArray()) {
                for (JsonNode stationNode : jsonNode) {
                    stations.add(parseStationData(stationNode));
                }
            }
            
            log.info("Fetched {} stations from Open Charge Map", stations.size());
            return stations;
        } catch (JsonProcessingException e) {
            log.error("Error parsing JSON response from Open Charge Map", e);
            return new ArrayList<>();
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
            String url = buildUrl("output=json&countrycode=%s&maxresults=100", countryCode);
            
            log.info("Fetching stations by country from Open Charge Map: {}", url);
            
            String response = restTemplate.getForObject(url, String.class);
            if (response == null || response.trim().isEmpty()) {
                log.warn("Empty response from Open Charge Map API for country {}", countryCode);
                return new ArrayList<>();
            }
            
            JsonNode jsonNode = objectMapper.readTree(response);
            
            List<Map<String, Object>> stations = new ArrayList<>();
            if (jsonNode.isArray()) {
                for (JsonNode stationNode : jsonNode) {
                    stations.add(parseStationData(stationNode));
                }
            }
            
            log.info("Fetched {} stations from Open Charge Map for country {}", stations.size(), countryCode);
            return stations;
        } catch (JsonProcessingException e) {
            log.error("Error parsing JSON response from Open Charge Map for country {}", countryCode, e);
            return new ArrayList<>();
        } catch (Exception e) {
            log.error("Error fetching stations by country from Open Charge Map", e);
            return new ArrayList<>();
        }
    }

    /** Page size for paginated import (OCM often caps at 1000 per request; use 1000 for reliability). */
    private static final int IMPORT_PAGE_SIZE = 1000;
    /** Pause between pages to avoid rate limiting (ms). */
    private static final int IMPORT_PAGE_DELAY_MS = 400;
    /** Max pages per import to avoid infinite loop if API misbehaves. */
    private static final int IMPORT_MAX_PAGES = 200;

    /**
     * Build URL for one page of import: country + sortby=id_asc + greaterthanid for pagination.
     * If operatorId is not null, filter by operator (e.g. Fines Charging).
     */
    private String buildImportPageUrl(String countryCode, long greaterThanId, Integer operatorId) {
        String params = String.format(
            "output=json&countrycode=%s&maxresults=%d&sortby=id_asc",
            countryCode, IMPORT_PAGE_SIZE
        );
        if (greaterThanId > 0) {
            params += "&greaterthanid=" + greaterThanId;
        }
        if (operatorId != null) {
            params += "&operatorid=" + operatorId;
        }
        String baseUrl = OPEN_CHARGE_MAP_API_URL + "?" + params;
        if (apiKey != null && !apiKey.trim().isEmpty()) {
            return baseUrl + "&key=" + apiKey;
        }
        return baseUrl;
    }

    /**
     * Resolve Open Charge Map operator ID by name (e.g. "Fines" -> ID).
     * Uses reference data: https://api.openchargemap.io/v3/referencedata/
     */
    public Integer findOperatorIdByTitle(String titleSubstring) {
        try {
            String url = OPEN_CHARGE_MAP_REFERENCE_URL + (apiKey != null && !apiKey.trim().isEmpty() ? "?key=" + apiKey : "");
            String response = restTemplate.getForObject(url, String.class);
            if (response == null || response.isBlank()) return null;
            JsonNode root = objectMapper.readTree(response);
            JsonNode operators = root.has("Operators") ? root.get("Operators") : null;
            if (operators == null || !operators.isArray()) return null;
            String search = titleSubstring.trim().toLowerCase();
            for (JsonNode op : operators) {
                if (op.has("Title")) {
                    String title = op.get("Title").asText("");
                    if (title.toLowerCase().contains(search) && op.has("ID")) {
                        return op.get("ID").asInt();
                    }
                }
            }
            return null;
        } catch (Exception e) {
            log.warn("Could not fetch OCM reference data for operator '{}': {}", titleSubstring, e.getMessage());
            return null;
        }
    }

    /**
     * Import all stations from Open Charge Map for a country (optionally filtered by operator).
     * Uses pagination (sortby=id_asc, greaterthanid) so we load every station.
     *
     * @param countryCode Country code (e.g., "BG" for Bulgaria)
     * @param operatorId   Optional OCM operator ID (e.g. Fines). If null, import all for country.
     * @return Import result with counts
     */
    public ImportResult importStationsFromOpenChargeMap(String countryCode, Integer operatorId) {
        int imported = 0;
        int updated = 0;
        int skipped = 0;
        long lastId = 0;
        int pageNum = 0;

        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("Open Charge Map API key is not configured. Some requests may be rate-limited or rejected.");
            log.warn("Get a free API key at: https://openchargemap.org/site/develop/api");
            log.warn("Then add 'openchargemap.api.key=your-key' to application.properties");
        }

        try {
            log.info("Importing stations from Open Charge Map for country: {} (operatorId={}, page size {})", countryCode, operatorId, IMPORT_PAGE_SIZE);

            while (true) {
                pageNum++;
                String url = buildImportPageUrl(countryCode, lastId, operatorId);
                log.info("Fetching page {} (greaterthanid={})", pageNum, lastId);

                String response = restTemplate.getForObject(url, String.class);
                if (response == null || response.trim().isEmpty()) {
                    log.warn("Empty response for country {} (greaterthanid={})", countryCode, lastId);
                    break;
                }
                if (response.trim().startsWith("<")) {
                    log.warn("Received HTML instead of JSON (API may require key). Skipping.");
                    break;
                }

                JsonNode jsonNode = objectMapper.readTree(response);
                if (!jsonNode.isArray() || jsonNode.size() == 0) {
                    break;
                }

                for (JsonNode stationNode : jsonNode) {
                    try {
                        long extId = stationNode.has("ID") ? stationNode.get("ID").asLong() : lastId;
                        if (extId > lastId) lastId = extId;

                        SaveResult result = parseAndSaveStation(stationNode);
                        if (result.wasNew()) imported++;
                        else updated++;
                    } catch (Exception e) {
                        log.warn("Error importing station: {}", e.getMessage());
                        skipped++;
                    }
                }

                log.info("Page {}: received {} stations, lastId={}", pageNum, jsonNode.size(), lastId);

                if (jsonNode.size() == 0) {
                    log.info("Empty page. Import complete.");
                    break;
                }
                if (pageNum >= IMPORT_MAX_PAGES) {
                    log.warn("Reached max pages ({}). Stopping.", IMPORT_MAX_PAGES);
                    break;
                }
                // Request next page with lastId (API may return fewer than maxresults per request)
                if (jsonNode.size() < IMPORT_PAGE_SIZE) {
                    log.info("Partial page ({} stations). Fetching next with greaterthanid={}.", jsonNode.size(), lastId);
                }

                try {
                    Thread.sleep(IMPORT_PAGE_DELAY_MS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    log.warn("Import interrupted");
                    break;
                }
            }

            log.info("Import completed: {} imported, {} updated, {} skipped", imported, updated, skipped);
            return new ImportResult(imported, updated, skipped);

        } catch (JsonProcessingException e) {
            log.error("Error parsing JSON response from Open Charge Map for country {}", countryCode, e);
            throw new RuntimeException("Failed to parse JSON response from Open Charge Map API", e);
        } catch (org.springframework.web.client.HttpClientErrorException.Forbidden e) {
            if (e.getMessage() != null && e.getMessage().contains("REJECTED_APIKEY_MISSING")) {
                log.error("Open Charge Map API requires an API key. Get a free key at: https://openchargemap.org/site/develop/api");
                log.error("Add 'openchargemap.api.key=your-key' to application.properties");
            }
            log.error("Error importing stations from Open Charge Map: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Error importing stations from Open Charge Map", e);
            throw e;
        }
    }

    /** Result of saving one station: entity and whether it was newly inserted. */
    private static final class SaveResult {
        private final ChargingStation station;
        private final boolean wasNew;

        SaveResult(ChargingStation station, boolean wasNew) {
            this.station = Objects.requireNonNull(station);
            this.wasNew = wasNew;
        }

        ChargingStation getStation() { return station; }
        boolean wasNew() { return wasNew; }
    }

    private SaveResult parseAndSaveStation(JsonNode stationNode) {
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
        String connectorsJson = connectorsToJson(stationNode);
        // Usage cost: from first connection that has it, or leave null (admin can set later)
        String usageCost = parseFirstUsageCost(stationNode);

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
            existingStation.setConnectorsJson(connectorsJson);
            existingStation.setUsageCost(usageCost != null ? usageCost : existingStation.getUsageCost());
            if (existingStation.getStatus() == ChargingStation.StationStatus.MAINTENANCE) {
                existingStation.setStatus(ChargingStation.StationStatus.ACTIVE);
            }
            return new SaveResult(stationRepository.save(existingStation), false);
        } else {
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
                    .connectorsJson(connectorsJson)
                    .usageCost(usageCost)
                    .status(ChargingStation.StationStatus.ACTIVE)
                    .build();
            return new SaveResult(stationRepository.save(newStation), true);
        }
    }

    /** Take first UsageCost from any connection (OCM often has it per connection or not at all). */
    private String parseFirstUsageCost(JsonNode stationNode) {
        if (!stationNode.has("Connections") || !stationNode.get("Connections").isArray()) return null;
        for (JsonNode connNode : stationNode.get("Connections")) {
            if (connNode.has("UsageCost") && !connNode.get("UsageCost").isNull()) {
                String s = connNode.get("UsageCost").asText().trim();
                if (!s.isEmpty()) return s;
            }
        }
        return null;
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
                String type = connNode.has("ConnectionType") && connNode.get("ConnectionType").has("Title")
                        ? connNode.get("ConnectionType").get("Title").asText() : "Unknown";
                String power = connNode.has("PowerKW") ? connNode.get("PowerKW").asText() : "0";
                String status = connNode.has("StatusType") && connNode.get("StatusType").has("Title")
                        ? connNode.get("StatusType").get("Title").asText() : "Unknown";
                // UsageCost may be present in OCM data (e.g. "0.39 EUR / kWh")
                String usageCost = connNode.has("UsageCost") && !connNode.get("UsageCost").isNull()
                        ? connNode.get("UsageCost").asText().trim() : null;
                if (usageCost != null && !usageCost.isEmpty()) {
                    connectors.add(Map.of("type", type, "power", power, "status", status, "usageCost", usageCost));
                } else {
                    connectors.add(Map.of("type", type, "power", power, "status", status));
                }
            }
        }
        return connectors;
    }

    /** Serialize connectors to JSON for DB storage (type, powerKw, usageCost, stationName when present). */
    private String connectorsToJson(JsonNode stationNode) {
        List<Map<String, Object>> list = new ArrayList<>();
        boolean hasEquipmentConnectors = false;
        
        // Group connectors by Equipment if available
        if (stationNode.has("Equipment")) {
            JsonNode equipmentNode = stationNode.get("Equipment");
            if (equipmentNode.isArray()) {
                // If Equipment is an array, iterate through each equipment
                for (JsonNode eq : equipmentNode) {
                    String equipmentName = eq.has("Title") ? eq.get("Title").asText() : null;
                    if (eq.has("Connections") && eq.get("Connections").isArray()) {
                        for (JsonNode connNode : eq.get("Connections")) {
                            addConnectorToList(list, connNode, equipmentName);
                            hasEquipmentConnectors = true;
                        }
                    }
                }
            } else if (equipmentNode.isObject()) {
                // If Equipment is a single object (not array)
                String equipmentName = equipmentNode.has("Title") ? equipmentNode.get("Title").asText() : null;
                if (equipmentNode.has("Connections") && equipmentNode.get("Connections").isArray()) {
                    for (JsonNode connNode : equipmentNode.get("Connections")) {
                        addConnectorToList(list, connNode, equipmentName);
                        hasEquipmentConnectors = true;
                    }
                }
            }
        }
        
        // Fallback: if no Equipment or Equipment had no Connections, use Connections directly from station
        if (!hasEquipmentConnectors && stationNode.has("Connections") && stationNode.get("Connections").isArray()) {
            for (JsonNode connNode : stationNode.get("Connections")) {
                addConnectorToList(list, connNode, null);
            }
        }
        
        if (list.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize connectors to JSON", e);
            return null;
        }
    }
    
    /** Helper method to add a connector to the list with optional station name. */
    private void addConnectorToList(List<Map<String, Object>> list, JsonNode connNode, String stationName) {
        String type = connNode.has("ConnectionType") && connNode.get("ConnectionType").has("Title")
                ? connNode.get("ConnectionType").get("Title").asText() : "Unknown";
        double powerKw = connNode.has("PowerKW") ? connNode.get("PowerKW").asDouble() : 0;
        String usageCost = connNode.has("UsageCost") && !connNode.get("UsageCost").isNull()
                ? connNode.get("UsageCost").asText().trim() : null;
        Map<String, Object> map = new java.util.HashMap<>(Map.of("type", type, "powerKw", powerKw));
        if (usageCost != null && !usageCost.isEmpty()) {
            map.put("usageCost", usageCost);
        }
        if (stationName != null && !stationName.isEmpty()) {
            map.put("stationName", stationName);
        }
        list.add(map);
    }

    /**
     * Build URL with optional API key
     */
    private String buildUrl(String format, Object... args) {
        String baseUrl = String.format("%s?%s", OPEN_CHARGE_MAP_API_URL, String.format(format, args));
        if (apiKey != null && !apiKey.trim().isEmpty()) {
            return baseUrl + "&key=" + apiKey;
        }
        return baseUrl;
    }
}
