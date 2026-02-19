package com.emobility.station.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "charging_stations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChargingStation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String address;

    private String city;
    private String country;

    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StationStatus status;

    // External ID from Open Charge Map (to avoid duplicates)
    @Column(unique = true)
    private String externalId;

    // Additional fields for better station management
    private String operator;
    private BigDecimal maxPowerKw; // Maximum power rating

    public enum StationStatus {
        ACTIVE, INACTIVE, MAINTENANCE
    }
}
