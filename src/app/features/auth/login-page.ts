import { Component, computed, inject, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { safeReturnUrl } from '../../core/guards';
import { problemMessage } from '../../core/http-errors';
import { AuthLayout } from '../../shared/auth-layout';

type ErrorState = { touched(): boolean; errors(): readonly { kind: string }[] };

@Component({
  selector: 'app-login-page',
  imports: [FormField, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, RouterLink, AuthLayout],
  template: `
    <app-auth-layout heading="Welcome back" subheading="Sign in to your trackers.">
      <form (submit)="submit($event)" novalidate>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Email</mat-label>
          <input matInput type="email" autocomplete="email" [formField]="f.email" />
        </mat-form-field>
        @if (emailError(); as msg) { <p class="field-error" role="alert">{{ msg }}</p> }

        <mat-form-field appearance="outline" class="full">
          <mat-label>Password</mat-label>
          <input matInput [type]="showPassword() ? 'text' : 'password'" autocomplete="current-password" [formField]="f.password" />
          <button mat-icon-button matSuffix type="button" (click)="showPassword.set(!showPassword())"
                  [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'">
            <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
        </mat-form-field>
        @if (passwordError(); as msg) { <p class="field-error" role="alert">{{ msg }}</p> }

        @if (serverError(); as msg) { <p class="field-error" role="alert">{{ msg }}</p> }

        <button mat-flat-button class="full submit" type="submit" [disabled]="busy()">
          {{ busy() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
      <p class="muted alt">New here? <a routerLink="/register">Create an account</a></p>
    </app-auth-layout>
  `,
  styles: `.submit { height: 48px; margin-top: 8px; } .alt { margin-top: 20px; text-align: center; }`,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly model = signal({ email: '', password: '' });
  protected readonly f = form(this.model, (path) => {
    required(path.email);
    email(path.email);
    required(path.password);
  });

  protected readonly showPassword = signal(false);
  protected readonly busy = signal(false);
  protected readonly attempted = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly emailError = computed(() => this.message(this.f.email(), {
    required: 'Enter your email address.', email: 'Enter a valid email address.',
  }));
  protected readonly passwordError = computed(() => this.message(this.f.password(), { required: 'Enter your password.' }));

  private message(state: ErrorState, texts: Record<string, string>): string | null {
    if (!this.attempted() && !state.touched()) return null;
    const kind = state.errors()[0]?.kind;
    return kind ? (texts[kind] ?? 'This value is not valid.') : null;
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.attempted.set(true);
    if (this.f.email().invalid() || this.f.password().invalid()) return;

    this.busy.set(true);
    this.serverError.set(null);
    try {
      const { email, password } = this.model();
      await this.auth.login({ email: email.trim(), password });
      await this.router.navigateByUrl(safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')));
    } catch (err) {
      this.serverError.set(problemMessage(err, 'Could not sign in.'));
    } finally {
      this.busy.set(false);
    }
  }
}
