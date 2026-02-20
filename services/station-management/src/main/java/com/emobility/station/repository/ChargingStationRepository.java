package com.emobility.station.repository;

import com.emobility.station.entity.ChargingStation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface ChargingStationRepository extends JpaRepository<ChargingStation, Long> {
    List<ChargingStation> findByCity(String city);
    List<ChargingStation> findByStatus(ChargingStation.StationStatus status);
    boolean existsByExternalId(String externalId);
    ChargingStation findByExternalId(String externalId);

    /** Намира станция по координати с externalId, започващ с prefix (напр. за съвпадение на Fines scrape). */
    Optional<ChargingStation> findFirstByLatitudeAndLongitudeAndExternalIdStartingWith(
            BigDecimal latitude, BigDecimal longitude, String externalIdPrefix);
}
