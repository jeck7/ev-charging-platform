import { Component, OnDestroy, OnInit } from '@angular/core';
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
import { StationImportService } from '../../services/station-import.service';
import { ChargingStation } from '../../models/charging-station.model';
import { loadTrakiaA1Route } from '../../data/highway-routes';
import type { RoutePoint } from '../../data/highway-routes';
import { StationsMapComponent } from '../stations-map/stations-map.component';
import { MatSnackBar } from '@angular/material/snack-bar';

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
export class StationsListComponent implements OnInit, OnDestroy {
  stations: ChargingStation[] = [];
  filteredStations: ChargingStation[] = [];
  loading = true;
  error: string | null = null;
  viewMode: ViewMode = 'split';
  selectedStationId: number | null = null;

  /** Текуща локация на потребителя (от геолокация) */
  userLocation: { lat: number; lng: number } | null = null;
  locationLoading = false;
  locationError: string | null = null;

  filterStatus: string = '';
  filterSearch: string = '';
  filterRoute: '' | 'trakiya' = '';
  filterMinPower: number | null = null;

  /** Заредено трасе Тракия (от JSON при нужда) */
  trakiaRoute: RoutePoint[] | null = null;
  routeLoading = false;

  /** Максимално разстояние (km) от трасето на магистралата – станции до 10 km се показват */
  private static readonly MAX_KM_FROM_ROUTE = 10;

  /** Трасе на магистрала за картата (при избран маршрут) */
  get highwayRouteForMap(): RoutePoint[] | null {
    return this.filterRoute === 'trakiya' ? this.trakiaRoute : null;
  }

  showImportPrompt = false;
  isImporting = false;
  private importPollInterval: any = null;

  constructor(
    private stationService: StationService,
    private importService: StationImportService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.requestUserLocation();
    this.loadStations();
  }

