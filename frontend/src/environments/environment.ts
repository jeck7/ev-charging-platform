export const environment = {
  production: false,
  // For local development: direct backend access (without gateway)
  // Note: Browser cannot send client certs, so backend should use client-auth=want or none for dev
  stationsApiUrl: 'https://localhost:8082/api',
  sessionsApiUrl: 'https://localhost:8081/api',
  // For Docker with nginx gateway:
  // stationsApiUrl: 'https://localhost:8443/api',
  // sessionsApiUrl: 'https://localhost:8443/api',
  /** OpenRouteService API key – при наличие се използва за маршрути с алтернативи (безплатен ключ от openrouteservice.org) */
  openRouteServiceApiKey: 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImIzMTdjN2Q0Yjc4YjRlMmFiMzYxMDgxZmMyYmQ2OTNhIiwiaCI6Im11cm11cjY0In0=',
};
