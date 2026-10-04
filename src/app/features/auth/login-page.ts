import { Component, computed, inject, signal } from "@angular/core";
import { FormField, email, form, required } from "@angular/forms/signals";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzFormModule } from "ng-zorro-antd/form";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { AuthService } from "../../core/auth.service";
import { safeReturnUrl } from "../../core/guards";
import { problemMessage } from "../../core/http-errors";
import { AuthLayout } from "../../shared/auth-layout";

type ErrorState = { touched(): boolean; errors(): readonly { kind: string }[] };

@Component({
  selector: "app-login-page",
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
      heading="Welcome back"
      subheading="Sign in to your trackers."
    >
      <form
        (submit)="submit($event)"
        novalidate
        class="auth-form flex flex-col gap-5"
      >
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

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-text">Password</label>
          <nz-form-item class="mb-0!">
            <nz-form-control [nzErrorTip]="passwordError() || ''">
              <nz-input-password>
                <input
                  nz-input
                  type="password"
                  autocomplete="current-password"
                  [formField]="f.password"
                  placeholder="Your password"
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
          class="submit-btn"
        >
          {{ busy() ? "Signing in…" : "Sign in" }}
        </button>
      </form>

      <p class="mt-4! text-center text-sm text-text-muted">
        New here?
        <a
          routerLink="/register"
          class="font-medium text-primary hover:underline"
          >Create an account</a
        >
      </p>
    </app-auth-layout>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly model = signal({ email: "", password: "" });
  protected readonly f = form(this.model, (path) => {
    required(path.email);
    email(path.email);
    required(path.password);
  });

  protected readonly busy = signal(false);
  protected readonly attempted = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly emailError = computed(() =>
    this.message(this.f.email(), {
      required: "Enter your email address.",
      email: "Enter a valid email address.",
    }),
  );
  protected readonly passwordError = computed(() =>
    this.message(this.f.password(), { required: "Enter your password." }),
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
    if (this.f.email().invalid() || this.f.password().invalid()) return;

    this.busy.set(true);
    this.serverError.set(null);
    try {
      const { email, password } = this.model();
      await this.auth.login({ email: email.trim(), password });
      await this.router.navigateByUrl(
        safeReturnUrl(this.route.snapshot.queryParamMap.get("returnUrl")),
      );
    } catch (err) {
      this.serverError.set(problemMessage(err, "Could not sign in."));
    } finally {
      this.busy.set(false);
    }
  }
}
