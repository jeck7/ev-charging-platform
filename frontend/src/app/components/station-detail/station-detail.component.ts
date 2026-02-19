import { Component, OnInit, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StationService } from '../../services/station.service';
import { ChargingStation } from '../../models/charging-station.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-station-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './station-detail.component.html',
  styleUrl: './station-detail.component.css',
})
export class StationDetailComponent implements OnInit, AfterViewInit {
  station: ChargingStation | null = null;
  loading = true;
  error: string | null = null;
  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  readonly mapId = 'station-detail-map-' + Math.random().toString(36).slice(2);

  constructor(
    private route: ActivatedRoute,
    private stationService: StationService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.stationService.getStation(id).subscribe({
      next: (data) => {
        this.station = data;
        this.loading = false;
        // Initialize map after station is loaded
        setTimeout(() => this.initMap(), 100);
      },
      error: () => {
        this.error = 'Station not found';
        this.loading = false;
      },
    });
  }

  ngAfterViewInit(): void {
    // Map will be initialized after station loads
  }

  private initMap(): void {
    if (typeof window === 'undefined' || !this.station) return;
    if (this.station.latitude == null || this.station.longitude == null) return;
    
    // Remove existing map if any
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    // Initialize map centered on station
    this.map = L.map(this.mapId, {
      center: [this.station.latitude, this.station.longitude],
      zoom: 15,
      zoomControl: true,
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    // Add marker for station
    const icon = L.divIcon({
      className: 'station-detail-marker',
      html: `<span style="background-color:#3f51b5;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:block;"></span>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    this.marker = L.marker([this.station.latitude, this.station.longitude], { icon })
      .bindPopup(`<strong>${this.escapeHtml(this.station.name)}</strong><br>${this.escapeHtml(this.station.address || '')}`)
      .addTo(this.map);

    // Open popup automatically
    setTimeout(() => {
      if (this.marker) {
        this.marker.openPopup();
      }
    }, 300);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
