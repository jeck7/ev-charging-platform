import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { StationService } from '../../services/station.service';
import { ChargingStation } from '../../models/charging-station.model';
import { StationsMapComponent } from '../stations-map/stations-map.component';

type ViewMode = 'split' | 'map' | 'list';

@Component({
  selector: 'app-stations-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatRippleModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    StationsMapComponent,
  ],
  templateUrl: './stations-list.component.html',
  styleUrl: './stations-list.component.css',
})
export class StationsListComponent implements OnInit {
  stations: ChargingStation[] = [];
  filteredStations: ChargingStation[] = [];
  loading = true;
  error: string | null = null;
  viewMode: ViewMode = 'split';
  selectedStationId: number | null = null;

  filterStatus: string = '';
  filterSearch: string = '';
  filterMinPower: number | null = null;

  constructor(private stationService: StationService) {}

  ngOnInit(): void {
    this.loadStations();
  }

  loadStations(): void {
    this.loading = true;
    this.error = null;
    this.stationService.getStations().subscribe({
      next: (data) => {
        this.stations = data;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load stations. Is the backend running?';
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    let result = [...this.stations];
    if (this.filterStatus) {
      result = result.filter(
        (s) => (s.status || '').toUpperCase() === this.filterStatus
      );
    }
    if (this.filterMinPower != null && this.filterMinPower > 0) {
      result = result.filter(
        (s) => (s.maxPowerKw ?? 0) >= this.filterMinPower!
      );
    }
    if (this.filterSearch.trim()) {
      const q = this.filterSearch.trim().toLowerCase();
      result = result.filter(
        (s) =>
          (s.name || '').toLowerCase().includes(q) ||
          (s.address || '').toLowerCase().includes(q) ||
          (s.city || '').toLowerCase().includes(q) ||
          (s.country || '').toLowerCase().includes(q)
      );
    }
    this.filteredStations = result;
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
  }

  onSelectStation(station: ChargingStation): void {
    this.selectedStationId = station.id;
  }

  get mapCenter(): { lat: number; lng: number } | null {
    if (this.selectedStationId) {
      const s = this.filteredStations.find(
        (x) => x.id === this.selectedStationId
      );
      if (s?.latitude != null && s?.longitude != null) {
        return { lat: s.latitude, lng: s.longitude };
      }
    }
    return null;
  }
}
