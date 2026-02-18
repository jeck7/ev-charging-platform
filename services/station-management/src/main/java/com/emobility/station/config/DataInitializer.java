package com.emobility.station.config;

import com.emobility.station.entity.ChargingStation;
import com.emobility.station.repository.ChargingStationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final ChargingStationRepository repository;

    @Override
    public void run(String... args) {
        if (repository.count() > 0) return;
        repository.save(ChargingStation.builder()
                .name("Munich Central - Fast Charge")
                .address("Hauptbahnhof 1")
                .city("Munich")
                .country("Germany")
                .latitude(new BigDecimal("48.1400"))
                .longitude(new BigDecimal("11.5820"))
                .status(ChargingStation.StationStatus.ACTIVE)
                .build());
        repository.save(ChargingStation.builder()
                .name("Stuttgart eMobility Hub")
                .address("Königstrasse 60")
                .city("Stuttgart")
                .country("Germany")
                .latitude(new BigDecimal("48.7758"))
                .longitude(new BigDecimal("9.1829"))
                .status(ChargingStation.StationStatus.ACTIVE)
                .build());
        repository.save(ChargingStation.builder()
                .name("Berlin Alexanderplatz")
                .address("Alexanderplatz 1")
                .city("Berlin")
                .country("Germany")
                .latitude(new BigDecimal("52.5219"))
                .longitude(new BigDecimal("13.4132"))
                .status(ChargingStation.StationStatus.ACTIVE)
                .build());
    }
}