  requestUserLocation(): void {
    if (!navigator.geolocation) {
      this.locationError = 'Геолокацията не се поддържа от браузъра.';
      return;
    }
    this.locationLoading = true;
    this.locationError = null;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        this.locationLoading = false;
        this.applyFilters();
      },
      () => {
        this.locationLoading = false;
        this.locationError = 'Локацията не е намерена. Показваме станции по подразбиране.';
        this.applyFilters();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  loadStations(): void {
    this.loading = true;
    this.error = null;
    this.stationService.getStations().subscribe({
      next: (data) => {
        this.stations = data;
        // Покажи подсказка за импорт ако има малко станции (особено в България)
        const bgStations = data.filter(
          (s) =>
            (s.country && s.country.toUpperCase() === 'BG') ||
            (s.country && s.country.toLowerCase().includes('bulgaria'))
        );
        // Покажи подсказка ако има по-малко от 20 станции общо или по-малко от 10 в България
        this.showImportPrompt = data.length < 20 || bgStations.length < 10;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load stations. Is the backend running?';
        this.loading = false;
      },
    });
  }

  importStationsFromBulgaria(): void {
    if (this.isImporting) return;
    this.isImporting = true;
    this.showImportPrompt = false;
    this.snackBar.open('Започва импорт на станции от България...', 'OK', {
      duration: 3000,
    });
    this.importService.importStations('BG').subscribe({
      next: (response) => {
        this.snackBar.open(
          `Импортът започна! Импортираме станции от Open Charge Map...`,
          'OK',
          { duration: 4000 }
        );
        // Poll за статус на импорта и обновяване на списъка
        let pollCount = 0;
        const maxPolls = 30; // Максимум 30 опита (около 60 секунди)
        this.importPollInterval = setInterval(() => {
          pollCount++;
          this.importService.getImportStatus(response.jobId).subscribe({
            next: (status) => {
              if (status.status === 'COMPLETED') {
                if (this.importPollInterval) {
                  clearInterval(this.importPollInterval);
                  this.importPollInterval = null;
                }
                this.snackBar.open(
                  `Импортът завърши успешно! Импортирани: ${status.imported}, Актуализирани: ${status.updated}`,
                  'OK',
                  { duration: 5000 }
                );
                this.loadStations();
                this.isImporting = false;
              } else if (status.status === 'FAILED') {
                if (this.importPollInterval) {
                  clearInterval(this.importPollInterval);
                  this.importPollInterval = null;
                }
                this.snackBar.open(
                  `Импортът неуспешен: ${status.message || 'Неизвестна грешка'}`,
                  'OK',
                  { duration: 5000 }
                );
                this.isImporting = false;
                this.showImportPrompt = true;
              }
            },
            error: () => {
              if (pollCount >= maxPolls) {
                if (this.importPollInterval) {
                  clearInterval(this.importPollInterval);
                  this.importPollInterval = null;
                }
                this.snackBar.open(
                  'Импортът продължава. Станциите ще се появят скоро.',
                  'OK',
                  { duration: 4000 }
                );
                setTimeout(() => this.loadStations(), 5000);
                this.isImporting = false;
              }
            },
          });
        }, 2000); // Poll на всеки 2 секунди
      },
      error: () => {
        this.snackBar.open('Грешка при стартиране на импорт', 'OK', {
          duration: 5000,
        });
        this.isImporting = false;
        this.showImportPrompt = true;
      },
    });
  }

  /** Разстояние в км (приблизително, Haversine) */
  private distanceKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /** Минимално разстояние (km) от станция до трасето на магистралата (полилиния) */
  private distanceFromStationToRoute(station: ChargingStation, route: RoutePoint[]): number {
    if (route.length < 2 || station.latitude == null || station.longitude == null) return Infinity;
    let minDist = Infinity;
    const numSamples = 15;
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i];
      const b = route[i + 1];
      for (let k = 0; k <= numSamples; k++) {
        const t = k / numSamples;
        const lat = a[0] + t * (b[0] - a[0]);
        const lng = a[1] + t * (b[1] - a[1]);
        const d = this.distanceKm(station.latitude, station.longitude, lat, lng);
        if (d < minDist) minDist = d;
      }
    }
    return minDist;
  }

  /** Изчисли разстоянието до станция от текущата локация */
  getStationDistance(station: ChargingStation): number | null {
    if (!this.userLocation || station.latitude == null || station.longitude == null) {
      return null;
    }
    return this.distanceKm(
      this.userLocation.lat,
      this.userLocation.lng,
      station.latitude,
      station.longitude
    );
  }

  /** Форматирай разстоянието за показване */
  formatDistance(distanceKm: number | null): string {
    if (distanceKm == null) return '';
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} m`;
    }
    return `${distanceKm.toFixed(1)} km`;
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
    if (this.filterRoute === 'trakiya' && this.trakiaRoute && this.trakiaRoute.length >= 2) {
      result = result.filter((s) => {
        if (s.latitude == null || s.longitude == null) return false;
        const dist = this.distanceFromStationToRoute(s, this.trakiaRoute!);
        return dist <= StationsListComponent.MAX_KM_FROM_ROUTE;
      });
    }
    if (this.userLocation) {
      result = result
        .slice()
        .sort((a, b) => {
          if (a.latitude == null || a.longitude == null) return 1;
          if (b.latitude == null || b.longitude == null) return -1;
          const da = this.distanceKm(
            this.userLocation!.lat,
            this.userLocation!.lng,
            a.latitude,
            a.longitude
          );
          const db = this.distanceKm(
            this.userLocation!.lat,
            this.userLocation!.lng,
            b.latitude,
            b.longitude
          );
          return da - db;
        });
    }
    this.filteredStations = result;
  }

  onFilterChange(): void {
    if (this.filterRoute === 'trakiya') {
      if (!this.trakiaRoute) {
        this.routeLoading = true;
        loadTrakiaA1Route()
          .then((route) => {
            this.trakiaRoute = route;
            this.routeLoading = false;
            this.applyFilters();
          })
          .catch(() => {
            this.routeLoading = false;
            this.applyFilters();
          });
        return;
      }
    } else {
      this.trakiaRoute = null;
    }
    this.applyFilters();
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
  }

  onSelectStation(station: ChargingStation, event?: Event): void {
    if (event) {
      // Prevent navigation if clicking on the card (not the link)
      const target = event.target as HTMLElement;
      if (target.tagName !== 'A' && !target.closest('a')) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    this.selectedStationId = station.id;
    
    // If in list-only view, switch to split or map view to show the station
    if (this.viewMode === 'list') {
      this.viewMode = 'split';
    }
  }

  onMapClick(): void {
    // Премахни фокуса от избраната станция когато се кликне върху картата
    this.selectedStationId = null;
  }

  /** Избор на станция от картата (клик по маркер) – същият ефект като от списъка, включително чертане на маршрут */
  onSelectStationFromMap(stationId: number): void {
    const station = this.filteredStations.find((s) => s.id === stationId);
    if (station) {
      this.onSelectStation(station);
    }
  }

  /** Център на картата: избрана станция или локация на потребителя */
  get mapCenter(): { lat: number; lng: number } | null {
    if (this.selectedStationId) {
      const s = this.filteredStations.find(
        (x) => x.id === this.selectedStationId
      );
      if (s?.latitude != null && s?.longitude != null) {
        return { lat: s.latitude, lng: s.longitude };
      }
    }
    return this.userLocation;
  }

  /** Zoom за картата: по-голям при локация на потребителя */
  get mapZoom(): number {
    if (this.selectedStationId) return 16;
    return this.userLocation ? 12 : 6;
  }

  ngOnDestroy(): void {
    if (this.importPollInterval) {
      clearInterval(this.importPollInterval);
    }
  }
}
