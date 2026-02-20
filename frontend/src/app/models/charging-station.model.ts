export interface ConnectorInfo {
  type: string;
  powerKw: number;
  usageCost?: string;
  stationName?: string; // e.g. "Hypercharger" - name of the specific charging station/equipment
}

export interface ChargingStation {
  id: number;
  name: string;
  address: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  operator?: string;
  maxPowerKw?: number;
  connectors?: ConnectorInfo[];
  /** Цена по подразбиране за локацията, напр. "0.39 EUR / kWh". */
  usageCost?: string;
}
