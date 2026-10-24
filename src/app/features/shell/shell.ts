import { Component, inject } from "@angular/core";
import { RouterLink, RouterOutlet } from "@angular/router";
import { NzAvatarModule } from "ng-zorro-antd/avatar";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzDropdownModule } from "ng-zorro-antd/dropdown";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzMenuModule } from "ng-zorro-antd/menu";
import { AuthService } from "../../core/auth.service";
import { NzThemeType, ThemeService } from "../../core/theme.service";
import { HeaderService } from "../../core/header.service";

@Component({
  selector: "app-shell",
  imports: [
    RouterOutlet,
    RouterLink,
    NzButtonModule,
    NzIconModule,
    NzDropdownModule,
    NzMenuModule,
    NzAvatarModule,
  ],
  template: `
    <!-- ================= APP HEADER ================= -->
    <header class="bar">
      <div class="flex gap-2 p-2 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        @if (header.detail(); as d) {
          <div class="flex items-center">
            <button
              nz-button
              nzType="text"
              nzShape="circle"
              [routerLink]="d.backLink"
              aria-label="Back to trackers"
              class="flex! gap-2!"
            >
              <nz-icon nzType="arrow-left" />
              <div class="detail-title">
                <span class="detail-icon" aria-hidden="true">{{ d.icon }}</span>
                <span class="detail-name">{{ d.title }}</span>
              </div>
            </button>
          </div>
        } @else {
          <!-- Default mode: app brand -->
          <a routerLink="/" class="brand" aria-label="Tracker home">
            <div class="brand-icon">
              <nz-icon nzType="appstore" />
            </div>
            <span class="brand-name">Tracker</span>
          </a>
        }

        <span class="spacer"></span>

        <!-- Right Controls -->
        <div class="flex items-center gap-2">
          <!-- Quick Share / Add Button -->
          <a
            nz-button
            nzType="text"
            nzShape="circle"
            routerLink="/share-target"
            aria-label="Share or quick add content"
            title="Share content to tracker"
          >
            <nz-icon nzType="share-alt" />
          </a>

          <!-- Theme Menu Toggle -->
          <button
            nz-button
            nzType="text"
            nzShape="circle"
            nz-dropdown
            [nzDropdownMenu]="themeMenu"
            aria-label="Change theme"
          >
            <nz-icon [nzType]="icon()" />
          </button>

          <nz-dropdown-menu #themeMenu="nzDropdownMenu">
            <ul nz-menu>
              <li nz-menu-group nzTitle="Official Themes">
                <ul>
                  @for (opt of themes; track opt.type) {
                    <li
                      nz-menu-item
                      [nzSelected]="theme.nzTheme() === opt.type"
                      (click)="theme.nzTheme.set(opt.type)"
                    >
                      <nz-icon [nzType]="opt.icon" />
                      <span class="menu-label">{{ opt.label }}</span>
                    </li>
                  }
                </ul>
              </li>
            </ul>
          </nz-dropdown-menu>

          <!-- User Menu with Animated Avatar -->
          <button
            nz-button
            nzType="text"
            nzShape="circle"
            nz-dropdown
            [nzDropdownMenu]="userMenu"
            aria-label="Account menu"
            class="avatar-button"
          >
            <nz-avatar class="avatar" [nzText]="initials()" />
          </button>

          <nz-dropdown-menu #userMenu="nzDropdownMenu">
            <ul nz-menu>
              <li nz-menu-item class="user-card-item" [nzDisabled]="true">
                <div class="user-card">
                  <nz-avatar class="avatar-large" [nzText]="initials()" />
                  <div class="user-info">
                    <strong>{{ auth.user()?.displayName || "User" }}</strong>
                    <span class="user-email">{{ auth.user()?.email }}</span>
                  </div>
                </div>
              </li>
              <li nz-menu-divider></li>
              <li nz-menu-item>
                <a routerLink="/settings">
                  <nz-icon nzType="setting" />
                  <span class="menu-label">Settings</span>
                </a>
              </li>
              <li nz-menu-divider></li>
              <li nz-menu-item nzDanger (click)="auth.logout()">
                <nz-icon nzType="logout" />
                <span class="menu-label">Sign out</span>
              </li>
            </ul>
          </nz-dropdown-menu>
        </div>
      </div>
    </header>

    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: `
    .bar {
      position: sticky;
      top: 0;
      z-index: 100;
      height: 56px;
      padding: 0;
      background: color-mix(in srgb, var(--app-surface) 94%, transparent);
      border-bottom: 1px solid var(--app-outline-variant);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      transition:
        background-color 0.2s ease,
        border-color 0.2s ease;
    }

    .bar-inner {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      padding: 0 16px;
      box-sizing: border-box;
      max-width: 1280px;
      margin: 0 auto;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: var(--app-text);
      text-decoration: none;
      user-select: none;
    }

    .brand-icon {
      width: 30px;
      height: 30px;
      border-radius: 9px;
      background: var(--app-primary);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .brand:hover .brand-icon {
      transform: scale(1.08);
    }

    .brand-name {
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      color: var(--app-text);
    }

    .spacer {
      flex: 1;
    }

    .avatar-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      animation: avatarPop 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
      transition:
        transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
        box-shadow 0.2s ease;
    }

    @keyframes avatarPop {
      0% {
        transform: scale(0.75);
        opacity: 0;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }

    .avatar-button:hover {
      transform: scale(1.08);
    }

    .avatar-button:active {
      transform: scale(0.94);
    }

    .avatar {
      background-color: var(--app-primary);
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      transition: box-shadow 0.2s ease;
    }

    .avatar-button:hover .avatar {
      box-shadow: 0 0 0 2px var(--app-primary);
    }

    .avatar-large {
      background-color: var(--app-primary);
      color: #fff;
      font-weight: 700;
      width: 40px;
      height: 40px;
      line-height: 40px;
      font-size: 15px;
      flex-shrink: 0;
    }

    .menu-label {
      margin-left: 8px;
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 4px;
      min-width: 200px;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      line-height: 1.3;
    }

    .user-info strong {
      color: var(--app-text);
      font-size: 0.95rem;
    }

    .user-email {
      font-size: 0.8rem;
      color: var(--app-text-muted);
    }

    .content {
      min-height: calc(100vh - 56px);
    }

    @media (max-width: 600px) {
      .bar-inner {
        padding: 0 12px;
      }
      .brand-name {
        font-size: 1.1rem;
      }
    }
    .detail-title {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      margin-left: 4px;
      animation: avatarPop 0.2s ease;
    }

    .detail-icon {
      font-size: 1.1rem;
      line-height: 1;
    }

    .detail-name {
      font-size: 1rem;
      font-weight: 700;
      color: var(--app-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: min(50vw, 360px);
    }
  `,
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly header = inject(HeaderService);

  protected readonly themes: {
    type: NzThemeType;
    label: string;
    icon: string;
  }[] = [
    { type: "default", label: "Default (Light)", icon: "bulb" },
    { type: "dark", label: "Dark", icon: "bulb" },
    { type: "compact", label: "Compact", icon: "table" },
    { type: "aliyun", label: "Aliyun (Enterprise)", icon: "cloud" },
    { type: "system", label: "Match System", icon: "setting" },
  ];

  protected icon(): string {
    const t = this.theme.nzTheme();
    return this.themes.find((x) => x.type === t)?.icon ?? "bulb";
  }

  protected initials(): string {
    const name = this.auth.user()?.displayName?.trim();
    if (!name) return "?";
    const parts = name.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}
