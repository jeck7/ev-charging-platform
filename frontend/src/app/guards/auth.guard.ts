import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) {
    return of(true);
  }
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return of(false);
};

export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();
  if (user && user.role === 'ADMIN') {
    return of(true);
  }
  if (auth.isLoggedIn()) {
    router.navigate(['/']);
    return of(false);
  }
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return of(false);
};
