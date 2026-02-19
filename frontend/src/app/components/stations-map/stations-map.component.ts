import {
  AfterViewInit,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { ChargingStation } from '../../models/charging-station.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-stations-map',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './stations-map.component.html',
  styleUrl: './stations-map.component.css',
})
export class StationsMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() stations: ChargingStation[] = [];
  @Input() selectedStationId: number | null = null;
  @Input() center: { lat: number; lng: number } | null = null;
  @Input() zoom = 6;

  private map: L.Map | null = null;
  private markersLayer: L.LayerGroup | null = null;
  private defaultCenter: L.LatLngExpression = [42.6977, 23.3219]; // Sofia

  readonly mapId = 'stations-map-' + Math.random().toString(36).slice(2);

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.map && (changes['stations'] || changes['selectedStationId'])) {
      this.updateMarkers();
    }
    if (this.map && changes['center'] && this.center) {
      this.map.setView([this.center.lat, this.center.lng], this.zoom);
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.markersLayer = null;
  }

  private initMap(): void {
    if (typeof window === 'undefined') return;
    const center: L.LatLngExpression = this.center
      ? [this.center.lat, this.center.lng] as L.LatLngTuple
      : this.defaultCenter;
    this.map = L.map(this.mapId, {
      center,
      zoom: this.zoom,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);
    this.markersLayer = L.layerGroup().addTo(this.map);
    this.updateMarkers();
  }

  private updateMarkers(): void {
    if (!this.map || !this.markersLayer) return;
    this.markersLayer.clearLayers();
    const validStations = this.stations.filter(
      (s) =>
        s.latitude != null &&
        s.longitude != null &&
        !isNaN(s.latitude) &&
        !isNaN(s.longitude)
    );
    for (const station of validStations) {
      const marker = this.createMarker(station);
      marker.addTo(this.markersLayer!);
    }
    if (validStations.length === 1 && this.selectedStationId == null) {
      this.map.setView(
        [validStations[0].latitude, validStations[0].longitude],
        14
      );
    } else if (
      this.selectedStationId != null &&
      validStations.some((s) => s.id === this.selectedStationId)
    ) {
      const s = validStations.find((x) => x.id === this.selectedStationId)!;
      this.map.setView([s.latitude, s.longitude], 14);
    }
  }

  private createMarker(station: ChargingStation): L.Marker {
    const icon = this.getIconForStation(station);
    const marker = L.marker([station.latitude, station.longitude], { icon });
    const popup = `
      <div class="station-popup">
        <strong>${this.escapeHtml(station.name)}</strong>
        <p class="popup-address">${this.escapeHtml(station.address || '')}, ${this.escapeHtml(station.city || '')}</p>
        <p class="popup-status">${station.status}</p>
        ${station.maxPowerKw ? `<p class="popup-power">${station.maxPowerKw} kW</p>` : ''}
        <a href="/stations/${station.id}" class="popup-link">Виж детайли</a>
      </div>
    `;
    marker.bindPopup(popup, { maxWidth: 280 });
    return marker;
  }

  private getIconForStation(station: ChargingStation): L.DivIcon {
    const status = (station.status || '').toUpperCase();
    let color = '#6b7280';
    if (status === 'ACTIVE') color = '#22c55e';
    else if (status === 'MAINTENANCE') color = '#eab308';
    else if (status === 'INACTIVE') color = '#ef4444';
    const size = station.maxPowerKw && station.maxPowerKw >= 150 ? 28 : 24;
    return L.divIcon({
      className: 'station-marker',
      html: `<span style="background-color:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);display:block;"></span>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
