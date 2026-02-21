package com.emobility.station.controller;

import com.emobility.station.chargeprice.ChargepriceService;
import com.emobility.station.dto.ChargingStationResponse;
import com.emobility.station.dto.ConnectorInfo;
import com.emobility.station.dto.CreateStationRequest;
import com.emobility.station.ecomovement.EcoMovementService;
import com.emobility.station.dto.UpdateStationRequest;
import com.emobility.station.entity.ChargingStation;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.emobility.station.repository.ChargingStationRepository;
import com.emobility.station.service.FinesScraperService;
import com.emobility.station.service.OpenChargeMapService;
import com.emobility.station.service.StationImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/stations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ChargingStationController {

    private final ChargingStationRepository stationRepository;
    private final ObjectMapper objectMapper;
    private final OpenChargeMapService openChargeMapService;
    private final StationImportService importService;
    private final ChargepriceService chargepriceService;
    private final EcoMovementService ecoMovementService;
    private final FinesScraperService finesScraperService;

    @GetMapping
    public List<ChargingStationResponse> getAllStations(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String country) {
        List<ChargingStation> stations;
        if (city != null) {
            stations = stationRepository.findByCity(city);
        } else if (status != null) {
            try {
                stations = stationRepository.findByStatus(ChargingStation.StationStatus.valueOf(status));
            } catch (IllegalArgumentException e) {
                stations = stationRepository.findAll();
            }
        } else if (country != null) {
            // Търси по country code (BG) или име (Bulgaria), case-insensitive
            // Ако е подаден "BG", търси и "BG" и "Bulgaria"
            String countryUpper = country.toUpperCase();
            if ("BG".equals(countryUpper) || "BULGARIA".equals(countryUpper)) {
                stations = stationRepository.findAll().stream()
                    .filter(s -> {
                        String sCountry = s.getCountry();
                        if (sCountry == null) return false;
                        String sCountryUpper = sCountry.toUpperCase();
                        return "BG".equals(sCountryUpper) || "BULGARIA".equals(sCountryUpper) || sCountryUpper.contains("BULGARIA");
                    })
                    .collect(Collectors.toList());
            } else {
                stations = stationRepository.findByCountryIgnoreCase(country);
            }
        } else {
            stations = stationRepository.findAll();
        }
        return stations.stream().map(ChargingStationResponse::from).collect(Collectors.toList());
    }

    /**
     * Създай нова станция (ръчно добавена). externalId се задава като "manual-{uuid}".
     */
    @PostMapping
    public ResponseEntity<ChargingStationResponse> createStation(@RequestBody CreateStationRequest body) {
        if (body.getName() == null || body.getName().isBlank() || body.getAddress() == null || body.getAddress().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        String connectorsJson = null;
        if (body.getConnectors() != null && !body.getConnectors().isEmpty()) {
            try {
                connectorsJson = objectMapper.writeValueAsString(body.getConnectors());
            } catch (JsonProcessingException e) {
                return ResponseEntity.badRequest().build();
            }
        } else if (body.getMaxPowerKw() != null || body.getUsageCost() != null) {
            ConnectorInfo single = ConnectorInfo.builder()
                    .type("CCS")
                    .powerKw(body.getMaxPowerKw() != null ? body.getMaxPowerKw().doubleValue() : null)
                    .usageCost(body.getUsageCost())
                    .build();
            try {
                connectorsJson = objectMapper.writeValueAsString(Collections.singletonList(single));
            } catch (JsonProcessingException e) {
                return ResponseEntity.badRequest().build();
            }
        }
        ChargingStation station = ChargingStation.builder()
                .name(body.getName().trim())
                .address(body.getAddress().trim())
                .city(body.getCity() != null ? body.getCity().trim() : null)
                .country(body.getCountry() != null ? body.getCountry().trim() : null)
                .latitude(body.getLatitude())
                .longitude(body.getLongitude())
                .operator(body.getOperator() != null ? body.getOperator().trim() : null)
                .maxPowerKw(body.getMaxPowerKw())
                .connectorsJson(connectorsJson)
                .usageCost(body.getUsageCost() != null && !body.getUsageCost().isBlank() ? body.getUsageCost().trim() : null)
                .status(ChargingStation.StationStatus.ACTIVE)
                .externalId("manual-" + UUID.randomUUID())
                .build();
        station = stationRepository.save(station);
        return ResponseEntity.ok(ChargingStationResponse.from(station));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChargingStationResponse> getStation(@PathVariable Long id) {
        return stationRepository.findById(id)
                .map(s -> ResponseEntity.ok(ChargingStationResponse.from(s)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Обнови станция (напр. цена за локацията).
     * Body: { "usageCost": "0.39 EUR / kWh" }
     */
    @PatchMapping("/{id}")
    public ResponseEntity<ChargingStationResponse> updateStation(
            @PathVariable Long id,
            @RequestBody UpdateStationRequest body) {
        return stationRepository.findById(id)
                .map(s -> {
                    if (body.getUsageCost() != null) {
                        s.setUsageCost(body.getUsageCost().trim().isEmpty() ? null : body.getUsageCost().trim());
                    }
                    return ResponseEntity.ok(ChargingStationResponse.from(stationRepository.save(s)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("UP");
    }

    /**
     * Fetch nearby stations from Open Charge Map API
     */
    @GetMapping("/openchargemap/nearby")
    public ResponseEntity<List<Map<String, Object>>> getNearbyStationsFromOCM(
            @RequestParam BigDecimal latitude,
            @RequestParam BigDecimal longitude,
            @RequestParam(required = false, defaultValue = "10") Integer distance) {
        List<Map<String, Object>> stations = openChargeMapService.fetchNearbyStations(latitude, longitude, distance);
        return ResponseEntity.ok(stations);
    }

    /**
     * Fetch stations by country from Open Charge Map API
     */
    @GetMapping("/openchargemap/country/{countryCode}")
    public ResponseEntity<List<Map<String, Object>>> getStationsByCountry(@PathVariable String countryCode) {
        List<Map<String, Object>> stations = openChargeMapService.fetchStationsByCountry(countryCode);
        return ResponseEntity.ok(stations);
    }

    /**
     * Import all stations from Open Charge Map for a country into local database
     * Example: POST /api/stations/import/bg - импортира всички станции в България
     * Runs asynchronously - returns job ID immediately
     */
    @PostMapping("/import/{countryCode}")
    public ResponseEntity<Map<String, Object>> importStations(@PathVariable String countryCode) {
        String jobId = importService.startImport(countryCode.toUpperCase(), false);
        return ResponseEntity.accepted().body(Map.of(
                "jobId", jobId,
                "country", countryCode.toUpperCase(),
                "status", "STARTED",
                "message", "Import job started. Use GET /api/stations/import/status/" + jobId + " to check progress"
        ));
    }

    /**
     * Import stations from Open Charge Map for a country filtered by operator (e.g. Fines Charging).
     * Resolves operator ID from OCM reference data. If operator not found, imports all for country.
     * Example: POST /api/stations/import/fines - импортира станции на Fines за България от OCM
     */
    @PostMapping("/import/fines")
    public ResponseEntity<Map<String, Object>> importFinesStations() {
        String countryCode = "BG";
        String jobId = importService.startImportByOperator(countryCode, "Fines", false);
        return ResponseEntity.accepted().body(Map.of(
                "jobId", jobId,
                "country", countryCode,
                "operator", "Fines",
                "status", "STARTED",
                "message", "Import Fines (OCM operator) started. Use GET /api/stations/import/status/" + jobId + " to check progress"
        ));
    }

    /**
     * Скрапиране на локации от https://finescharging.com/locations и импорт в БД.
     * Изисква Node.js и изпълнено в tools/fines-scraper: npm install && npx playwright install chromium.
     * Стартиране от корена на проекта (ev-charging-platform), за да намери tools/fines-scraper.
     */
    @PostMapping("/import/fines-scrape")
    public ResponseEntity<Map<String, Object>> importFinesScrape() {
        var result = finesScraperService.runScraperAndImport();
        if (result.isSuccess()) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "imported", result.getImported(),
                    "updated", result.getUpdated(),
                    "total", result.getTotal(),
                    "message", "Imported " + result.getImported() + ", updated " + result.getUpdated() + " (total from scrape: " + result.getTotal() + ")"
            ));
        }
        return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", result.getError() != null ? result.getError() : "Scraper failed"
        ));
    }

    /**
     * Get import job status
     */
    @GetMapping("/import/status/{jobId}")
    public ResponseEntity<StationImportService.ImportJobStatus> getImportStatus(@PathVariable String jobId) {
        var status = importService.getImportStatus(jobId);
        if (status == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(status);
    }

    /**
     * Get latest import status for country
     */
    @GetMapping("/import/status/country/{countryCode}")
    public ResponseEntity<StationImportService.ImportJobStatus> getLatestImportStatus(@PathVariable String countryCode) {
        var status = importService.getLatestImportStatus(countryCode.toUpperCase());
        if (status == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(status);
    }

    /**
     * Enrich stations with prices from Chargeprice and/or Eco-Movement (match by coordinates).
     * Configure chargeprice.api.key and/or ecomovement.api.token. Example: POST /api/stations/enrich-prices/BG
     */
    @PostMapping("/enrich-prices/{countryCode}")
    public ResponseEntity<Map<String, Object>> enrichPrices(@PathVariable String countryCode) {
        String country = countryCode.toUpperCase();
        int fromChargeprice = 0;
        int fromEcoMovement = 0;
        if (chargepriceService.isConfigured()) {
            fromChargeprice = chargepriceService.enrichStationsWithPrices(country);
        }
        if (ecoMovementService.isConfigured()) {
            fromEcoMovement = ecoMovementService.enrichStationsWithPrices(country);
        }
        if (fromChargeprice == 0 && fromEcoMovement == 0 && !chargepriceService.isConfigured() && !ecoMovementService.isConfigured()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "No price provider configured",
                    "hint", "Set chargeprice.api.key (demo: https://tally.so/r/w4pJAX) and/or ecomovement.api.token"
            ));
        }
        return ResponseEntity.ok(Map.of(
                "country", country,
                "stationsEnrichedFromChargeprice", fromChargeprice,
                "stationsEnrichedFromEcoMovement", fromEcoMovement,
                "message", "Stations updated with prices where available"
        ));
    }

    /**
     * Status of price providers (Chargeprice, Eco-Movement).
     */
    @GetMapping("/enrich-prices/status")
    public ResponseEntity<Map<String, Object>> enrichPricesStatus() {
        return ResponseEntity.ok(Map.of(
                "chargeprice", chargepriceService.isConfigured(),
                "ecomovement", ecoMovementService.isConfigured()
        ));
    }

    /**
     * Get station statistics
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStationStats(
            @RequestParam(required = false) String countryCode) {
        long totalStations = stationRepository.count();
        long activeStations = stationRepository.findByStatus(ChargingStation.StationStatus.ACTIVE).size();
        
        Map<String, Object> stats = Map.of(
                "totalStations", totalStations,
                "activeStations", activeStations,
                "inactiveStations", totalStations - activeStations
        );
        
        if (countryCode != null) {
            long countryStations = importService.getStationCount(countryCode.toUpperCase());
            var latestImport = importService.getLatestImportStatus(countryCode.toUpperCase());
            
            Map<String, Object> countryStats = new java.util.HashMap<>(stats);
            countryStats.put("countryStations", countryStations);
            if (latestImport != null) {
                countryStats.put("lastImport", Map.of(
                        "date", latestImport.getCompletedAt() != null ? latestImport.getCompletedAt().toString() : "N/A",
                        "imported", latestImport.getImported(),
                        "updated", latestImport.getUpdated()
                ));
            }
            return ResponseEntity.ok(countryStats);
        }
        
        return ResponseEntity.ok(stats);
    }
}
