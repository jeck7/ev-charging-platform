export interface ConnectorInfo {
  type: string;
  powerKw: number;
  usageCost?: string;
}

export interface ChargingStation {
  id: number;
  name: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  status: string;
  operator?: string;
  maxPowerKw?: number;
  connectors?: ConnectorInfo[];
  /** Цена по подразбиране за локацията, напр. "0.39 EUR / kWh". */
  usageCost?: string;
}
