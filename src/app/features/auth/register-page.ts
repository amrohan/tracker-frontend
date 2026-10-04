import { Component, computed, inject, signal } from "@angular/core";
import {
  FormField,
  email,
  form,
  minLength,
  required,
} from "@angular/forms/signals";
import { Router, RouterLink } from "@angular/router";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzFormModule } from "ng-zorro-antd/form";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { AuthService } from "../../core/auth.service";
import { problemMessage } from "../../core/http-errors";
import { AuthLayout } from "../../shared/auth-layout";

type ErrorState = { touched(): boolean; errors(): readonly { kind: string }[] };

@Component({
  selector: "app-register-page",
  imports: [
    FormField,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    RouterLink,
    AuthLayout,
  ],
  template: `
    <app-auth-layout
      heading="Create your account"
      subheading="Your data stays yours. Start tracking in a minute."
    >
      <form (submit)="submit($event)" novalidate class="flex flex-col gap-5">
        <!-- Name -->
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-text">Your name</label>
          <nz-form-item class="mb-0!">
            <nz-form-control [nzErrorTip]="nameError() || ''">
              <input
                nz-input
                autocomplete="name"
                [formField]="f.displayName"
                placeholder="Your full name"
              />
            </nz-form-control>
          </nz-form-item>
        </div>

        <!-- Email -->
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-text">Email</label>
          <nz-form-item class="mb-0!">
            <nz-form-control [nzErrorTip]="emailError() || ''">
              <input
                nz-input
                type="email"
                autocomplete="email"
                [formField]="f.email"
                placeholder="you@example.com"
              />
            </nz-form-control>
          </nz-form-item>
        </div>

        <!-- Password -->
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-text">Password</label>
          <nz-form-item class="mb-0!">
            <nz-form-control
              [nzErrorTip]="passwordError() || ''"
              nzExtra="At least 8 characters"
            >
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
        </div>

        @if (serverError(); as msg) {
          <p
            class="flex items-center gap-2 rounded-xl bg-error-container px-3.5 py-2.5 text-sm text-on-error-container"
            role="alert"
          >
            <nz-icon
              nzType="exclamation-circle"
              nzTheme="fill"
              class="shrink-0"
            />
            {{ msg }}
          </p>
        }

        <button
          nz-button
          nzType="primary"
          nzBlock
          type="submit"
          [disabled]="busy()"
        >
          {{ busy() ? "Creating account…" : "Create account" }}
        </button>
      </form>

      <p class="mt-6! text-center text-sm text-text-muted">
        Already have an account?
        <a routerLink="/login" class="font-medium text-primary hover:underline"
          >Sign in</a
        >
      </p>
    </app-auth-layout>
  `,
  styles: ``,
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly model = signal({
    displayName: "",
    email: "",
    password: "",
  });
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

  protected readonly nameError = computed(() =>
    this.message(this.f.displayName(), {
      required: "Tell us what to call you.",
    }),
  );
  protected readonly emailError = computed(() =>
    this.message(this.f.email(), {
      required: "Enter your email address.",
      email: "Enter a valid email address.",
    }),
  );
  protected readonly passwordError = computed(() =>
    this.message(this.f.password(), {
      required: "Choose a password.",
      minLength: "Use at least 8 characters.",
    }),
  );

  private message(
    state: ErrorState,
    texts: Record<string, string>,
  ): string | null {
    if (!this.attempted() && !state.touched()) return null;
    const kind = state.errors()[0]?.kind;
    return kind ? (texts[kind] ?? "This value is not valid.") : null;
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.attempted.set(true);
    if (
      this.f.displayName().invalid() ||
      this.f.email().invalid() ||
      this.f.password().invalid()
    )
      return;

    this.busy.set(true);
    this.serverError.set(null);
    try {
      const { displayName, email, password } = this.model();
      await this.auth.register({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
      });
      await this.router.navigateByUrl("/");
    } catch (err) {
      this.serverError.set(
        problemMessage(err, "Could not create the account."),
      );
    } finally {
      this.busy.set(false);
    }
  }
}
