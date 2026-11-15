import { httpResource } from "@angular/common/http";
import {
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { NzAvatarModule } from "ng-zorro-antd/avatar";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzDropdownModule } from "ng-zorro-antd/dropdown";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzMenuModule } from "ng-zorro-antd/menu";
import { NzTooltipModule } from "ng-zorro-antd/tooltip";

import { AuthService } from "../../core/auth.service";
import { HeaderService } from "../../core/header.service";
import { CollectionSummary } from "../../core/models";
import { NzThemeType, ThemeService } from "../../core/theme.service";

@Component({
  selector: "app-shell",
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NzButtonModule,
    NzIconModule,
    NzDropdownModule,
    NzMenuModule,
    NzAvatarModule,
    NzTooltipModule,
  ],
  template: `
    <div class="app-layout" [class.sidebar-collapsed]="isCollapsed()">
      <!-- ================= DESKTOP SIDEBAR ================= -->
      <aside class="app-sidebar" aria-label="Main Navigation">
        <!-- Sidebar Brand Header -->
        <div class="sidebar-header">
          <a routerLink="/" class="sidebar-brand" aria-label="Tracker home">
            <div class="brand-logo">
              <span class="logo-mark">▤</span>
            </div>
            @if (!isCollapsed()) {
              <div class="brand-text">
                <span class="brand-title">Tracker</span>
                <span class="brand-tag">Workspace</span>
              </div>
            }
          </a>

          @if (!isCollapsed()) {
            <button
              nz-button
              nzType="text"
              nzSize="small"
              class="collapse-btn"
              (click)="toggleCollapse()"
              nz-tooltip="Collapse sidebar (⌘B)"
              aria-label="Collapse sidebar"
            >
              <nz-icon nzType="menu-fold" />
            </button>
          }
        </div>

        <!-- Quick Action: Create New Tracker -->
        <div class="sidebar-action-wrap">
          <a
            routerLink="/collections/new"
            class="new-tracker-btn"
            [class.collapsed]="isCollapsed()"
            nz-tooltip
            [nzTooltipTitle]="isCollapsed() ? 'New Tracker' : ''"
            nzTooltipPlacement="right"
          >
            <nz-icon nzType="plus" class="new-icon" />
            @if (!isCollapsed()) {
              <span class="btn-text">New Tracker</span>
            }
          </a>
        </div>

        <!-- Sidebar Navigation Items -->
        <nav class="sidebar-nav">
          <div class="nav-section">
            <a
              routerLink="/"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
              class="nav-link"
              nz-tooltip
              [nzTooltipTitle]="isCollapsed() ? 'Overview' : ''"
              nzTooltipPlacement="right"
            >
              <div class="nav-icon-wrap">
                <nz-icon nzType="appstore" />
              </div>
              @if (!isCollapsed()) {
                <span class="nav-label">Overview</span>
              }
            </a>

            <a
              routerLink="/settings"
              routerLinkActive="active"
              class="nav-link"
              nz-tooltip
              [nzTooltipTitle]="isCollapsed() ? 'Settings' : ''"
              nzTooltipPlacement="right"
            >
              <div class="nav-icon-wrap">
                <nz-icon nzType="setting" />
              </div>
              @if (!isCollapsed()) {
                <span class="nav-label">Settings</span>
              }
            </a>
          </div>

          <!-- User's Trackers List -->
          <div class="nav-section trackers-section">
            @if (!isCollapsed()) {
              <div class="section-header">
                <span class="section-title">Trackers</span>
                <span class="section-count">{{ collectionsList().length }}</span>
              </div>
            } @else {
              <div class="section-divider"></div>
            }

            <div class="tracker-list">
              @for (c of collectionsList(); track c.id) {
                <a
                  [routerLink]="['/collections', c.id]"
                  routerLinkActive="active"
                  class="nav-link tracker-link"
                  nz-tooltip
                  [nzTooltipTitle]="isCollapsed() ? c.name : ''"
                  nzTooltipPlacement="right"
                >
                  <div class="tracker-icon-badge" aria-hidden="true">
                    {{ c.icon }}
                  </div>
                  @if (!isCollapsed()) {
                    <span class="tracker-name" [title]="c.name">{{ c.name }}</span>
                    @if (c.recordCount !== undefined) {
                      <span class="tracker-count">{{ c.recordCount }}</span>
                    }
                  }
                </a>
              }

              @if (collectionsList().length === 0 && !isCollapsed()) {
                <p class="empty-trackers-hint">No trackers created yet</p>
              }
            </div>
          </div>
        </nav>

        <!-- Sidebar Footer / User Profile & Collapse Toggle -->
        <div class="sidebar-footer">
          @if (isCollapsed()) {
            <button
              nz-button
              nzType="text"
              class="expand-btn"
              (click)="toggleCollapse()"
              nz-tooltip="Expand sidebar"
              nzTooltipPlacement="right"
              aria-label="Expand sidebar"
            >
              <nz-icon nzType="menu-unfold" />
            </button>
          }

          <!-- User Profile Tile -->
          <div
            class="user-profile-tile"
            [class.collapsed]="isCollapsed()"
            nz-dropdown
            [nzDropdownMenu]="userMenu"
            nzTrigger="click"
            role="button"
            tabindex="0"
            aria-label="Account options"
          >
            <nz-avatar class="user-avatar" [nzText]="initials()" />
            @if (!isCollapsed()) {
              <div class="user-meta">
                <span class="user-name">{{ auth.user()?.displayName || "User" }}</span>
                <span class="user-email">{{ auth.user()?.email }}</span>
              </div>
              <nz-icon nzType="more" class="user-menu-icon" />
            }
          </div>
        </div>
      </aside>

      <!-- ================= MOBILE OFF-CANVAS BACKDROP & DRAWER ================= -->
      @if (mobileMenuOpen()) {
        <div
          class="mobile-backdrop"
          (click)="mobileMenuOpen.set(false)"
          aria-hidden="true"
        ></div>
        <div class="mobile-drawer" role="dialog" aria-modal="true" aria-label="Mobile menu">
          <div class="mobile-drawer-header">
            <div class="brand-text">
              <span class="brand-title">Tracker</span>
            </div>
            <button
              nz-button
              nzType="text"
              nzShape="circle"
              (click)="mobileMenuOpen.set(false)"
              aria-label="Close menu"
            >
              <nz-icon nzType="close" />
            </button>
          </div>

          <div class="mobile-drawer-body">
            <a
              routerLink="/"
              (click)="mobileMenuOpen.set(false)"
              class="mobile-nav-link"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
            >
              <nz-icon nzType="appstore" />
              <span>Overview</span>
            </a>

            <a
              routerLink="/collections/new"
              (click)="mobileMenuOpen.set(false)"
              class="mobile-nav-link highlight"
            >
              <nz-icon nzType="plus" />
              <span>New Tracker</span>
            </a>

            <a
              routerLink="/settings"
              (click)="mobileMenuOpen.set(false)"
              class="mobile-nav-link"
              routerLinkActive="active"
            >
              <nz-icon nzType="setting" />
              <span>Settings</span>
            </a>

            <div class="mobile-section-header">
              <span>Your Trackers</span>
              <span class="count-pill">{{ collectionsList().length }}</span>
            </div>

            <div class="mobile-trackers-list">
              @for (c of collectionsList(); track c.id) {
                <a
                  [routerLink]="['/collections', c.id]"
                  (click)="mobileMenuOpen.set(false)"
                  class="mobile-tracker-link"
                  routerLinkActive="active"
                >
                  <span class="tracker-icon">{{ c.icon }}</span>
                  <span class="tracker-name">{{ c.name }}</span>
                  <span class="tracker-count">{{ c.recordCount }}</span>
                </a>
              }
            </div>
          </div>

          <div class="mobile-drawer-footer">
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-2">
                <nz-avatar class="user-avatar" [nzText]="initials()" />
                <div class="text-xs">
                  <div class="font-semibold text-(--app-text)">{{ auth.user()?.displayName }}</div>
                  <div class="text-(--app-text-muted)">{{ auth.user()?.email }}</div>
                </div>
              </div>
              <button
                nz-button
                nzType="text"
                nzDanger
                (click)="auth.logout()"
                nz-tooltip="Sign out"
              >
                <nz-icon nzType="logout" />
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ================= MAIN CONTENT WRAPPER ================= -->
      <div class="app-main-wrapper">
        <!-- Sticky Header Bar -->
        <header class="app-topbar">
          <div class="topbar-inner">
            <div class="topbar-left">
              <!-- Mobile menu hamburger button -->
              <button
                nz-button
                nzType="text"
                nzShape="circle"
                class="mobile-toggle-btn"
                (click)="mobileMenuOpen.set(true)"
                aria-label="Open menu"
              >
                <nz-icon nzType="menu" />
              </button>

              <!-- Context Breadcrumb / Detail Header -->
              @if (header.detail(); as d) {
                <div class="topbar-breadcrumb">
                  <a
                    [routerLink]="d.backLink"
                    class="breadcrumb-back-link"
                    aria-label="Back"
                  >
                    <nz-icon nzType="arrow-left" />
                  </a>
                  <div class="breadcrumb-current">
                    <span class="breadcrumb-icon" aria-hidden="true">{{ d.icon }}</span>
                    <span class="breadcrumb-title">{{ d.title }}</span>
                  </div>
                </div>
              } @else {
                <div class="topbar-page-title">
                  <span class="brand-subtle sm:hidden">Tracker</span>
                  <span class="desktop-subtle hidden sm:inline">Workspace</span>
                </div>
              }
            </div>

            <!-- Right Controls -->
            <div class="topbar-right">
              <!-- Theme Picker Menu -->
              <button
                nz-button
                nzType="text"
                nzShape="circle"
                nz-dropdown
                [nzDropdownMenu]="themeMenu"
                aria-label="Switch theme"
                class="topbar-icon-btn"
                nz-tooltip="Theme options"
              >
                <nz-icon [nzType]="icon()" />
              </button>

              <nz-dropdown-menu #themeMenu="nzDropdownMenu">
                <ul nz-menu>
                  <li nz-menu-group nzTitle="Theme Appearance">
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

              <!-- User Menu Dropdown -->
              <button
                nz-button
                nzType="text"
                nzShape="circle"
                nz-dropdown
                [nzDropdownMenu]="userMenu"
                aria-label="Account options"
                class="topbar-avatar-btn"
              >
                <nz-avatar class="topbar-avatar" [nzText]="initials()" />
              </button>
            </div>
          </div>
        </header>

        <!-- Main Page Route Outlet -->
        <main class="app-content">
          <router-outlet />
        </main>

        <!-- ================= MOBILE BOTTOM NAVIGATION BAR ================= -->
        <nav class="mobile-bottom-nav safe-area-bottom" aria-label="Mobile Navigation">
          <a
            routerLink="/"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            class="bottom-nav-item"
          >
            <nz-icon nzType="appstore" />
            <span>Trackers</span>
          </a>

          <a
            routerLink="/collections/new"
            routerLinkActive="active"
            class="bottom-nav-item add-action"
          >
            <div class="bottom-add-pill">
              <nz-icon nzType="plus" />
            </div>
            <span>Create</span>
          </a>

          <a
            routerLink="/settings"
            routerLinkActive="active"
            class="bottom-nav-item"
          >
            <nz-icon nzType="setting" />
            <span>Settings</span>
          </a>
        </nav>
      </div>

      <!-- Shared User Dropdown Menu -->
      <nz-dropdown-menu #userMenu="nzDropdownMenu">
        <ul nz-menu>
          <li nz-menu-item class="user-info-item" [nzDisabled]="true">
            <div class="user-card-header">
              <nz-avatar class="user-avatar-lg" [nzText]="initials()" />
              <div class="user-card-meta">
                <strong class="user-card-name">{{ auth.user()?.displayName || "User" }}</strong>
                <span class="user-card-email">{{ auth.user()?.email }}</span>
              </div>
            </div>
          </li>
          <li nz-menu-divider></li>
          <li nz-menu-item>
            <a routerLink="/settings" class="dropdown-flex-link">
              <nz-icon nzType="setting" />
              <span class="menu-label">Settings</span>
            </a>
          </li>
          <li nz-menu-divider></li>
          <li nz-menu-item nzDanger (click)="auth.logout()">
            <div class="dropdown-flex-link">
              <nz-icon nzType="logout" />
              <span class="menu-label">Sign out</span>
            </div>
          </li>
        </ul>
      </nz-dropdown-menu>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background: var(--app-surface-container);
    }

    .app-layout {
      display: flex;
      min-height: 100vh;
      width: 100%;
      position: relative;
    }

    /* ================= SIDEBAR ================= */
    .app-sidebar {
      width: 250px;
      flex-shrink: 0;
      background: var(--app-sidebar);
      border-right: 1px solid var(--app-sidebar-border);
      display: flex;
      flex-direction: column;
      height: 100vh;
      position: sticky;
      top: 0;
      z-index: 90;
      transition: width var(--transition-normal);
      user-select: none;
    }

    .sidebar-collapsed .app-sidebar {
      width: 68px;
    }

    .sidebar-header {
      height: 54px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 14px;
      border-bottom: 1px solid var(--app-outline-variant);
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--app-text);
      text-decoration: none;
      min-width: 0;
    }

    .brand-logo {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md);
      background: var(--app-primary);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.1rem;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.15;
      min-width: 0;
    }

    .brand-title {
      font-weight: 700;
      font-size: 1rem;
      letter-spacing: -0.02em;
      color: var(--app-text);
    }

    .brand-tag {
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--app-text-muted);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .collapse-btn {
      color: var(--app-text-muted);
      border-radius: var(--radius-sm);
      &:hover {
        color: var(--app-text);
        background: var(--app-surface-container-high);
      }
    }

    /* Action Button */
    .sidebar-action-wrap {
      padding: 12px 14px 6px;
    }

    .new-tracker-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 36px;
      width: 100%;
      border-radius: var(--radius-md);
      background: var(--app-surface);
      border: 1px solid var(--app-outline);
      color: var(--app-text);
      font-weight: 500;
      font-size: 0.8125rem;
      text-decoration: none;
      box-shadow: var(--app-shadow-xs);
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--app-primary);
        color: var(--app-primary);
        background: var(--app-primary-container);
      }

      &.collapsed {
        width: 40px;
        height: 40px;
        margin: 0 auto;
        padding: 0;
      }
    }

    .new-icon {
      font-size: 14px;
    }

    /* Navigation Sections */
    .sidebar-nav {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .nav-section {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text-muted);
    }

    .section-count {
      font-size: 0.6875rem;
      background: var(--app-surface-container-high);
      color: var(--app-text-muted);
      padding: 1px 6px;
      border-radius: var(--radius-full);
      font-weight: 600;
    }

    .section-divider {
      height: 1px;
      background: var(--app-outline-variant);
      margin: 8px 6px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 10px;
      border-radius: var(--radius-md);
      color: var(--app-text-secondary);
      font-size: 0.84375rem;
      font-weight: 500;
      text-decoration: none;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--app-surface-container-high);
        color: var(--app-text);
      }

      &.active {
        background: var(--app-primary-container);
        color: var(--app-on-primary-container);
        font-weight: 600;

        .nav-icon-wrap {
          color: var(--app-primary);
        }
      }
    }

    .sidebar-collapsed .nav-link {
      justify-content: center;
      padding: 8px;
    }

    .nav-icon-wrap {
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .nav-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Trackers specific */
    .tracker-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .tracker-link {
      font-size: 0.8125rem;
    }

    .tracker-icon-badge {
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      flex-shrink: 0;
    }

    .tracker-name {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tracker-count {
      font-size: 0.6875rem;
      color: var(--app-text-muted);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .empty-trackers-hint {
      font-size: 0.75rem;
      color: var(--app-text-muted);
      padding: 8px 10px;
      margin: 0;
      font-style: italic;
    }

    /* Footer */
    .sidebar-footer {
      padding: 10px;
      border-top: 1px solid var(--app-outline-variant);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .expand-btn {
      width: 100%;
      color: var(--app-text-muted);
      border-radius: var(--radius-md);
      &:hover {
        color: var(--app-text);
        background: var(--app-surface-container-high);
      }
    }

    .user-profile-tile {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 8px;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background-color var(--transition-fast);

      &:hover {
        background: var(--app-surface-container-high);
      }

      &.collapsed {
        justify-content: center;
        padding: 4px;
      }
    }

    .user-avatar {
      background: var(--app-primary);
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      width: 30px;
      height: 30px;
      line-height: 30px;
      flex-shrink: 0;
    }

    .user-meta {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .user-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--app-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-email {
      font-size: 0.6875rem;
      color: var(--app-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-menu-icon {
      font-size: 14px;
      color: var(--app-text-muted);
    }

    /* ================= MAIN WRAPPER ================= */
    .app-main-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      position: relative;
    }

    /* Top bar */
    .app-topbar {
      height: 54px;
      position: sticky;
      top: 0;
      z-index: 80;
      background: color-mix(in srgb, var(--app-surface) 88%, transparent);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--app-outline);
      transition: border-color var(--transition-fast), background-color var(--transition-fast);
    }

    .topbar-inner {
      height: 100%;
      max-width: 1440px;
      margin: 0 auto;
      padding: 0 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .mobile-toggle-btn {
      display: none;
      color: var(--app-text-secondary);
      font-size: 16px;
    }

    .topbar-breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .breadcrumb-back-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: var(--radius-sm);
      color: var(--app-text-secondary);
      transition: background-color var(--transition-fast), color var(--transition-fast);

      &:hover {
        background: var(--app-surface-container-high);
        color: var(--app-text);
      }
    }

    .breadcrumb-current {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

    .breadcrumb-icon {
      font-size: 1.05rem;
      line-height: 1;
    }

    .breadcrumb-title {
      font-weight: 600;
      font-size: 0.9375rem;
      color: var(--app-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: min(50vw, 360px);
    }

    .topbar-page-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--app-text-secondary);
      letter-spacing: -0.01em;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .topbar-icon-btn {
      color: var(--app-text-secondary);
      &:hover {
        color: var(--app-text);
        background: var(--app-surface-container-high);
      }
    }

    .topbar-avatar-btn {
      padding: 0;
      border: 0;
      background: transparent;
      cursor: pointer;
    }

    .topbar-avatar {
      background: var(--app-primary);
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      width: 30px;
      height: 30px;
      line-height: 30px;
    }

    .app-content {
      flex: 1;
      width: 100%;
    }

    /* Mobile Bottom Navigation */
    .mobile-bottom-nav {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: color-mix(in srgb, var(--app-surface) 92%, transparent);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-top: 1px solid var(--app-outline);
      z-index: 100;
      align-items: center;
      justify-content: space-around;
      padding-inline: 12px;
    }

    .bottom-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      color: var(--app-text-muted);
      font-size: 0.6875rem;
      font-weight: 500;
      text-decoration: none;
      min-width: 56px;
      height: 100%;
      transition: color var(--transition-fast);

      nz-icon {
        font-size: 18px;
      }

      &.active {
        color: var(--app-primary);
        font-weight: 600;
      }

      &.add-action {
        color: var(--app-text);
      }
    }

    .bottom-add-pill {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-full);
      background: var(--app-primary);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      margin-top: -8px;
    }

    /* Dropdown helper styles */
    .dropdown-flex-link {
      display: flex;
      align-items: center;
      gap: 8px;
      color: inherit;
    }

    .menu-label {
      margin-left: 2px;
    }

    .user-info-item {
      cursor: default !important;
      padding: 10px 12px !important;
    }

    .user-card-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .user-avatar-lg {
      background: var(--app-primary);
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      width: 38px;
      height: 38px;
      line-height: 38px;
      flex-shrink: 0;
    }

    .user-card-meta {
      display: flex;
      flex-direction: column;
      line-height: 1.25;
    }

    .user-card-name {
      color: var(--app-text);
      font-size: 0.9375rem;
    }

    .user-card-email {
      color: var(--app-text-muted);
      font-size: 0.75rem;
    }

    /* Mobile off-canvas drawer */
    .mobile-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 110;
      backdrop-filter: blur(4px);
    }

    .mobile-drawer {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      width: min(84vw, 320px);
      background: var(--app-surface);
      z-index: 120;
      box-shadow: var(--app-shadow-xl);
      display: flex;
      flex-direction: column;
      animation: slideInLeft 0.25s var(--ease-standard);
    }

    @keyframes slideInLeft {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }

    .mobile-drawer-header {
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--app-outline-variant);
    }

    .mobile-drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .mobile-nav-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: var(--radius-md);
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--app-text);
      text-decoration: none;

      &.highlight {
        background: var(--app-primary-container);
        color: var(--app-on-primary-container);
        font-weight: 600;
      }

      &.active {
        background: var(--app-surface-container-high);
        font-weight: 600;
      }
    }

    .mobile-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 14px;
      padding: 8px 14px 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text-muted);
    }

    .count-pill {
      background: var(--app-surface-container-high);
      color: var(--app-text-muted);
      padding: 1px 6px;
      border-radius: var(--radius-full);
      font-size: 0.6875rem;
    }

    .mobile-trackers-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .mobile-tracker-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 14px;
      border-radius: var(--radius-md);
      color: var(--app-text);
      text-decoration: none;
      font-size: 0.875rem;

      &.active {
        background: var(--app-primary-container);
        color: var(--app-on-primary-container);
        font-weight: 600;
      }
    }

    .mobile-drawer-footer {
      padding: 14px;
      border-top: 1px solid var(--app-outline-variant);
      background: var(--app-surface-container);
    }

    /* Media queries */
    @media (max-width: 768px) {
      .app-sidebar {
        display: none;
      }

      .mobile-toggle-btn {
        display: inline-flex;
      }

      .mobile-bottom-nav {
        display: flex;
      }

      .app-content {
        padding-bottom: 70px;
      }
    }
  `,
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly header = inject(HeaderService);
  private readonly router = inject(Router);

  // Collections resource to show live trackers in the sidebar
  protected readonly collections = httpResource<CollectionSummary[]>(
    () => "/api/collections",
  );

  protected readonly collectionsList = computed(
    () => this.collections.value() ?? [],
  );

  protected readonly isCollapsed = signal<boolean>(this.readInitialCollapsed());
  protected readonly mobileMenuOpen = signal<boolean>(false);

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

  protected toggleCollapse(): void {
    const next = !this.isCollapsed();
    this.isCollapsed.set(next);
    try {
      localStorage.setItem("pt-sidebar-collapsed", next ? "1" : "0");
    } catch {}
  }

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

  private readInitialCollapsed(): boolean {
    try {
      return localStorage.getItem("pt-sidebar-collapsed") === "1";
    } catch {
      return false;
    }
  }
}
