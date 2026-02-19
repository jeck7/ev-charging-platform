package com.emobility.station.controller;

import com.emobility.station.chargeprice.ChargepriceService;
import com.emobility.station.dto.ChargingStationResponse;
import com.emobility.station.ecomovement.EcoMovementService;
import com.emobility.station.dto.UpdateStationRequest;
import com.emobility.station.entity.ChargingStation;
import com.emobility.station.repository.ChargingStationRepository;
import com.emobility.station.service.OpenChargeMapService;
import com.emobility.station.service.StationImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/stations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ChargingStationController {

    private final ChargingStationRepository stationRepository;
    private final OpenChargeMapService openChargeMapService;
    private final StationImportService importService;
    private final ChargepriceService chargepriceService;
    private final EcoMovementService ecoMovementService;

    @GetMapping
    public List<ChargingStationResponse> getAllStations(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String status) {
        List<ChargingStation> stations;
        if (city != null) {
            stations = stationRepository.findByCity(city);
        } else if (status != null) {
            try {
                stations = stationRepository.findByStatus(ChargingStation.StationStatus.valueOf(status));
            } catch (IllegalArgumentException e) {
                stations = stationRepository.findAll();
            }
        } else {
            stations = stationRepository.findAll();
        }
        return stations.stream().map(ChargingStationResponse::from).collect(Collectors.toList());
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
