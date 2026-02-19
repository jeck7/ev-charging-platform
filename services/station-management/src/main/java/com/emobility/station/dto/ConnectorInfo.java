package com.emobility.station.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConnectorInfo {
    private String type;      // e.g. "CCS", "Type 2"
    private Double powerKw;
    private String usageCost;  // e.g. "0.39 EUR / kWh" when provided by Open Charge Map
}
