package com.emobility.station.dto;

import lombok.Data;

@Data
public class UpdateStationRequest {
    /** Цена за локацията, напр. "0.39 EUR / kWh". Може да се подаде празен string за изтриване. */
    private String usageCost;
}
