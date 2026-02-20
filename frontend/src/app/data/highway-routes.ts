/**
 * Точки по магистрали за трасиране на картата (следват реалното трасе по OSM).
 * Формат: [lat, lng][] (Leaflet order).
 * Трасето се зарежда от JSON при нужда.
 */
export type RoutePoint = [number, number];

const TRAKIA_A1_JSON = 'assets/routes/trakia-a1-route.json';

let trakiaRouteCache: RoutePoint[] | null = null;

/**
 * Зарежда трасето на магистрала Тракия (A1) от JSON. Кешира резултата.
 */
export function loadTrakiaA1Route(): Promise<RoutePoint[]> {
  if (trakiaRouteCache) return Promise.resolve(trakiaRouteCache);
  return fetch(TRAKIA_A1_JSON)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data: number[][]) => {
      if (!Array.isArray(data)) throw new Error('Invalid route format');
      trakiaRouteCache = data.map((p) => [p[0], p[1]] as RoutePoint);
      return trakiaRouteCache;
    });
}
