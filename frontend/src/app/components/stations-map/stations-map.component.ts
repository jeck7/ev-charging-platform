import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ChargingStation } from '../../models/charging-station.model';
import type { RoutePoint } from '../../data/highway-routes';
import { environment } from '../../../environments/environment';
import { I18nService } from '../../services/i18n.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-stations-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stations-map.component.html',
  styleUrl: './stations-map.component.css',
})
export class StationsMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() stations: ChargingStation[] = [];
  @Input() selectedStationId: number | null = null;
  @Input() center: { lat: number; lng: number } | null = null;
  @Input() zoom = 6;
  /** Позиция на потребителя – показва се като маркер „Вие сте тук” */
  @Input() userLocation: { lat: number; lng: number } | null = null;
  /** Трасе на магистрала за рисуване (напр. при избран филтър „Магистрала Тракия“) – [lat, lng][] */
  @Input() highwayRoute: RoutePoint[] | null = null;
  /** Event когато се кликне върху картата (не върху маркер) */
  @Output() mapClick = new EventEmitter<void>();
  /** Event когато се кликне върху маркер на станция – изпраща id на станцията за селекция и чертане на маршрут */
  @Output() stationSelect = new EventEmitter<number>();

  private map: L.Map | null = null;
  private markersLayer: L.LayerGroup | null = null;
  private highwayLayer: L.Polyline | null = null;
  private userLocationMarker: L.Marker | null = null;
  /** Група с основен + алтернативни маршрути (полилинии) */
  private routeLayerGroup: L.LayerGroup | null = null;
  /** Видими полилинии на маршрутите – за стил основен/алтернативен */
  private routeVisiblePolylines: L.Polyline[] = [];
  /** Невидими широки линии върху маршрутите – само за клик (по-лесно улавяне) */
  private routePolylines: L.Polyline[] = [];
  private selectedRouteIndex = 0;
  /** Брой маршрути (за шаблона – избор основен/алтернатива) */
  get routeCount(): number {
    return this.routeVisiblePolylines.length;
  }
  get selectedRouteIndexForDisplay(): number {
    return this.selectedRouteIndex;
  }
  get routeIndices(): number[] {
    const n = this.routeVisiblePolylines.length;
    return n ? Array.from({ length: n }, (_, i) => i) : [];
  }
  private routeStartMarker: L.Marker | null = null;
  private routeEndMarker: L.Marker | null = null;
  private markers: Map<number, L.Marker> = new Map();
  private defaultCenter: L.LatLngExpression = [42.6977, 23.3219]; // Sofia

  readonly mapId = 'stations-map-' + Math.random().toString(36).slice(2);

  constructor(
    private cdr: ChangeDetectorRef,
    public i18n: I18nService
  ) {}

  /** Избор на маршрут като основен по индекс (от бутоните) */
  selectRouteByIndex(i: number): void {
    if (i < 0 || i >= this.routeVisiblePolylines.length) return;
    this.selectedRouteIndex = i;
    this.applyRouteStyles();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.map && changes['stations']) {
      this.updateMarkers();
    }
    if (this.map && changes['selectedStationId']) {
      if (this.selectedStationId == null) {
        // Избраната станция е премахната - затвори popup и премахни подчертаването
        this.clearSelection();
      } else {
        this.highlightSelectedStation();
      }
    }
    // Когато има избрана станция, не презаписвай изгледа от parent – запази fitBounds и позволи зоом/местване
    if (this.map && changes['center'] && this.center && this.selectedStationId == null) {
      this.map.setView([this.center.lat, this.center.lng], this.zoom, {
        animate: changes['center'].firstChange ? false : true,
        duration: 0.4,
      });
    }
    if (this.map && changes['zoom'] && this.selectedStationId == null) {
      this.map.setZoom(this.zoom);
    }
    if (this.map && (changes['userLocation'] || changes['center'])) {
      this.updateUserLocationMarker();
    }
    if (this.map && changes['highwayRoute']) {
      this.updateHighwayLayer();
    }
    // Обнови маршрута ако се промени избраната станция или локацията на потребителя
    if (this.map && changes['userLocation'] && this.selectedStationId) {
      const station = this.stations.find((s) => s.id === this.selectedStationId);
      if (station) {
        this.drawRouteToStation(station);
      }
    }
  }

  private clearSelection(): void {
    if (!this.map) return;
    
    // Затвори всички popups
    this.map.closePopup();
    
    // Премахни маршрута
    this.clearRoute();
    
    // Обнови всички маркери да премахнат подчертаването
    this.markers.forEach((marker, stationId) => {
      const station = this.stations.find((s) => s.id === stationId);
      if (station) {
        this.updateMarkerIcon(marker, station, false);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.markersLayer = null;
    this.routeLayerGroup = null;
  }

  private initMap(): void {
    if (typeof window === 'undefined') return;
    const center: L.LatLngExpression = this.center
      ? [this.center.lat, this.center.lng] as L.LatLngTuple
      : this.defaultCenter;
    const mapOptions: L.MapOptions = { center, zoom: this.zoom };
    const canvasRenderer = (L as any).canvas;
    if (canvasRenderer) {
      mapOptions.renderer = canvasRenderer({ tolerance: 18 });
    }
    this.map = L.map(this.mapId, mapOptions);
    this.map.createPane('routeHitPane');
    const routeHitPane = this.map.getPane('routeHitPane');
    if (routeHitPane) (routeHitPane as HTMLElement).style.zIndex = '450';
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);
    this.markersLayer = L.layerGroup().addTo(this.map);
    this.updateHighwayLayer();

    // Добави event listener за кликване върху картата
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const target = e.originalEvent.target as HTMLElement;
      const isMarkerClick = target.closest('.leaflet-marker-icon') ||
                           target.closest('.leaflet-popup') ||
                           target.closest('.station-marker');
      const isRouteClick = this.routePolylines.some((p) => {
        const el = p.getElement();
        return el && (el === target || el.contains(target as Node));
      });
      if (!isMarkerClick && !isRouteClick) {
        this.mapClick.emit();
      }
    });
    
    this.updateUserLocationMarker();
    this.updateMarkers();
  }

  private updateUserLocationMarker(): void {
    if (!this.map) return;
    if (this.userLocationMarker) {
      this.userLocationMarker.remove();
      this.userLocationMarker = null;
    }
    if (!this.userLocation) return;
    const label = this.i18n.t('map.userLocation.here');
    const icon = L.divIcon({
      className: 'user-location-marker',
      html: `<span title="${label}">📍</span>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
    this.userLocationMarker = L.marker(
      [this.userLocation.lat, this.userLocation.lng],
      { icon }
    )
      .bindPopup(label, { className: 'user-location-popup' })
      .addTo(this.map);
  }

  private updateMarkers(): void {
    if (!this.map || !this.markersLayer) return;
    this.markersLayer.clearLayers();
    this.markers.clear();
    
    const validStations = this.stations.filter(
      (s) =>
        s.latitude != null &&
        s.longitude != null &&
        !isNaN(s.latitude) &&
        !isNaN(s.longitude)
    );
    
    for (const station of validStations) {
      const isSelected = this.selectedStationId === station.id;
      const marker = this.createMarker(station, isSelected);
      marker.addTo(this.markersLayer!);
      this.markers.set(station.id, marker);
    }
    
    // Auto-center if only one station or if selected
    if (validStations.length === 1 && this.selectedStationId == null) {
      this.map.setView(
        [validStations[0].latitude!, validStations[0].longitude!],
        14
      );
    } else if (this.selectedStationId != null) {
      this.highlightSelectedStation();
    }
  }

  private highlightSelectedStation(): void {
    if (!this.map || !this.selectedStationId) return;
    
    const marker = this.markers.get(this.selectedStationId);
    if (!marker) return;
    
    const station = this.stations.find((s) => s.id === this.selectedStationId);
    if (!station || station.latitude == null || station.longitude == null) return;
    
    // Update marker icon to highlight selected station
    this.updateMarkerIcon(marker, station, true);
    
    // Draw route if user location is available - това ще направи fitBounds автоматично
    if (this.userLocation) {
      this.drawRouteToStation(station);
      // Open popup after route is drawn
      setTimeout(() => {
        marker.openPopup();
      }, 800);
    } else {
      // Zoom and center on selected station only if no user location
      this.map.setView(
        [station.latitude!, station.longitude!],
        15,
        {
          animate: true,
          duration: 0.5,
        }
      );
      setTimeout(() => {
        marker.openPopup();
      }, 300);
    }
  }

  private drawRouteToStation(station: ChargingStation): void {
    console.log('drawRouteToStation called', {
      hasMap: !!this.map,
      hasUserLocation: !!this.userLocation,
      userLocation: this.userLocation,
      station: station.name,
      stationLat: station.latitude,
      stationLng: station.longitude
    });
    
    if (!this.map || !this.userLocation) {
      console.warn('Cannot draw route: missing map or userLocation', {
        hasMap: !!this.map,
        hasUserLocation: !!this.userLocation
      });
      this.clearRoute();
      return;
    }
    
    if (station.latitude == null || station.longitude == null) {
      console.warn('Cannot draw route: station missing coordinates', {
        stationId: station.id,
        stationName: station.name
      });
      this.clearRoute();
      return;
    }
    
    // Remove existing route
    this.clearRoute();
    
    // Fetch route from OSRM (Open Source Routing Machine)
    // fitBounds ще се направи след като маршрутът се зареди
    console.log('Calling fetchRouteFromOSRM', {
      start: [this.userLocation.lat, this.userLocation.lng],
      end: [station.latitude!, station.longitude!]
    });
    const startLat = this.userLocation.lat;
    const startLng = this.userLocation.lng;
    const endLat = station.latitude!;
    const endLng = station.longitude!;
    if (environment.openRouteServiceApiKey) {
      this.fetchRouteFromORS(startLat, startLng, endLat, endLng).catch(() => {
        this.fetchRouteFromOSRM(startLat, startLng, endLat, endLng);
      });
    } else {
      this.fetchRouteFromOSRM(startLat, startLng, endLat, endLng);
    }
  }

  /**
   * Маршрут чрез OpenRouteService – връща алтернативи по-често. Използва се при наличие на API ключ.
   */
  private fetchRouteFromORS(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): Promise<void> {
    if (!this.map || !environment.openRouteServiceApiKey) {
      return Promise.reject(new Error('No map or ORS key'));
    }
    const key = environment.openRouteServiceApiKey;
    const body = {
      coordinates: [[startLng, startLat], [endLng, endLat]] as [number, number][],
      alternative_routes: { target_count: 2, share_factor: 0.6, weight_factor: 1.4 },
    };
    const orsUrl = environment.production
      ? 'https://api.openrouteservice.org/v2/directions/driving-car/geojson'
      : '/api/ors/v2/directions/driving-car/geojson';

    return fetch(orsUrl, {
      method: 'POST',
      headers: {
        Authorization: key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`ORS ${res.status}`);
        return res.json();
      })
      .then((geojson: { type: string; features?: { geometry?: { type: string; coordinates?: number[][] } }[] }) => {
        const features = geojson?.features;
        if (!features?.length) throw new Error('No routes');
        const group = L.layerGroup().addTo(this.map!);
        const visiblePolylines: L.Polyline[] = [];
        let fullBounds: L.LatLngBounds | null = null;
        const startPoint = L.latLng(startLat, startLng);
        const endPoint = L.latLng(endLat, endLng);
        features.forEach((f, index) => {
          const coordList = f.geometry?.coordinates;
          if (!coordList?.length) return;
          const coordinates = coordList.map((c) => [c[1], c[0]] as L.LatLngExpression);
          const isMain = index === 0;
          const visible = L.polyline(coordinates, {
            color: isMain ? '#3f51b5' : '#0ea5e9',
            weight: 5,
            opacity: 0.9,
            dashArray: isMain ? undefined : '14, 10',
            smoothFactor: 1,
          }).addTo(group);
          visiblePolylines.push(visible);
          const hit = L.polyline(coordinates, {
            weight: 32,
            opacity: 0.005,
            color: '#000',
            interactive: true,
            pane: 'routeHitPane',
          } as L.PolylineOptions).addTo(this.map!);
          hit.on('click', (e: L.LeafletMouseEvent) => {
            e.originalEvent.stopPropagation();
            this.selectedRouteIndex = index;
            this.applyRouteStyles();
          });
          hit.getElement()?.classList.add('route-line-selectable');
          this.routePolylines.push(hit);
          if (!fullBounds) {
              const b = visible.getBounds();
              fullBounds = L.latLngBounds(b.getSouthWest(), b.getNorthEast());
            }
          else fullBounds.extend(visible.getBounds());
        });
        if (group.getLayers().length === 0 || !fullBounds) {
          group.remove();
          this.routePolylines.forEach((p) => p.remove());
          this.routePolylines = [];
          throw new Error('No geometry');
        }
        this.routeVisiblePolylines = visiblePolylines;
        this.selectedRouteIndex = 0;
        this.routeLayerGroup = group;
        this.addRouteMarkers(startLat, startLng, endLat, endLng);
        this.cdr.markForCheck();
        setTimeout(() => {
          if (this.map && fullBounds) {
            const bounds = fullBounds.extend(startPoint).extend(endPoint);
            this.map.fitBounds(bounds, { padding: [100, 100], maxZoom: 15, animate: true, duration: 0.6 });
          }
        }, 300);
      });
  }

  private fetchRouteFromOSRM(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): void {
    if (!this.map) {
      console.warn('fetchRouteFromOSRM: map is null');
      return;
    }
    
    // OSRM: alternatives=3 пита за до 3 алтернативи
    const osrmPath = `${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&alternatives=3`;
    const osrmUrl = environment.production
      ? `https://router.project-osrm.org/route/v1/driving/${osrmPath}`
      : `/api/osrm/route/v1/driving/${osrmPath}`;
    
    console.log('Fetching route from OSRM (alternatives=3):', osrmUrl);
    
    fetch(osrmUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`OSRM API error: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const group = L.layerGroup().addTo(this.map!);
          const visiblePolylines: L.Polyline[] = [];
          let fullBounds: L.LatLngBounds | null = null;
          const startPoint = L.latLng(startLat, startLng);
          const endPoint = L.latLng(endLat, endLng);

          data.routes.forEach((route: { geometry?: { coordinates: number[][] }; legs?: { geometry?: { coordinates: number[][] } }[] }, index: number) => {
            let coords = route.geometry?.coordinates;
            if (!coords?.length && route.legs?.length) {
              coords = route.legs.flatMap((leg) => leg.geometry?.coordinates ?? []);
            }
            if (!coords?.length) return;
            const coordinates = coords.map((coord: number[]) => [
              coord[1],
              coord[0],
            ]) as L.LatLngExpression[];
            const isMain = index === 0;
            const visible = L.polyline(coordinates, {
              color: isMain ? '#3f51b5' : '#0ea5e9',
              weight: 5,
              opacity: 0.9,
              dashArray: isMain ? undefined : '14, 10',
              smoothFactor: 1,
            }).addTo(group);
            visiblePolylines.push(visible);
            const hit = L.polyline(coordinates, {
              weight: 32,
              opacity: 0.005,
              color: '#000',
              interactive: true,
              pane: 'routeHitPane',
            } as L.PolylineOptions).addTo(this.map!);
            hit.on('click', (e: L.LeafletMouseEvent) => {
              e.originalEvent.stopPropagation();
              this.selectedRouteIndex = index;
              this.applyRouteStyles();
            });
            hit.getElement()?.classList.add('route-line-selectable');
            this.routePolylines.push(hit);
            if (!fullBounds) {
              const b = visible.getBounds();
              fullBounds = L.latLngBounds(b.getSouthWest(), b.getNorthEast());
            }
            else fullBounds.extend(visible.getBounds());
          });

          if (group.getLayers().length === 0 || !fullBounds) {
            group.remove();
            this.routePolylines.forEach((p) => p.remove());
            this.routePolylines = [];
            this.drawStraightLine(startLat, startLng, endLat, endLng);
            return;
          }

          this.routeVisiblePolylines = visiblePolylines;
          this.selectedRouteIndex = 0;
          this.routeLayerGroup = group;
          this.addRouteMarkers(startLat, startLng, endLat, endLng);
          this.cdr.markForCheck();

          setTimeout(() => {
            if (this.map && fullBounds) {
              const bounds = fullBounds.extend(startPoint).extend(endPoint);
              this.map.fitBounds(bounds, {
                padding: [100, 100],
                maxZoom: 15,
                animate: true,
                duration: 0.6,
              });
            }
          }, 300);
        } else {
          console.warn('OSRM route failed:', data.code, 'using straight line');
          this.drawStraightLine(startLat, startLng, endLat, endLng);
        }
      })
      .catch((error) => {
        console.warn('OSRM API error, using straight line:', error);
        // Fallback to straight line if API is unavailable
        this.drawStraightLine(startLat, startLng, endLat, endLng);
      });
  }

  /** Прилага стил основен/алтернативен според selectedRouteIndex */
  private applyRouteStyles(): void {
    this.routeVisiblePolylines.forEach((p, i) => {
      const isMain = i === this.selectedRouteIndex;
      p.setStyle({
        color: isMain ? '#3f51b5' : '#0ea5e9',
        weight: 5,
        opacity: 0.9,
        dashArray: isMain ? undefined : '14, 10',
      });
    });
  }

  private addRouteMarkers(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): void {
    if (!this.map) return;
    
    // Start marker (green circle)
    const startIcon = L.divIcon({
      className: 'route-start-marker',
      html: `<span style="background-color:#22c55e;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:block;"></span>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    const startLabel = this.i18n.t('map.route.start');
    this.routeStartMarker = L.marker([startLat, startLng], {
      icon: startIcon,
    })
      .bindPopup(startLabel)
      .addTo(this.map);
    
    // End marker (red circle)
    const endIcon = L.divIcon({
      className: 'route-end-marker',
      html: `<span style="background-color:#ef4444;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:block;"></span>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    const endLabel = this.i18n.t('map.route.end');
    this.routeEndMarker = L.marker([endLat, endLng], { icon: endIcon })
      .bindPopup(endLabel)
      .addTo(this.map);
  }

  private drawStraightLine(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): void {
    if (!this.map) return;
    
    const group = L.layerGroup().addTo(this.map);
    const route = L.polyline(
      [
        [startLat, startLng],
        [endLat, endLng],
      ],
      {
        color: '#3f51b5',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 10',
      }
    ).addTo(group);
    this.routeLayerGroup = group;
    
    // Add route markers
    this.addRouteMarkers(startLat, startLng, endLat, endLng);
    
    // Fit bounds за двете точки
    setTimeout(() => {
      if (this.map) {
        const bounds = L.latLngBounds([
          [startLat, startLng],
          [endLat, endLng],
        ]);
        this.map.fitBounds(bounds, {
          padding: [100, 100],
          maxZoom: 15,
          animate: true,
          duration: 0.6,
        });
      }
    }, 100);
  }

  private clearRoute(): void {
    this.routePolylines.forEach((p) => p.remove());
    this.routePolylines = [];
    this.routeVisiblePolylines = [];
    this.selectedRouteIndex = 0;
    if (this.routeLayerGroup) {
      this.routeLayerGroup.remove();
      this.routeLayerGroup = null;
    }
    if (this.routeStartMarker) {
      this.routeStartMarker.remove();
      this.routeStartMarker = null;
    }
    if (this.routeEndMarker) {
      this.routeEndMarker.remove();
      this.routeEndMarker = null;
    }
  }

  private updateHighwayLayer(): void {
    if (!this.map) return;
    if (this.highwayLayer) {
      this.highwayLayer.remove();
      this.highwayLayer = null;
    }
    if (this.highwayRoute && this.highwayRoute.length >= 2) {
      const latLngs = this.highwayRoute.map((p) => [p[0], p[1]] as L.LatLngExpression);
      this.highwayLayer = L.polyline(latLngs, {
        color: '#ea580c',
        weight: 5,
        opacity: 0.85,
        dashArray: '12, 8',
      }).addTo(this.map);
      let bounds = this.highwayLayer.getBounds();
      const withCoords = this.stations.filter(
        (s) => s.latitude != null && s.longitude != null && !isNaN(s.latitude) && !isNaN(s.longitude)
      );
      for (const s of withCoords) {
        bounds = bounds.extend([s.latitude!, s.longitude!]);
      }
      this.map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 10,
        animate: true,
        duration: 0.5,
      });
    }
  }

  private createMarker(
    station: ChargingStation,
    isSelected: boolean = false
  ): L.Marker {
    const icon = this.getIconForStation(station, isSelected);
    const marker = L.marker([station.latitude!, station.longitude!], { icon });
    
    // Изчисли разстоянието ако има userLocation
    const distance = this.getStationDistance(station);
    const distanceText =
      distance !== null
        ? `<p class="popup-distance">📍 ${this.formatDistance(distance)}</p>`
        : '';
    const priceHtml = this.formatPopupPrice(station);

    const statusLabel = this.escapeHtml(this.getStatusLabel(station.status));
    const statusHtml = statusLabel
      ? `<p class="popup-status">${statusLabel}</p>`
      : '';
    const detailsLabel = this.escapeHtml(
      this.i18n.t('map.popup.detailsLink')
    );

    const popup = `
      <div class="station-popup">
        <strong>${this.escapeHtml(station.name)}</strong>
        <p class="popup-address">${this.escapeHtml(station.address || '')}</p>
        ${distanceText}
        ${statusHtml}
        ${station.maxPowerKw ? `<p class="popup-power">${station.maxPowerKw} kW</p>` : ''}
        ${priceHtml}
        <a href="/stations/${station.id}" class="popup-link">${detailsLabel}</a>
      </div>
    `;
    marker.bindPopup(popup, { maxWidth: 280 });
    
    // При кликване върху маркер: не изпращай mapClick, но изпрати избраната станция (за маршрут и синхрон със списъка)
    marker.on('click', (e: L.LeafletMouseEvent) => {
      e.originalEvent.stopPropagation();
      this.stationSelect.emit(station.id);
    });
    
    return marker;
  }

  private updateMarkerIcon(marker: L.Marker, station: ChargingStation, isSelected: boolean): void {
    const icon = this.getIconForStation(station, isSelected);
    marker.setIcon(icon);
  }

  private getIconForStation(station: ChargingStation, isSelected: boolean = false): L.DivIcon {
    const status = (station.status || '').toUpperCase();
    let color = '#374151';
    if (status === 'ACTIVE') color = '#15803d';
    else if (status === 'MAINTENANCE') color = '#a16207';
    else if (status === 'INACTIVE') color = '#b91c1c';
    
    const baseSize = station.maxPowerKw && station.maxPowerKw >= 150 ? 28 : 24;
    const size = isSelected ? baseSize + 6 : baseSize;
    const anchor = size / 2;
    const border = isSelected ? '2px solid #2563eb' : '2px solid rgba(0,0,0,0.25)';
    const shadow = '0 2px 6px rgba(0,0,0,0.4)';
    const bg = 'background:#fff;border-radius:50%;border:' + border + ';box-shadow:' + shadow + ';';
    const html = `<span class="station-marker-icon" style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;${bg}"><span class="material-icons" style="font-size:${Math.round(size * 0.7)}px;color:${color};line-height:1;">ev_station</span></span>`;
    return L.divIcon({
      className: 'station-marker' + (isSelected ? ' selected' : ''),
      html,
      iconSize: [size, size],
      iconAnchor: [anchor, anchor],
    });
  }

  /** Форматира цената за попъпа на картата (на локация или от конектор) */
  private formatPopupPrice(station: ChargingStation): string {
    const cost =
      station.usageCost?.trim() ||
      station.connectors?.find((c) => c.usageCost?.trim())?.usageCost?.trim();
    if (!cost) return '';
    const prefix = this.escapeHtml(this.i18n.t('map.popup.pricePrefix'));
    return `<p class="popup-price">${prefix}: ${this.escapeHtml(cost)}</p>`;
  }

  private getStatusLabel(status: string | null | undefined): string {
    if (!status) return '';
    const upper = status.toUpperCase();
    if (upper === 'ACTIVE') {
      return this.i18n.t('stationDetail.status.active');
    }
    if (upper === 'MAINTENANCE') {
      return this.i18n.t('stationDetail.status.maintenance');
    }
    return status;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /** Разстояние в км (приблизително, Haversine) */
  private distanceKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Радиус на Земята в км
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

  /** Изчисли разстоянието до станция от текущата локация */
  private getStationDistance(station: ChargingStation): number | null {
    if (!this.userLocation || station.latitude == null || station.longitude == null) {
      return null;
    }
    return this.distanceKm(
      this.userLocation.lat,
      this.userLocation.lng,
      station.latitude!,
      station.longitude!
    );
  }

  /** Форматирай разстоянието за показване */
  private formatDistance(distanceKm: number | null): string {
    if (distanceKm == null) return '';
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} m`;
    }
    return `${distanceKm.toFixed(1)} km`;
  }
}
