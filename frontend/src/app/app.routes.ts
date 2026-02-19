import { Routes } from '@angular/router';
import { adminGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./components/stations-list/stations-list.component').then(m => m.StationsListComponent) },
  { path: 'stations/:id', loadComponent: () => import('./components/station-detail/station-detail.component').then(m => m.StationDetailComponent) },
  { path: 'login', loadComponent: () => import('./components/auth/login.component').then(m => m.LoginComponent) },
  { path: 'register', redirectTo: 'login', pathMatch: 'full' },
  { path: 'admin', loadComponent: () => import('./components/admin-panel/admin-panel.component').then(m => m.AdminPanelComponent), canActivate: [adminGuard] },
  { path: '**', redirectTo: '' }
];
