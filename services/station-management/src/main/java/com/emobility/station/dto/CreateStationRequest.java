package com.emobility.station.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CreateStationRequest {
    private String name;
    private String address;
    private String city;
    private String country;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String operator;
    private BigDecimal maxPowerKw;
    /** Цена по подразбиране за локацията, напр. "0.39 EUR / kWh". */
    private String usageCost;
    /** Конектори – ако е празно, се използва maxPowerKw + usageCost за един конектор. */
    private List<ConnectorInfo> connectors;
}
