import { Component, computed, inject, signal } from '@angular/core';
import { FormField, email, form, minLength, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { AuthService } from '../../core/auth.service';
import { problemMessage } from '../../core/http-errors';
import { AuthLayout } from '../../shared/auth-layout';

type ErrorState = { touched(): boolean; errors(): readonly { kind: string }[] };

@Component({
  selector: 'app-register-page',
  imports: [FormField, NzFormModule, NzInputModule, NzButtonModule, NzIconModule, RouterLink, AuthLayout],
  template: `
    <app-auth-layout heading="Create your account" subheading="Your data stays yours. Start tracking in a minute.">
      <form (submit)="submit($event)" novalidate class="auth-form">
        <nz-form-item>
          <nz-form-label>Your name</nz-form-label>
          <nz-form-control [nzErrorTip]="nameError() || ''">
            <input nz-input autocomplete="name" [formField]="f.displayName" placeholder="Your full name" />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label>Email</nz-form-label>
          <nz-form-control [nzErrorTip]="emailError() || ''">
            <input nz-input type="email" autocomplete="email" [formField]="f.email" placeholder="you@example.com" />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label>Password</nz-form-label>
          <nz-form-control [nzErrorTip]="passwordError() || ''" nzExtra="At least 8 characters">
            <nz-input-password>
              <input
                nz-input
                type="password"
                autocomplete="new-password"
                [formField]="f.password"
                placeholder="Choose a password"
              />
            </nz-input-password>
          </nz-form-control>
        </nz-form-item>

        @if (serverError(); as msg) {
          <p class="field-error" role="alert">{{ msg }}</p>
        }

        <button nz-button nzType="primary" nzBlock type="submit" [disabled]="busy()" class="submit-btn">
          {{ busy() ? 'Creating account…' : 'Create account' }}
        </button>
      </form>
      <p class="muted alt">Already have an account? <a routerLink="/login">Sign in</a></p>
    </app-auth-layout>
  `,
  styles: `
    .auth-form { display: flex; flex-direction: column; gap: 4px; }
    .submit-btn { height: 48px; margin-top: 8px; }
    .alt { margin-top: 20px; text-align: center; }
  `,
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly model = signal({ displayName: '', email: '', password: '' });
  protected readonly f = form(this.model, (path) => {
    required(path.displayName);
    required(path.email);
    email(path.email);
    required(path.password);
    minLength(path.password, 8);
  });

  protected readonly busy = signal(false);
  protected readonly attempted = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly nameError = computed(() => this.message(this.f.displayName(), { required: 'Tell us what to call you.' }));
  protected readonly emailError = computed(() => this.message(this.f.email(), {
    required: 'Enter your email address.', email: 'Enter a valid email address.',
  }));
  protected readonly passwordError = computed(() => this.message(this.f.password(), {
    required: 'Choose a password.', minLength: 'Use at least 8 characters.',
  }));

  private message(state: ErrorState, texts: Record<string, string>): string | null {
    if (!this.attempted() && !state.touched()) return null;
    const kind = state.errors()[0]?.kind;
    return kind ? (texts[kind] ?? 'This value is not valid.') : null;
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.attempted.set(true);
    if (this.f.displayName().invalid() || this.f.email().invalid() || this.f.password().invalid()) return;

    this.busy.set(true);
    this.serverError.set(null);
    try {
      const { displayName, email, password } = this.model();
      await this.auth.register({ displayName: displayName.trim(), email: email.trim(), password });
      await this.router.navigateByUrl('/');
    } catch (err) {
      this.serverError.set(problemMessage(err, 'Could not create the account.'));
    } finally {
      this.busy.set(false);
    }
  }
}
