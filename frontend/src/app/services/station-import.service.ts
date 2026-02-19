import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ImportJobStatus {
  jobId: string;
  countryCode: string;
  scheduled: boolean;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: string;
  completedAt?: string;
  imported: number;
  updated: number;
  skipped: number;
  message?: string;
}

export interface StationStats {
  totalStations: number;
  activeStations: number;
  inactiveStations: number;
  countryStations?: number;
  lastImport?: {
    date: string;
    imported: number;
    updated: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class StationImportService {
  private apiUrl = `${environment.stationsApiUrl}/stations`;

  constructor(private http: HttpClient) {}

  /**
   * Start import for a country
   */
  importStations(countryCode: string): Observable<{ jobId: string; country: string; status: string; message: string }> {
    return this.http.post<{ jobId: string; country: string; status: string; message: string }>(
      `${this.apiUrl}/import/${countryCode}`,
      {}
    );
  }

  /**
   * Start import of Fines Charging stations for Bulgaria from Open Charge Map (by operator).
   */
  importFinesStations(): Observable<{ jobId: string; country: string; operator: string; status: string; message: string }> {
    return this.http.post<{ jobId: string; country: string; operator: string; status: string; message: string }>(
      `${this.apiUrl}/import/fines`,
      {}
    );
  }

  /**
   * Скрапиране на finescharging.com/locations и импорт в БД. Изисква Node + Playwright в tools/fines-scraper.
   */
  importFinesScrape(): Observable<{ success: boolean; imported?: number; updated?: number; total?: number; message?: string; error?: string }> {
    return this.http.post<{ success: boolean; imported?: number; updated?: number; total?: number; message?: string; error?: string }>(
      `${this.apiUrl}/import/fines-scrape`,
      {}
    );
  }

  /**
   * Get import job status
   */
  getImportStatus(jobId: string): Observable<ImportJobStatus> {
    return this.http.get<ImportJobStatus>(`${this.apiUrl}/import/status/${jobId}`);
  }

  /**
   * Get latest import status for country
   */
  getLatestImportStatus(countryCode: string): Observable<ImportJobStatus> {
    return this.http.get<ImportJobStatus>(`${this.apiUrl}/import/status/country/${countryCode}`);
  }

  /**
   * Get station statistics
   */
  getStationStats(countryCode?: string): Observable<StationStats> {
    const url = countryCode 
      ? `${this.apiUrl}/stats?countryCode=${countryCode}`
      : `${this.apiUrl}/stats`;
    return this.http.get<StationStats>(url);
  }

  /**
   * Status of price enrichment providers (Chargeprice, Eco-Movement)
   */
  getEnrichPricesStatus(): Observable<{ chargeprice: boolean; ecomovement: boolean }> {
    return this.http.get<{ chargeprice: boolean; ecomovement: boolean }>(`${this.apiUrl}/enrich-prices/status`);
  }

  /**
   * Enrich stations with prices from Chargeprice / Eco-Movement (match by coordinates)
   */
  enrichPrices(countryCode: string): Observable<{
    country: string;
    stationsEnrichedFromChargeprice: number;
    stationsEnrichedFromEcoMovement: number;
    message: string;
  }> {
    return this.http.post<{
      country: string;
      stationsEnrichedFromChargeprice: number;
      stationsEnrichedFromEcoMovement: number;
      message: string;
    }>(`${this.apiUrl}/enrich-prices/${countryCode}`, {});
  }
}
