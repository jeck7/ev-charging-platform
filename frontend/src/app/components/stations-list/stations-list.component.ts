import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { StationService } from '../../services/station.service';
import { ChargingStation } from '../../models/charging-station.model';

@Component({
  selector: 'app-stations-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatRippleModule,
  ],
  templateUrl: './stations-list.component.html',
  styleUrl: './stations-list.component.css',
})
export class StationsListComponent implements OnInit {
  stations: ChargingStation[] = [];
  loading = true;
  error: string | null = null;

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
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load stations. Is the backend running?';
        this.loading = false;
      },
    });
  }
}
