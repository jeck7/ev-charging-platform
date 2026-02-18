import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StationService } from '../../services/station.service';
import { ChargingStation } from '../../models/charging-station.model';

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
export class StationDetailComponent implements OnInit {
  station: ChargingStation | null = null;
  loading = true;
  error: string | null = null;

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
      },
      error: () => {
        this.error = 'Station not found';
        this.loading = false;
      },
    });
  }
}
