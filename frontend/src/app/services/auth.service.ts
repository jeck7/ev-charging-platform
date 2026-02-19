import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import type { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from '../models/auth.model';

const AUTH_TOKEN_KEY = 'ev_charging_token';
const AUTH_USER_KEY = 'ev_charging_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.stationsApiUrl}/auth`;

  private tokenSignal = signal<string | null>(this.getStoredToken());
  private userSignal = signal<AuthUser | null>(this.getStoredUser());

  readonly token = this.tokenSignal.asReadonly();
  readonly currentUser = this.userSignal.asReadonly();
  readonly isLoggedIn = computed(() => !!this.tokenSignal());

  constructor(private http: HttpClient) {
    if (this.getStoredToken() && !this.userSignal()) {
      this.fetchMe().subscribe();
    }
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request).pipe(
      tap((res) => this.setSession(res))
    );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, request).pipe(
      tap((res) => this.setSession(res))
    );
  }

  logout(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  }

  fetchMe(): Observable<AuthUser | null> {
    return this.http.get<AuthUser>(`${this.apiUrl}/me`).pipe(
      tap((user) => {
        this.userSignal.set(user);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      }),
      catchError(() => {
        this.logout();
        return of(null);
      })
    );
  }

  private setSession(res: AuthResponse): void {
    this.tokenSignal.set(res.token);
    const user: AuthUser = { id: 0, email: res.email, name: res.name, role: res.role };
    this.userSignal.set(user);
    localStorage.setItem(AUTH_TOKEN_KEY, res.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  private getStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}
