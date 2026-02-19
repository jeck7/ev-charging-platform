import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StationImportService, ImportJobStatus, StationStats } from '../../services/station-import.service';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.css',
})
export class AdminPanelComponent implements OnInit, OnDestroy {
  selectedCountry = 'BG';
  isImporting = false;
  currentJobId: string | null = null;
  importStatus: ImportJobStatus | null = null;
  stats: StationStats | null = null;
  private statusPollingSubscription?: Subscription;

  countries = [
    { code: 'BG', name: 'България' },
    { code: 'RO', name: 'Румъния' },
    { code: 'GR', name: 'Гърция' },
    { code: 'TR', name: 'Турция' },
    { code: 'DE', name: 'Германия' },
  ];

  constructor(
    private importService: StationImportService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadStats();
  }

  ngOnDestroy() {
    if (this.statusPollingSubscription) {
      this.statusPollingSubscription.unsubscribe();
    }
  }

  loadStats() {
    this.importService.getStationStats(this.selectedCountry).subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (error) => {
        console.error('Error loading stats:', error);
      },
    });
  }

  startImport() {
    if (this.isImporting) {
      return;
    }

    this.isImporting = true;
    this.importStatus = null;

    this.importService.importStations(this.selectedCountry).subscribe({
      next: (response) => {
        this.currentJobId = response.jobId;
        this.snackBar.open(`Импортът започна за ${this.selectedCountry}`, 'OK', {
          duration: 3000,
        });
        this.startPollingStatus();
      },
      error: (error) => {
        console.error('Error starting import:', error);
        this.snackBar.open('Грешка при стартиране на импорт', 'OK', {
          duration: 5000,
        });
        this.isImporting = false;
      },
    });
  }

  private startPollingStatus() {
    if (!this.currentJobId || this.currentJobId === 'unknown') {
      console.warn('Invalid jobId, cannot start polling');
      this.isImporting = false;
      return;
    }

    // Poll every 2 seconds
    this.statusPollingSubscription = interval(2000)
      .pipe(
        switchMap(() => this.importService.getImportStatus(this.currentJobId!))
      )
      .subscribe({
        next: (status) => {
          if (!status) {
            // Job not found yet, continue polling
            return;
          }

          this.importStatus = status;

          if (status.status === 'COMPLETED' || status.status === 'FAILED') {
            this.isImporting = false;
            if (this.statusPollingSubscription) {
              this.statusPollingSubscription.unsubscribe();
            }

            if (status.status === 'COMPLETED') {
              this.snackBar.open(
                `Импортът завърши успешно! Импортирани: ${status.imported}, Актуализирани: ${status.updated}`,
                'OK',
                { duration: 5000 }
              );
            } else {
              this.snackBar.open(`Импортът неуспешен: ${status.message}`, 'OK', {
                duration: 5000,
              });
            }

            this.loadStats(); // Refresh stats
          }
        },
        error: (error) => {
          // If 404, job might not be created yet, continue polling
          if (error.status === 404) {
            console.warn('Job not found yet, continuing to poll...');
            return;
          }
          console.error('Error polling status:', error);
          // Stop polling on other errors
          this.isImporting = false;
          if (this.statusPollingSubscription) {
            this.statusPollingSubscription.unsubscribe();
          }
        },
      });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'green';
      case 'RUNNING':
        return 'blue';
      case 'FAILED':
        return 'red';
      default:
        return 'gray';
    }
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('bg-BG');
  }
}
