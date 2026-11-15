import { httpResource } from "@angular/common/http";
import { Component, computed, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzRadioModule } from "ng-zorro-antd/radio";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzTooltipModule } from "ng-zorro-antd/tooltip";

import { CollectionSummary } from "../../core/models";
import { CollectionCard } from "./collection-card";

@Component({
  selector: "app-dashboard-page",
  imports: [
    RouterLink,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzRadioModule,
    NzSpinModule,
    NzTooltipModule,
    CollectionCard,
  ],
  template: `
    <div class="page dashboard-page">
      <!-- ================= WORKSPACE HERO / STATS HEADER ================= -->
      <header class="dashboard-header">
        <div class="header-main">
          <div class="header-titles">
            <h1 class="page-title">Trackers</h1>
            <p class="page-subtitle">
              Organize your projects, habits, finances, and collections in one clean workspace.
            </p>
          </div>

          <!-- Desktop Primary Action -->
          <div class="header-actions hidden sm:flex">
            <a
              nz-button
              nzType="primary"
              routerLink="/collections/new"
              class="create-tracker-btn"
            >
              <nz-icon nzType="plus" />
              <span>New Tracker</span>
            </a>
          </div>
        </div>

        @if (all().length > 0) {
          <!-- Stats Strip (Linear style stat pills) -->
          <div class="stats-strip" aria-label="Overview statistics">
            <div class="stat-card">
              <div class="stat-icon-wrap primary">
                <nz-icon nzType="appstore" />
              </div>
              <div class="stat-content">
                <span class="stat-label">Collections</span>
                <span class="stat-number tabular-nums">{{ all().length }}</span>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrap">
                <nz-icon nzType="database" />
              </div>
              <div class="stat-content">
                <span class="stat-label">Total Records</span>
                <span class="stat-number tabular-nums">{{ totalRecords() }}</span>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrap">
                <nz-icon nzType="clock-circle" />
              </div>
              <div class="stat-content">
                <span class="stat-label">Most Active</span>
                <span class="stat-text" [title]="recentTrackerName()">
                  {{ recentTrackerName() }}
                </span>
              </div>
            </div>
          </div>
        }
      </header>

      <!-- Syncing Indicator -->
      @if (isRefreshing()) {
        <div class="sync-banner">
          <nz-spin nzSimple nzSize="small" />
          <span>Syncing latest changes…</span>
        </div>
      }

      <!-- ================= SEARCH & SORT TOOLBAR ================= -->
      @if (all().length > 0) {
        <section class="dashboard-toolbar" aria-label="Search and filter trackers">
          <div class="search-input-wrap">
            <nz-input-wrapper class="w-full">
              <input
                nz-input
                [value]="query()"
                (input)="onQuery($event)"
                (keydown.escape)="clearQuery()"
                placeholder="Search trackers…"
                autocomplete="off"
                class="search-field"
              />
              <span nzInputPrefix class="search-prefix-icon">
                <nz-icon nzType="search" />
              </span>
              @if (query()) {
                <span nzInputSuffix>
                  <nz-icon
                    nzType="close-circle"
                    (click)="clearQuery()"
                    class="clear-icon"
                    aria-label="Clear search"
                  />
                </span>
              }
            </nz-input-wrapper>
          </div>

          <div class="toolbar-controls">
            <nz-radio-group
              [ngModel]="sort()"
              (ngModelChange)="sort.set($event)"
              nzButtonStyle="solid"
              nzSize="small"
              class="sort-radio-group"
              aria-label="Sort trackers"
            >
              <label nz-radio-button nzValue="recent">
                <span class="sort-label">
                  <nz-icon nzType="history" />
                  <span>Recent</span>
                </span>
              </label>
              <label nz-radio-button nzValue="name">
                <span class="sort-label">
                  <nz-icon nzType="sort-ascending" />
                  <span>Name</span>
                </span>
              </label>
              <label nz-radio-button nzValue="records">
                <span class="sort-label">
                  <nz-icon nzType="database" />
                  <span>Records</span>
                </span>
              </label>
            </nz-radio-group>
          </div>
        </section>
      }

      <!-- ================= CONTENT GRID / STATES ================= -->
      @if (isInitialLoading()) {
        <!-- Skeleton Placeholders -->
        <div class="tracker-grid" aria-hidden="true">
          @for (item of skeletonPlaceholders; track $index) {
            <div class="skeleton-card">
              <div class="skeleton-cover"></div>
              <div class="skeleton-body">
                <div class="skeleton-title"></div>
                <div class="skeleton-desc"></div>
                <div class="skeleton-footer"></div>
              </div>
            </div>
          }
        </div>
      } @else if (collections.error()) {
        <!-- Error State -->
        <div class="error-container">
          <div class="error-icon-box">
            <nz-icon nzType="disconnect" />
          </div>
          <h3 class="error-title">Could not load trackers</h3>
          <p class="error-desc">
            Something went wrong while connecting to the server. Please check your connection and try again.
          </p>
          <button nz-button nzType="default" (click)="collections.reload()">
            <nz-icon nzType="reload" /> Try again
          </button>
        </div>
      } @else if (all().length === 0 && collections.hasValue()) {
        <!-- Empty Workspace State -->
        <div class="empty-workspace">
          <div class="empty-icon-box">
            <nz-icon nzType="appstore" />
          </div>
          <h3 class="empty-title">No trackers yet</h3>
          <p class="empty-desc">
            Create your first tracker to organize books, workouts, expenses, or projects with custom fields.
          </p>
          <a nz-button nzType="primary" routerLink="/collections/new" class="empty-action-btn">
            <nz-icon nzType="plus" />
            <span>Create your first tracker</span>
          </a>
        </div>
      } @else if (visible().length === 0) {
        <!-- Search No Results -->
        <div class="no-results-box">
          <nz-icon nzType="search" class="no-results-icon" />
          <h3 class="no-results-title">No matching trackers</h3>
          <p class="no-results-desc">
            No trackers matched "{{ query() }}".
          </p>
          <button nz-button nzType="default" nzSize="small" (click)="clearQuery()">
            Clear search
          </button>
        </div>
      } @else {
        <!-- App Launcher Grid -->
        <div class="tracker-grid">
          @for (c of visible(); track c.id) {
            <app-collection-card [collection]="c" />
          }
        </div>
      }

      <!-- Mobile Floating Action Button (FAB) -->
      <div class="mobile-fab-wrap sm:hidden">
        <a
          nz-button
          nzType="primary"
          nzShape="circle"
          nzSize="large"
          routerLink="/collections/new"
          class="mobile-fab"
          aria-label="Create new tracker"
        >
          <nz-icon nzType="plus" />
        </a>
      </div>
    </div>
  `,
  styles: `
    .dashboard-page {
      padding-top: 24px;
      padding-bottom: 96px;
    }

    .dashboard-header {
      margin-bottom: 24px;
    }

    .header-main {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }

    .page-title {
      font-size: 1.85rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: var(--app-text);
      margin: 0;
    }

    .page-subtitle {
      font-size: 0.875rem;
      color: var(--app-text-secondary);
      margin: 4px 0 0;
      max-width: 600px;
      line-height: 1.5;
    }

    .create-tracker-btn {
      height: 38px;
      padding-inline: 16px;
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 0.875rem;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    /* Stats strip */
    .stats-strip {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 18px;
    }

    @media (max-width: 640px) {
      .stats-strip {
        grid-template-columns: 1fr 1fr;
      }
      .stats-strip .stat-card:last-child {
        grid-column: span 2;
      }
    }

    .stat-card {
      background: var(--app-surface);
      border: 1px solid var(--app-outline);
      border-radius: var(--radius-lg);
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: var(--app-shadow-xs);
    }

    .stat-icon-wrap {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: var(--app-surface-container-high);
      color: var(--app-text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;

      &.primary {
        background: var(--app-primary-container);
        color: var(--app-on-primary-container);
      }
    }

    .stat-content {
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .stat-label {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted);
    }

    .stat-number {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--app-text);
      line-height: 1.2;
    }

    .stat-text {
      font-size: 0.84375rem;
      font-weight: 600;
      color: var(--app-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sync-banner {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: var(--radius-md);
      background: var(--app-surface-container-high);
      color: var(--app-text-muted);
      font-size: 0.75rem;
      margin-bottom: 14px;
    }

    /* Toolbar */
    .dashboard-toolbar {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;

      @media (min-width: 640px) {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }

    .search-input-wrap {
      width: 100%;
      max-width: 320px;
    }

    .search-field {
      border-radius: var(--radius-md) !important;
      height: 36px;
    }

    .search-prefix-icon {
      color: var(--app-text-muted);
    }

    .clear-icon {
      color: var(--app-text-muted);
      cursor: pointer;
      &:hover {
        color: var(--app-text);
      }
    }

    .sort-radio-group {
      display: flex;
    }

    .sort-label {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    /* Grid */
    .tracker-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
      gap: 16px;
    }

    /* Skeleton */
    .skeleton-card {
      height: 190px;
      border-radius: var(--radius-xl);
      border: 1px solid var(--app-outline);
      background: var(--app-surface);
      overflow: hidden;
      animation: pulse 1.6s infinite ease-in-out;
      display: flex;
      flex-direction: column;
    }

    .skeleton-cover {
      height: 64px;
      background: var(--app-surface-container-high);
    }

    .skeleton-body {
      padding: 24px 16px 14px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .skeleton-title {
      height: 16px;
      width: 60%;
      background: var(--app-surface-container-high);
      border-radius: var(--radius-xs);
    }

    .skeleton-desc {
      height: 12px;
      width: 85%;
      background: var(--app-surface-container);
      border-radius: var(--radius-xs);
    }

    .skeleton-footer {
      height: 14px;
      width: 40%;
      background: var(--app-surface-container);
      border-radius: var(--radius-xs);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* States */
    .error-container,
    .empty-workspace,
    .no-results-box {
      background: var(--app-surface);
      border: 1px dashed var(--app-outline);
      border-radius: var(--radius-xl);
      padding: 44px 20px;
      text-align: center;
      max-width: 460px;
      margin: 32px auto;
      box-shadow: var(--app-shadow-xs);
    }

    .error-icon-box {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg);
      background: var(--app-error-container);
      color: var(--app-error);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      margin: 0 auto 14px;
    }

    .error-title,
    .empty-title,
    .no-results-title {
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--app-text);
      margin: 0 0 6px;
    }

    .error-desc,
    .empty-desc,
    .no-results-desc {
      font-size: 0.84375rem;
      color: var(--app-text-secondary);
      margin: 0 0 18px;
      line-height: 1.5;
    }

    .no-results-icon {
      font-size: 28px;
      color: var(--app-text-muted);
      margin-bottom: 10px;
    }

    /* Mobile FAB */
    .mobile-fab-wrap {
      position: fixed;
      right: 20px;
      bottom: 80px;
      z-index: 95;
    }

    .mobile-fab {
      width: 52px;
      height: 52px;
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }
  `,
})
export class DashboardPage {
  protected readonly collections = httpResource<CollectionSummary[]>(
    () => "/api/collections",
  );

