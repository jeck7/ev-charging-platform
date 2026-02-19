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
}
