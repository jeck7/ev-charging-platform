export const environment = {
  production: false,
  // Use HTTPS through nginx gateway (which handles mTLS)
  stationsApiUrl: 'https://localhost:8443/api',
  sessionsApiUrl: 'https://localhost:8443/api',
  // For direct backend access (development only, requires client cert)
  // stationsApiUrl: 'https://localhost:8082/api',
  // sessionsApiUrl: 'https://localhost:8081/api',
};
