import { Injectable, signal } from '@angular/core';
import type { RoutePoint } from '../data/highway-routes';

const STORAGE_KEY = 'ev_charging_route_state';

@Injectable({
  providedIn: 'root',
})
export class RouteSearchStateService {
  private routeFromSignal = signal('');
  private routeToSignal = signal('');
  private routeSignal = signal<RoutePoint[] | null>(null);
  private routeErrorSignal = signal<string | null>(null);

  readonly routeFrom = this.routeFromSignal.asReadonly();
  readonly routeTo = this.routeToSignal.asReadonly();
  readonly route = this.routeSignal.asReadonly();
  readonly routeError = this.routeErrorSignal.asReadonly();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as { from?: string; to?: string; route?: number[][]; error?: string };
      if (data.from != null) this.routeFromSignal.set(String(data.from));
      if (data.to != null) this.routeToSignal.set(String(data.to));
      if (data.error != null) this.routeErrorSignal.set(String(data.error));
      if (Array.isArray(data.route) && data.route.length > 0) {
        this.routeSignal.set(data.route.map((c) => [c[0], c[1]] as RoutePoint));
      } else {
        this.routeSignal.set(null);
      }
    } catch {
      // ignore invalid stored data
    }
  }

  private saveToStorage(): void {
    try {
      const from = this.routeFromSignal();
      const to = this.routeToSignal();
      const route = this.routeSignal();
      const error = this.routeErrorSignal();
      if (!from.trim() && !to.trim() && !route?.length && !error) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      const data = {
        from,
        to,
        error: error || undefined,
        route: route?.length ? route : undefined,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore quota etc.
    }
  }

  setRouteFrom(value: string): void {
    this.routeFromSignal.set(value);
    this.saveToStorage();
  }

  setRouteTo(value: string): void {
    this.routeToSignal.set(value);
    this.saveToStorage();
  }

  setRoute(value: RoutePoint[] | null): void {
    this.routeSignal.set(value);
    if (value === null) this.routeErrorSignal.set(null);
    this.saveToStorage();
  }

  setRouteError(value: string | null): void {
    this.routeErrorSignal.set(value);
    this.saveToStorage();
  }

  /** Запазва целия маршрут (от, до, геометрия). */
  saveState(from: string, to: string, route: RoutePoint[] | null, error: string | null): void {
    this.routeFromSignal.set(from);
    this.routeToSignal.set(to);
    this.routeSignal.set(route);
    this.routeErrorSignal.set(error);
    this.saveToStorage();
  }

  /** Изчиства запазения маршрут. */
  clear(): void {
    this.routeFromSignal.set('');
    this.routeToSignal.set('');
    this.routeSignal.set(null);
    this.routeErrorSignal.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  getRouteFrom(): string {
    return this.routeFromSignal();
  }

  getRouteTo(): string {
    return this.routeToSignal();
  }

  getRoute(): RoutePoint[] | null {
    return this.routeSignal();
  }

  getRouteError(): string | null {
    return this.routeErrorSignal();
  }

  hasSavedRoute(): boolean {
    return this.routeFromSignal().trim() !== '' && this.routeToSignal().trim() !== '';
  }
}
