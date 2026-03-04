import { Injectable } from '@angular/core';

export type Lang = 'bg' | 'en';

const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  bg: {
    // App / nav
    'app.title': 'eMobility EV Charging',
    'app.subtitle': 'Driver Portal',
    'nav.home': 'Начало',
    'nav.admin': 'Админ',
    'nav.login': 'Вход',
    'nav.logout': 'Изход',

    // Footer
    'footer.tagline':
      'Портал за зареждане на електропревозни средства. Намерете станции, цени и маршрути.',
    'footer.nav': 'Навигация',
    'footer.nav.map': 'Станции на картата',
    'footer.nav.adminPanel': 'Админ панел',
    'footer.platform': 'Платформа',
    'footer.platform.stationsBg': 'Зарядни станции в България',
    'footer.platform.routeFilter': 'Филтър по маршрут (напр. А1 Тракия)',
    'footer.platform.pricesConnectors': 'Цени и типове конектори',
    'footer.platform.ocmImport': 'Импорт от Open Charge Map',
    'footer.useful': 'Полезно',
    'footer.useful.distance': 'Разстояние до станция',
    'footer.useful.status': 'Статус: активна / поддръжка',
    'footer.useful.mapsLinks': 'Връзка към Google Maps и Waze',
    'footer.copy': '2026 eMobility EV Charging Platform. Всички права запазени.',

    // Auth / login
    'auth.login': 'Вход',
    'auth.register': 'Регистрация',
    'auth.login.subtitle': 'Влезте в акаунта си',
    'auth.register.subtitle': 'Създайте акаунт',
    'auth.name': 'Име',
    'auth.email': 'Имейл',
    'auth.password': 'Парола',
    'auth.passwordWithHint': 'Парола (мин. 6 символа)',
    'auth.showPassword': 'Покажи парола',
    'auth.hidePassword': 'Скрий парола',
    'auth.noAccount': 'Нямате акаунт? Регистрирайте се',
    'auth.haveAccount': 'Вече имате акаунт? Влезте',
    'auth.error.missingEmailPassword': 'Моля, въведете имейл и парола.',
    'auth.error.loginFailed':
      'Грешка при вход. Проверете имейл и парола.',
    'auth.error.missingAllFields': 'Моля, попълнете всички полета.',
    'auth.error.passwordTooShort': 'Паролата трябва да е поне 6 символа.',
    'auth.error.registerFailed': 'Грешка при регистрация.',

    // Stations list
    'stations.loading': 'Зареждане на станции...',
    'stations.retry': 'Опитай отново',
    'stations.importPrompt.title':
      'Няма много станции в базата данни',
    'stations.importPrompt.body':
      'Импортирайте станции от Open Charge Map за България, за да видите всички налични станции (включително в Люлин).',
    'stations.importPrompt.button':
      'Импортирай станции от България',
    'stations.sidebar.searchTitle':
      'Търсене на Зарядни станции',
    'stations.sidebar.routeTitle':
      'Покажи само станции по маршрут',
    'stations.sidebar.fromLabel': 'Пътувам от',
    'stations.sidebar.fromPlaceholder': 'напр. София',
    'stations.sidebar.toLabel': 'Пътувам до',
    'stations.sidebar.toPlaceholder': 'напр. Пловдив',
    'stations.sidebar.routeButton': 'Маршрут',
    'stations.sidebar.clearRouteTooltip': 'Изчисти маршрут',
    'stations.sidebar.connectorTitle':
      'Само локации с конектор',
    'stations.sidebar.minPowerTitle':
      'Локации с мощност от минимум',
    'stations.sidebar.viewToggle.mapOnly': 'Само карта',
    'stations.sidebar.viewToggle.split': 'Карта + списък',
    'stations.location.loadingRoute': 'Зареждане на маршрут...',
    'stations.location.loading':
      'Определяне на вашата локация...',
    'stations.location.sortedByDistance':
      'Станции сортирани по близост до вас',
    'stations.summary.count':
      'Общо заредени станции за {{country}}: {{count}}',
    'stations.search.label': 'Търси по име',
    'stations.search.placeholder':
      'Име, адрес, град...',
    'stations.search.clearTooltip': 'Изчисти',
    'stations.noResults':
      'Няма станции при тези филтри.',
    'stations.geo.notSupported':
      'Геолокацията не се поддържа от браузъра.',
    'stations.geo.notFound':
      'Локацията не е намерена. Показваме станции по подразбиране.',

    // Admin panel
    'admin.title': 'Админ Панел - Импорт на Станции',
    'admin.stats': 'Статистика',
    'admin.stats.total': 'Общо Станции',
    'admin.stats.active': 'Активни',
    'admin.stats.inCountry': 'В {{country}}',
    'admin.stats.lastImport': 'Последен импорт:',
    'admin.stats.lastImportSummary':
      'Импортирани: {{imported}}, Актуализирани: {{updated}}',
    'admin.import.title': 'Импорт от Open Charge Map',
    'admin.import.countryLabel': 'Държава',
    'admin.import.countryHint':
      'Използва се и за списъка със станции на началната страница.',
    'admin.import.startButton':
      'Стартирай Импорт',
    'admin.import.starting':
      'Импортиране...',
    'admin.import.finesButton':
      'Импорт Fines (от OCM)',
    'admin.import.finesScrapeButton': 'Fines (скрапинг)',
    'admin.import.finesScrapeRunning':
      'Скрапинг и импорт в процес. Моля изчакайте (може да отнеме до минута).',
    'admin.import.finesScrapeSummary':
      'Скрапинг: импортирани {{imported}}, актуализирани {{updated}} (общо {{total}})',
    'admin.import.statusTitle': 'Статус на Импорт',
    'admin.import.status.running': 'Импортиране в процес...',
    'admin.import.status.completed.imported':
      'Импортирани:',
    'admin.import.status.completed.updated':
      'Актуализирани:',
    'admin.import.status.completed.skipped':
      'Пропуснати:',
    'admin.import.status.completed.completedAt':
      'Завършен:',
    'admin.import.status.failed':
      'Възникна грешка при импорта.',
    'admin.enrich.title':
      'Обогатяване на цени (Chargeprice / Eco-Movement)',
    'admin.enrich.desc':
      'Попълва цени (EUR/kWh) за станциите чрез съпоставяне по координати с Chargeprice или Eco-Movement. Задайте chargeprice.api.key в сървъра (demo: заявка за достъп).',
    'admin.enrich.chargepriceConfigured':
      'конфигуриран',
    'admin.enrich.chargepriceNotConfigured':
      'не е зададен ключ',
    'admin.enrich.ecomovementConfigured':
      'конфигуриран',
    'admin.enrich.ecomovementNotConfigured':
      'не е зададен токен',
    'admin.enrich.button':
      'Обогати цени за {{country}}',
    'admin.info.text':
      'Импортът се извършва автоматично всеки ден в 02:00 за България. Можете да стартирате ръчен импорт по всяко време.',

    // Station detail
    'stationDetail.back': 'Назад към станциите',
    'stationDetail.loading': 'Зареждане...',
    'stationDetail.errorNotFound': 'Станцията не е намерена',
    'stationDetail.status.active': 'Активна',
    'stationDetail.status.maintenance': 'Поддръжка',
    'stationDetail.howToGetThere': 'Как да стигна',
    'stationDetail.connectorsTitle':
      'На локацията има следните зарядни станции',
    'stationDetail.groupTitlePrefix': 'Станция',
    'stationDetail.connectorDescription':
      ' конектор с максимална мощност {{power}} kW',
    'stationDetail.pricePrefix': 'и цена',
    'stationDetail.noConnectors':
      'Няма въведени данни за конектори за тази станция.',
    'stationDetail.adminPanelLink': 'админ панела',
    'stationDetail.pricesHint':
      'Цените можете да попълните чрез „Обогатяване на цени (Chargeprice)“.',
  },
  en: {
    // App / nav
    'app.title': 'eMobility EV Charging',
    'app.subtitle': 'Driver Portal',
    'nav.home': 'Home',
    'nav.admin': 'Admin',
    'nav.login': 'Login',
    'nav.logout': 'Logout',

    // Footer
    'footer.tagline':
      'EV charging driver portal. Find stations, prices and routes.',
    'footer.nav': 'Navigation',
    'footer.nav.map': 'Stations map',
    'footer.nav.adminPanel': 'Admin panel',
    'footer.platform': 'Platform',
    'footer.platform.stationsBg': 'Charging stations in Bulgaria',
    'footer.platform.routeFilter':
      'Route filter (e.g. A1 Trakia)',
    'footer.platform.pricesConnectors':
      'Prices and connector types',
    'footer.platform.ocmImport':
      'Import from Open Charge Map',
    'footer.useful': 'Useful',
    'footer.useful.distance': 'Distance to station',
    'footer.useful.status':
      'Status: active / maintenance',
    'footer.useful.mapsLinks':
      'Links to Google Maps and Waze',
    'footer.copy':
      '2026 eMobility EV Charging Platform. All rights reserved.',

    // Auth / login
    'auth.login': 'Log in',
    'auth.register': 'Register',
    'auth.login.subtitle': 'Log in to your account',
    'auth.register.subtitle': 'Create an account',
    'auth.name': 'Name',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.passwordWithHint': 'Password (min. 6 characters)',
    'auth.showPassword': 'Show password',
    'auth.hidePassword': 'Hide password',
    'auth.noAccount': "Don't have an account? Register",
    'auth.haveAccount': 'Already have an account? Log in',
    'auth.error.missingEmailPassword':
      'Please enter email and password.',
    'auth.error.loginFailed':
      'Login failed. Please check email and password.',
    'auth.error.missingAllFields':
      'Please fill in all fields.',
    'auth.error.passwordTooShort':
      'Password must be at least 6 characters.',
    'auth.error.registerFailed':
      'Registration failed.',

    // Stations list
    'stations.loading': 'Loading stations...',
    'stations.retry': 'Try again',
    'stations.importPrompt.title':
      'There are not many stations in the database',
    'stations.importPrompt.body':
      'Import stations from Open Charge Map for Bulgaria to see all available stations (including in Lyulin).',
    'stations.importPrompt.button':
      'Import stations for Bulgaria',
    'stations.sidebar.searchTitle':
      'Search charging stations',
    'stations.sidebar.routeTitle':
      'Show only stations along route',
    'stations.sidebar.fromLabel': 'Travelling from',
    'stations.sidebar.fromPlaceholder': 'e.g. Sofia',
    'stations.sidebar.toLabel': 'Travelling to',
    'stations.sidebar.toPlaceholder': 'e.g. Plovdiv',
    'stations.sidebar.routeButton': 'Route',
    'stations.sidebar.clearRouteTooltip': 'Clear route',
    'stations.sidebar.connectorTitle':
      'Only locations with connector',
    'stations.sidebar.minPowerTitle':
      'Locations with minimum power',
    'stations.sidebar.viewToggle.mapOnly': 'Map only',
    'stations.sidebar.viewToggle.split': 'Map + list',
    'stations.location.loadingRoute':
      'Loading route...',
    'stations.location.loading':
      'Determining your location...',
    'stations.location.sortedByDistance':
      'Stations sorted by distance from you',
    'stations.summary.count':
      'Total loaded stations for {{country}}: {{count}}',
    'stations.search.label': 'Search by name',
    'stations.search.placeholder':
      'Name, address, city...',
    'stations.search.clearTooltip': 'Clear',
    'stations.noResults':
      'No stations for these filters.',
    'stations.geo.notSupported':
      'Geolocation is not supported by the browser.',
    'stations.geo.notFound':
      'Location not found. Showing default stations.',

    // Admin panel
    'admin.title': 'Admin Panel - Station Import',
    'admin.stats': 'Statistics',
    'admin.stats.total': 'Total stations',
    'admin.stats.active': 'Active',
    'admin.stats.inCountry': 'In {{country}}',
    'admin.stats.lastImport': 'Last import:',
    'admin.stats.lastImportSummary':
      'Imported: {{imported}}, Updated: {{updated}}',
    'admin.import.title': 'Import from Open Charge Map',
    'admin.import.countryLabel': 'Country',
    'admin.import.countryHint':
      'Also used for the station list on the home page.',
    'admin.import.startButton': 'Start import',
    'admin.import.starting': 'Importing...',
    'admin.import.finesButton':
      'Import Fines (from OCM)',
    'admin.import.finesScrapeButton': 'Fines (scraping)',
    'admin.import.finesScrapeRunning':
      'Scraping and import in progress. Please wait (can take up to a minute).',
    'admin.import.finesScrapeSummary':
      'Scraping: imported {{imported}}, updated {{updated}} (total {{total}})',
    'admin.import.statusTitle': 'Import status',
    'admin.import.status.running': 'Import in progress...',
    'admin.import.status.completed.imported':
      'Imported:',
    'admin.import.status.completed.updated':
      'Updated:',
    'admin.import.status.completed.skipped':
      'Skipped:',
    'admin.import.status.completed.completedAt':
      'Completed:',
    'admin.import.status.failed':
      'Import failed.',
    'admin.enrich.title':
      'Enrich prices (Chargeprice / Eco-Movement)',
    'admin.enrich.desc':
      'Fills in prices (EUR/kWh) by matching with Chargeprice or Eco-Movement using coordinates. Set chargeprice.api.key on the server (demo: request access).',
    'admin.enrich.chargepriceConfigured':
      'configured',
    'admin.enrich.chargepriceNotConfigured':
      'no key set',
    'admin.enrich.ecomovementConfigured':
      'configured',
    'admin.enrich.ecomovementNotConfigured':
      'no token set',
    'admin.enrich.button':
      'Enrich prices for {{country}}',
    'admin.info.text':
      'Import runs automatically every day at 02:00 for Bulgaria. You can start a manual import at any time.',

    // Station detail
    'stationDetail.back': 'Back to stations',
    'stationDetail.loading': 'Loading...',
    'stationDetail.errorNotFound': 'Station not found',
    'stationDetail.status.active': 'Active',
    'stationDetail.status.maintenance': 'Maintenance',
    'stationDetail.howToGetThere': 'How to get there',
    'stationDetail.connectorsTitle':
      'The location has the following charging points',
    'stationDetail.groupTitlePrefix': 'Charger',
    'stationDetail.connectorDescription':
      ' connector with maximum power {{power}} kW',
    'stationDetail.pricePrefix': 'and price',
    'stationDetail.noConnectors':
      'No connector data is available for this station.',
    'stationDetail.adminPanelLink': 'admin panel',
    'stationDetail.pricesHint':
      'You can populate prices via “Enrich prices (Chargeprice)”.',
  },
};

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  private lang: Lang;

  constructor() {
    const stored =
      (typeof localStorage !== 'undefined'
        ? (localStorage.getItem('lang') as Lang | null)
        : null) || 'bg';
    this.lang = stored === 'en' ? 'en' : 'bg';
  }

  get currentLang(): Lang {
    return this.lang;
  }

  setLang(lang: Lang): void {
    if (lang !== 'bg' && lang !== 'en') return;
    this.lang = lang;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lang', lang);
    }
  }

  t(key: string, params?: Record<string, string | number>): string {
    const base =
      TRANSLATIONS[this.lang][key] ??
      TRANSLATIONS['bg'][key] ??
      key;
    if (!params) return base;
    return Object.keys(params).reduce((acc, p) => {
      const re = new RegExp(`{{\\s*${p}\\s*}}`, 'g');
      return acc.replace(re, String(params[p]));
    }, base);
  }
}

