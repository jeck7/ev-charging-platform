import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./components/stations-list/stations-list.component').then(m => m.StationsListComponent) },
  { path: 'stations/:id', loadComponent: () => import('./components/station-detail/station-detail.component').then(m => m.StationDetailComponent) },
  { path: '**', redirectTo: '' }
];
