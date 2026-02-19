package com.emobility.station.config;

import com.emobility.station.entity.ChargingStation;
import com.emobility.station.repository.ChargingStationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Добавя ръчно подадени станции (напр. Fines Charging), ако още не съществуват в БД.
 */
@Component
@Order(100)
@RequiredArgsConstructor
@Slf4j
public class ManualStationSeeder implements CommandLineRunner {

    private final ChargingStationRepository repository;

    @Override
    public void run(String... args) {
        seedRoute80Prolesha();
    }

    /** Route 80, Пролеша 2228 – Sungrow, 2x CCS 120kW, 0.39 EUR/kWh */
    private void seedRoute80Prolesha() {
        boolean exists = repository.findAll().stream()
                .anyMatch(s -> s.getAddress() != null && s.getAddress().contains("Пролеша 2228"));
        if (exists) {
            return;
        }
        String connectorsJson = "[{\"type\":\"CCS\",\"powerKw\":120,\"usageCost\":\"0.39 EUR / kWh\"},{\"type\":\"CCS\",\"powerKw\":120,\"usageCost\":\"0.39 EUR / kWh\"}]";
        ChargingStation station = ChargingStation.builder()
                .name("Route 80")
                .address("8, Пролеша 2228, България")
                .city("Пролеша")
                .country("BG")
                .latitude(new BigDecimal("42.7778"))
                .longitude(new BigDecimal("23.14445"))
                .operator("Sungrow")
                .maxPowerKw(new BigDecimal("120"))
                .connectorsJson(connectorsJson)
                .usageCost("0.39 EUR / kWh")
                .status(ChargingStation.StationStatus.ACTIVE)
                .externalId("manual-route80-prolesha")
                .build();
        repository.save(station);
        log.info("Seeded manual station: Route 80, Пролеша 2228");
    }
}
