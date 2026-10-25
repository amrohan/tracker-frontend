import { Component, OnInit, inject, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";

import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzSpinModule } from "ng-zorro-antd/spin";

import { SharingApi } from "../../core/sharing-api.service";
import { AuthService } from "../../core/auth.service";
import { Notify } from "../../core/notify.service";
import { problemMessage } from "../../core/http-errors";

@Component({
  selector: "app-accept-invite-page",
  imports: [RouterLink, NzButtonModule, NzIconModule, NzSpinModule],
  template: `
    <div class="ai-root">
      <div class="ai-card">
        <div class="ai-icon-wrap">
          @if (loading()) {
            <nz-spin nzSimple nzSize="large" />
          } @else if (requiresAuth()) {
            <span class="ai-icon">✉️</span>
          } @else if (error()) {
            <span class="ai-icon">❌</span>
          } @else {
            <span class="ai-icon">🎉</span>
          }
        </div>

        @if (loading()) {
          <h2>Accepting your invite…</h2>
          <p>Please wait a moment while we set up your access.</p>
        } @else if (requiresAuth()) {
          <h2>You've been invited!</h2>
          <p>
            Please sign in or create an account to accept this invitation and
            access the tracker.
          </p>
          <div class="flex flex-col gap-2.5 mt-4">
            <a
              [routerLink]="['/login']"
              [queryParams]="{ returnUrl: returnUrl() }"
              nz-button
              nzType="primary"
              class="rounded-xl!"
            >
              Sign in to accept
            </a>
            <a
              [routerLink]="['/register']"
              [queryParams]="{ returnUrl: returnUrl() }"
              nz-button
              nzType="default"
              class="rounded-xl!"
            >
              Create free account
            </a>
          </div>
        } @else if (error()) {
          <h2>Invite error</h2>
          <p>{{ error() }}</p>
          <a routerLink="/" nz-button nzType="default" class="rounded-xl!"
            >Go to Dashboard</a
          >
        } @else {
          <h2>You're in! 🎊</h2>
          <p>
            You've successfully joined
            <strong>{{ collectionIcon() }} {{ collectionName() }}</strong>
            as an <strong class="capitalize">{{ role() }}</strong
            >.
          </p>
          <div class="flex items-center justify-center gap-2.5 mt-5">
            @if (collectionId()) {
              <a
                [routerLink]="['/collections', collectionId()]"
                nz-button
                nzType="primary"
                class="rounded-xl!"
              >
                <nz-icon nzType="arrow-right" />
                Open Tracker
              </a>
            }
            <a routerLink="/" nz-button nzType="default" class="rounded-xl!">
              Dashboard
            </a>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .ai-root {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--app-background, #f8fafc);
      padding: 1.5rem;
    }
    .ai-card {
      max-width: 28rem;
      width: 100%;
      text-align: center;
      background: var(--app-surface, #fff);
      border-radius: 1.5rem;
      border: 1px solid var(--app-outline-variant, #e5e7eb);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
      padding: 3rem 2.5rem;
    }
    .ai-icon-wrap {
      margin-bottom: 1.5rem;
      min-height: 4rem;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .ai-icon {
      font-size: 3.5rem;
    }
    h2 {
      font-size: 1.5rem;
      font-weight: 800;
      margin: 0 0 0.5rem;
      color: var(--app-text, #111);
    }
    p {
      color: var(--app-text-muted, #6b7280);
      margin: 0 0 1.5rem;
      line-height: 1.5;
      font-size: 0.9375rem;
    }
  `,
})
export class AcceptInvitePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(SharingApi);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(Notify);

  readonly loading = signal(true);
  readonly requiresAuth = signal(false);
  readonly error = signal<string | null>(null);
  readonly role = signal<string>("viewer");
  readonly collectionId = signal<string | null>(null);
  readonly collectionName = signal<string>("the tracker");
  readonly collectionIcon = signal<string>("📁");
  readonly returnUrl = signal<string>("/");

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get("token") ?? "";
    const currentPath = this.router.url;
    this.returnUrl.set(currentPath);

    if (!token) {
      this.error.set("No invite token found in the URL.");
      this.loading.set(false);
      return;
    }

    if (!this.auth.isAuthenticated()) {
      this.loading.set(false);
      this.requiresAuth.set(true);
      return;
    }

    try {
      const result = await firstValueFrom(this.api.acceptInvite(token));
      this.role.set(result.role);
      this.collectionId.set(result.collectionId);
      if (result.collectionName) this.collectionName.set(result.collectionName);
      if (result.collectionIcon) this.collectionIcon.set(result.collectionIcon);
      this.notify.success(
        `Successfully joined ${result.collectionName || "the tracker"}!`,
      );
      this.loading.set(false);
    } catch (err: unknown) {
      const msg = problemMessage(
        err,
        "This invite link is invalid, already used, or has expired.",
      );
      this.error.set(msg);
      this.loading.set(false);
    }
  }
}
