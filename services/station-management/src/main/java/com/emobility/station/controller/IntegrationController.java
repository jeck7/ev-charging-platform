package com.emobility.station.controller;

import com.emobility.station.iso15118.ISO15118Service;
import com.emobility.station.tesla.TeslaApiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.cert.X509Certificate;
import java.util.List;
import java.util.Map;

/**
 * Controller for external integrations:
 * - Open Charge Map (already in ChargingStationController)
 * - OCPP (WebSocket, no REST endpoint needed)
 * - ISO 15118 Plug & Charge
 * - Tesla API
 */
@RestController
@RequestMapping("/api/integrations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class IntegrationController {

    private final ISO15118Service iso15118Service;
    private final TeslaApiService teslaApiService;

    /**
     * ISO 15118 Plug & Charge authentication endpoint
     */
    @PostMapping("/iso15118/authenticate")
    public ResponseEntity<Map<String, Object>> authenticatePlugAndCharge(
            @RequestBody Map<String, String> request) {
        // In real implementation, parse X509 certificates from request
        // For now, return mock response
        return ResponseEntity.ok(Map.of(
                "success", true,
                "vehicleId", "vehicle-123",
                "hasContract", true
        ));
    }

    /**
     * Tesla API - Get vehicles
     */
    @GetMapping("/tesla/vehicles")
    public ResponseEntity<List<Map<String, Object>>> getTeslaVehicles(
            @RequestHeader("X-Tesla-Access-Token") String accessToken) {
        List<Map<String, Object>> vehicles = teslaApiService.getVehicles(accessToken);
        return ResponseEntity.ok(vehicles);
    }

    /**
     * Tesla API - Get charging state
     */
    @GetMapping("/tesla/vehicles/{vehicleId}/charging")
    public ResponseEntity<Map<String, Object>> getTeslaChargingState(
            @RequestHeader("X-Tesla-Access-Token") String accessToken,
            @PathVariable String vehicleId) {
        Map<String, Object> state = teslaApiService.getChargingState(accessToken, vehicleId);
        return ResponseEntity.ok(state);
    }

    /**
     * Tesla API - Start charging
     */
    @PostMapping("/tesla/vehicles/{vehicleId}/charging/start")
    public ResponseEntity<Map<String, Object>> startTeslaCharging(
            @RequestHeader("X-Tesla-Access-Token") String accessToken,
            @PathVariable String vehicleId) {
        boolean success = teslaApiService.startCharging(accessToken, vehicleId);
        return ResponseEntity.ok(Map.of("success", success));
    }

    /**
     * Tesla API - Stop charging
     */
    @PostMapping("/tesla/vehicles/{vehicleId}/charging/stop")
    public ResponseEntity<Map<String, Object>> stopTeslaCharging(
            @RequestHeader("X-Tesla-Access-Token") String accessToken,
            @PathVariable String vehicleId) {
        boolean success = teslaApiService.stopCharging(accessToken, vehicleId);
        return ResponseEntity.ok(Map.of("success", success));
    }
}
