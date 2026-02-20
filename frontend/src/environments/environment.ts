export const environment = {
  production: false,
  // For local development: use proxy (no SSL issues)
  // Proxy is configured in proxy.conf.json to forward /api/* to backend
  stationsApiUrl: '/api',
  sessionsApiUrl: '/api',
  // For Docker with nginx gateway:
  // stationsApiUrl: 'https://localhost:8443/api',
  // sessionsApiUrl: 'https://localhost:8443/api',
  /** OpenRouteService API key – при наличие се използва за маршрути с алтернативи (безплатен ключ от openrouteservice.org) */
  openRouteServiceApiKey: 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImIzMTdjN2Q0Yjc4YjRlMmFiMzYxMDgxZmMyYmQ2OTNhIiwiaCI6Im11cm11cjY0In0=',
};
