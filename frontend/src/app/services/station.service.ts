import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ChargingStation } from '../models/charging-station.model';

@Injectable({
  providedIn: 'root',
})
export class StationService {
  private apiUrl = `${environment.stationsApiUrl}/stations`;

  constructor(private http: HttpClient) {}

  getStations(city?: string, status?: string, country?: string): Observable<ChargingStation[]> {
    let params = new HttpParams();
    if (city) params = params.set('city', city);
    if (status) params = params.set('status', status);
    if (country) params = params.set('country', country);
    return this.http
      .get<ChargingStation[]>(this.apiUrl, { params })
      .pipe(map((list) => (list || []).map((s) => this.normalizeStation(s))));
  }

  getStation(id: number): Observable<ChargingStation> {
    return this.http
      .get<ChargingStation>(`${this.apiUrl}/${id}`)
      .pipe(map((s) => this.normalizeStation(s)));
  }

  /** Координатите от API винаги се четат като number или null (за картата и филтрите). */
  private normalizeStation(s: ChargingStation): ChargingStation {
    const lat = s.latitude != null && !Number.isNaN(Number(s.latitude)) ? Number(s.latitude) : null;
    const lng = s.longitude != null && !Number.isNaN(Number(s.longitude)) ? Number(s.longitude) : null;
    return { ...s, latitude: lat, longitude: lng };
  }
}
