package com.emobility.station.controller;

import com.emobility.station.dto.ChargingStationResponse;
import com.emobility.station.entity.ChargingStation;
import com.emobility.station.repository.ChargingStationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/stations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ChargingStationController {

    private final ChargingStationRepository stationRepository;

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

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("UP");
    }
}
