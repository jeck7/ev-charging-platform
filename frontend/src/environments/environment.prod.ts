export const environment = {
  production: true,
  stationsApiUrl: 'https://station-management-production-xxxx.up.railway.app/api',
  sessionsApiUrl: 'https://charging-sessions-production-yyyy.up.railway.app/api',
  /** OpenRouteService API key – при наличие се използва за маршрути с алтернативи. Може да се override-не с ENV ако желаеш. */
  openRouteServiceApiKey: undefined as string | undefined,
};
