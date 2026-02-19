package com.emobility.station.repository;

import com.emobility.station.entity.ChargingStation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChargingStationRepository extends JpaRepository<ChargingStation, Long> {
    List<ChargingStation> findByCity(String city);
    List<ChargingStation> findByStatus(ChargingStation.StationStatus status);
    boolean existsByExternalId(String externalId);
    ChargingStation findByExternalId(String externalId);
}
