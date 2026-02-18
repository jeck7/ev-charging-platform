import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ChargingStation } from '../models/charging-station.model';

@Injectable({
  providedIn: 'root',
})
export class StationService {
  private apiUrl = `${environment.stationsApiUrl}/stations`;

  constructor(private http: HttpClient) {}

  getStations(city?: string, status?: string): Observable<ChargingStation[]> {
    let params = new HttpParams();
    if (city) params = params.set('city', city);
    if (status) params = params.set('status', status);
    return this.http.get<ChargingStation[]>(this.apiUrl, { params });
  }

  getStation(id: number): Observable<ChargingStation> {
    return this.http.get<ChargingStation>(`${this.apiUrl}/${id}`);
  }
}
