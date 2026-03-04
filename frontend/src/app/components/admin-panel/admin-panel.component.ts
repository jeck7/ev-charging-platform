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
import { I18nService } from '../../services/i18n.service';
import { StationImportService, ImportJobStatus, StationStats } from '../../services/station-import.service';
import { StationCountryService } from '../../services/station-country.service';
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
  /** Държава за импорт и за показване на станции в публичния списък */
  selectedCountry = 'BG';
  isImporting = false;
  isFinesScraping = false;
  currentJobId: string | null = null;
  finesScrapeResult: { success: boolean; imported?: number; updated?: number; total?: number; error?: string } | null = null;
  importStatus: ImportJobStatus | null = null;
  stats: StationStats | null = null;
  enrichStatus: { chargeprice: boolean; ecomovement: boolean } | null = null;
  isEnriching = false;
  enrichResult: { stationsEnrichedFromChargeprice: number; stationsEnrichedFromEcoMovement: number } | null = null;
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
    private stationCountry: StationCountryService,
    private snackBar: MatSnackBar,
    public i18n: I18nService
  ) {}

  ngOnInit() {
    this.selectedCountry = this.stationCountry.getCountry();
    this.loadStats();
    this.importService.getEnrichPricesStatus().subscribe({
      next: (s) => (this.enrichStatus = s),
      error: () => (this.enrichStatus = { chargeprice: false, ecomovement: false }),
    });
  }

  ngOnDestroy() {
    if (this.statusPollingSubscription) {
      this.statusPollingSubscription.unsubscribe();
    }
  }

  loadStats() {
    this.stationCountry.setCountry(this.selectedCountry);
    this.importService.getStationStats(this.selectedCountry).subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (error) => {
        console.error('Error loading stats:', error);
      },
    });
  }

  enrichPrices() {
    if (this.isEnriching) return;
    this.isEnriching = true;
    this.enrichResult = null;
    this.importService.enrichPrices(this.selectedCountry).subscribe({
      next: (res) => {
        this.enrichResult = {
          stationsEnrichedFromChargeprice: res.stationsEnrichedFromChargeprice,
          stationsEnrichedFromEcoMovement: res.stationsEnrichedFromEcoMovement,
        };
        this.snackBar.open(res.message, 'OK', { duration: 4000 });
        this.loadStats();
        this.isEnriching = false;
      },
      error: (err) => {
        this.snackBar.open(err.error?.error || 'Грешка при обогатяване на цени', 'OK', { duration: 5000 });
        this.isEnriching = false;
      },
    });
  }

  startImport() {
    if (this.isImporting) return;
    this.isImporting = true;
    this.importStatus = null;
    this.importService.importStations(this.selectedCountry).subscribe({
      next: (response) => {
        this.currentJobId = response.jobId;
        this.snackBar.open(`Импортът започна за ${this.selectedCountry}`, 'OK', { duration: 3000 });
        this.startPollingStatus();
      },
      error: () => {
        this.snackBar.open('Грешка при стартиране на импорт', 'OK', { duration: 5000 });
        this.isImporting = false;
      },
    });
  }

  startImportFines() {
    if (this.isImporting) return;
    this.isImporting = true;
    this.importStatus = null;
    this.importService.importFinesStations().subscribe({
      next: (response) => {
        this.currentJobId = response.jobId;
        this.snackBar.open('Импорт Fines (от OCM) започна за България', 'OK', { duration: 3000 });
        this.startPollingStatus();
      },
      error: () => {
        this.snackBar.open('Грешка при стартиране на импорт Fines', 'OK', { duration: 5000 });
        this.isImporting = false;
      },
    });
  }

  startImportFinesScrape() {
    if (this.isFinesScraping) return;
    this.isFinesScraping = true;
    this.finesScrapeResult = null;
    this.importService.importFinesScrape().subscribe({
      next: (res) => {
        this.finesScrapeResult = res;
        if (res.success) {
          this.snackBar.open(res.message ?? `Импортирани: ${res.imported}, актуализирани: ${res.updated}`, 'OK', { duration: 5000 });
          this.loadStats();
        } else {
          this.snackBar.open(res.error ?? 'Скрапинг неуспешен.', 'OK', { duration: 6000 });
        }
        this.isFinesScraping = false;
      },
      error: (err) => {
        this.finesScrapeResult = { success: false, error: err.error?.error ?? err.message ?? 'Грешка' };
        this.snackBar.open(this.finesScrapeResult.error ?? 'Грешка при скрапинг', 'OK', { duration: 6000 });
        this.isFinesScraping = false;
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
