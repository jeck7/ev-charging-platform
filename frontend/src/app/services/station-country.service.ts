import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'ev_charging_selected_country';

@Injectable({
  providedIn: 'root',
})
export class StationCountryService {
  private countrySignal = signal<string>(this.getStored());

  readonly selectedCountry = this.countrySignal.asReadonly();

  setCountry(code: string): void {
    this.countrySignal.set(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {}
  }

  getCountry(): string {
    return this.countrySignal();
  }

  private getStored(): string {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored && stored.length === 2 ? stored.toUpperCase() : 'BG';
    } catch {
      return 'BG';
    }
  }
}
