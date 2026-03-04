import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  mode: 'login' | 'register' = 'login';
  name = '';
  email = '';
  password = '';
  hidePassword = true;
  loading = false;
  error: string | null = null;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    public i18n: I18nService
  ) {}

  setMode(m: 'login' | 'register'): void {
    this.mode = m;
    this.error = null;
  }

  onSubmit(): void {
    this.error = null;
    if (this.mode === 'login') {
      if (!this.email.trim() || !this.password) {
        this.error = this.i18n.t('auth.error.missingEmailPassword');
        return;
      }
      this.loading = true;
      this.auth.login({ email: this.email.trim(), password: this.password }).subscribe({
        next: () => {
          this.loading = false;
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
          this.router.navigateByUrl(returnUrl);
        },
        error: (err) => {
          this.loading = false;
          this.error =
            err?.error?.error ||
            err?.message ||
            this.i18n.t('auth.error.loginFailed');
        },
      });
    } else {
      if (!this.name.trim() || !this.email.trim() || !this.password) {
        this.error = this.i18n.t('auth.error.missingAllFields');
        return;
      }
      if (this.password.length < 6) {
        this.error = this.i18n.t('auth.error.passwordTooShort');
        return;
      }
      this.loading = true;
      this.auth
        .register({ name: this.name.trim(), email: this.email.trim(), password: this.password })
        .subscribe({
          next: () => {
            this.loading = false;
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
            this.router.navigateByUrl(returnUrl);
          },
          error: (err) => {
            this.loading = false;
            this.error =
              err?.error?.error ||
              err?.message ||
              this.i18n.t('auth.error.registerFailed');
          },
        });
    }
  }
}