  protected readonly skeletonPlaceholders = Array(8).fill(null);
  protected readonly query = signal("");
  protected readonly sort = signal<"recent" | "name" | "records">("recent");

  protected readonly all = computed(() => this.collections.value() ?? []);

  protected readonly totalRecords = computed(() =>
    this.all().reduce((sum, c) => sum + (c.recordCount ?? 0), 0),
  );

  protected readonly recentTrackerName = computed(() => {
    const list = this.all();
    if (!list.length) return "None";
    const sorted = [...list].sort((a, b) => {
      const ta = Date.parse(a.lastActivityAt ?? a.updatedAt) || 0;
      const tb = Date.parse(b.lastActivityAt ?? b.updatedAt) || 0;
      return tb - ta;
    });
    return sorted[0]?.name ?? "None";
  });

  protected readonly isInitialLoading = computed(
    () => this.collections.isLoading() && !this.collections.hasValue(),
  );

  protected readonly isRefreshing = computed(
    () => this.collections.isLoading() && this.collections.hasValue(),
  );

  protected readonly visible = computed(() => {
    const rawQuery = this.query().trim().toLowerCase();
    const tokens = rawQuery ? rawQuery.split(/\s+/) : [];

    const list = this.all().filter((c) => {
      if (!tokens.length) return true;
      const searchable = `${c.name} ${c.description ?? ""}`.toLowerCase();
      return tokens.every((token) => searchable.includes(token));
    });

    if (this.sort() === "name") {
      return [...list].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
    }

    if (this.sort() === "records") {
      return [...list].sort(
        (a, b) => (b.recordCount ?? 0) - (a.recordCount ?? 0),
      );
    }

    const toTimestamp = (c: CollectionSummary) => {
      const raw = c.lastActivityAt ?? c.updatedAt;
      return raw ? Date.parse(raw) || 0 : 0;
    };

    return [...list].sort((a, b) => toTimestamp(b) - toTimestamp(a));
  });

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected clearQuery(): void {
    this.query.set("");
  }
}
