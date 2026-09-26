import { httpResource } from "@angular/common/http";
import { Component, computed, signal } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { RouterLink } from "@angular/router";

import { CollectionSummary } from "../../core/models";
import { CollectionCard } from "./collection-card";

@Component({
  selector: "app-dashboard-page",
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonToggleModule,
    MatProgressBarModule,
    CollectionCard,
  ],
  template: `
    <div class="dashboard">
      <header class="head">
        <div class="heading">
          <span class="eyebrow">Workspace</span>
          <div class="title-row">
            <h1>My trackers</h1>
            @if (all().length > 0) {
              <span class="count-badge">{{ all().length }}</span>
            }
          </div>
          <p class="muted">
            Anything you want to remember, organized in one place.
          </p>
        </div>

        <a
          mat-flat-button
          color="primary"
          class="create-button"
          routerLink="/collections/new"
        >
          <mat-icon>add</mat-icon>
          <span>New tracker</span>
        </a>
      </header>

      @if (isRefreshing()) {
        <mat-progress-bar
          class="loading-bar"
          mode="indeterminate"
          aria-label="Updating trackers"
        />
      }

      @if (isInitialLoading()) {
        <div class="card-grid" aria-hidden="true">
          @for (item of skeletonPlaceholders; track $index) {
            <div class="skeleton-card">
              <div class="skeleton-icon"></div>
              <div class="skeleton-line title"></div>
              <div class="skeleton-line text"></div>
              <div class="skeleton-line footer"></div>
            </div>
          }
        </div>
      } @else if (collections.error()) {
        <div class="state-card error-state" role="alert">
          <div class="state-icon error-icon" aria-hidden="true">
            <mat-icon>cloud_off</mat-icon>
          </div>
          <h3>Could not load your trackers</h3>
          <p>Something went wrong while communicating with the server.</p>
          <button
            mat-stroked-button
            type="button"
            (click)="collections.reload()"
          >
            <mat-icon>refresh</mat-icon>
            Try again
          </button>
        </div>
      } @else if (all().length === 0 && collections.hasValue()) {
        <div class="state-card empty-state">
          <div class="state-icon" aria-hidden="true">
            <mat-icon>library_add</mat-icon>
          </div>
          <h3>Create your first tracker</h3>
          <p>
            A tracker can hold anything — books, expenses, trips, or projects.
            You choose the fields and structure.
          </p>
          <a mat-flat-button color="primary" routerLink="/collections/new">
            <mat-icon>add</mat-icon>
            Create a tracker
          </a>
        </div>
      } @else if (all().length > 0) {
        <section class="content" aria-label="Your trackers">
          <div class="tools">
            <mat-form-field
              appearance="outline"
              class="search-field"
              subscriptSizing="dynamic"
            >
              <mat-icon matPrefix class="search-prefix">search</mat-icon>
              <mat-label>Search trackers</mat-label>
              <input
                matInput
                [value]="query()"
                (input)="onQuery($event)"
                (keydown.escape)="clearQuery()"
                placeholder="Search by name or description…"
                autocomplete="off"
              />
              @if (query()) {
                <button
                  mat-icon-button
                  matSuffix
                  type="button"
                  aria-label="Clear search"
                  (click)="clearQuery()"
                >
                  <mat-icon>close</mat-icon>
                </button>
              }
            </mat-form-field>

            <mat-button-toggle-group
              class="sort-toggle"
              [value]="sort()"
              (change)="sort.set($event.value)"
              aria-label="Sort trackers"
            >
              <mat-button-toggle value="recent">
                <mat-icon>schedule</mat-icon>
                <span>Recent</span>
              </mat-button-toggle>
              <mat-button-toggle value="name">
                <mat-icon>sort_by_alpha</mat-icon>
                <span>Name</span>
              </mat-button-toggle>
            </mat-button-toggle-group>
          </div>

          <div class="result-info" aria-live="polite">
            @if (query()) {
              <span>
                <strong>{{ visible().length }}</strong>
                {{ visible().length === 1 ? "tracker" : "trackers" }} found for
                “{{ query() }}”
              </span>
            } @else {
              <span>
                Showing all <strong>{{ all().length }}</strong>
                {{ all().length === 1 ? "tracker" : "trackers" }}
              </span>
            }
          </div>

          @if (visible().length === 0) {
            <div class="state-card no-results">
              <div class="state-icon" aria-hidden="true">
                <mat-icon>search_off</mat-icon>
              </div>
              <h3>No trackers found</h3>
              <p>No trackers match “{{ query() }}”. Try a different keyword.</p>
              <button mat-stroked-button type="button" (click)="clearQuery()">
                <mat-icon>close</mat-icon>
                Clear search
              </button>
            </div>
          } @else {
            <div class="card-grid">
              @for (c of visible(); track c.id) {
                <app-collection-card [collection]="c" />
              }
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: `
    .dashboard {
      max-width: 1240px;
      margin: 0 auto;
      padding: 32px 20px 48px;
    }

    .head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 24px;
    }

    .heading {
      min-width: 0;
    }

    .eyebrow {
      display: inline-block;
      margin-bottom: 4px;
      color: var(--mat-sys-primary, #005ac1);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    h1 {
      margin: 0;
      font-size: clamp(1.8rem, 1.4rem + 1.2vw, 2.4rem);
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.03em;
      color: var(--mat-sys-on-surface, #1a1c1e);
    }

    .count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px 10px;
      border-radius: 999px;
      background: var(--mat-sys-surface-container-high, #e8e8ec);
      color: var(--mat-sys-on-surface-variant, #44474e);
      font-size: 0.825rem;
      font-weight: 600;
    }

    .muted {
      margin: 8px 0 0;
      font-size: 0.95rem;
      color: var(--mat-sys-on-surface-variant, #44474e);
    }

    .create-button {
      flex-shrink: 0;
      border-radius: 12px;
      font-weight: 500;
      padding: 0 20px;
      height: 44px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      transition:
        transform 0.15s ease,
        box-shadow 0.15s ease;
    }

    .create-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.14);
    }

    .loading-bar {
      margin-bottom: 20px;
      border-radius: 999px;
      height: 4px;
    }

    .content {
      min-width: 0;
    }

    .tools {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 8px;
    }

    .search-field {
      width: min(400px, 100%);
    }

    .search-prefix {
      color: var(--mat-sys-on-surface-variant, #44474e);
      margin-right: 8px;
      margin-left: 4px;
    }

    .sort-toggle {
      flex-shrink: 0;
      border-radius: 12px;
      overflow: hidden;
    }

    .sort-toggle mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      vertical-align: middle;
      margin-right: 6px;
    }

    .result-info {
      min-height: 24px;
      margin-bottom: 16px;
      color: var(--mat-sys-on-surface-variant, #44474e);
      font-size: 0.85rem;
    }

    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    .skeleton-card {
      min-height: 160px;
      padding: 20px;
      border-radius: 16px;
      background: var(--mat-sys-surface-container, #f3edf7);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .skeleton-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: var(--mat-sys-surface-container-high, #e8e8ec);
      animation: pulse 1.4s ease-in-out infinite;
    }

    .skeleton-line {
      border-radius: 4px;
      background: var(--mat-sys-surface-container-high, #e8e8ec);
      animation: pulse 1.4s ease-in-out infinite;
    }

    .skeleton-line.title {
      width: 60%;
      height: 18px;
    }

    .skeleton-line.text {
      width: 85%;
      height: 14px;
    }

    .skeleton-line.footer {
      width: 40%;
      height: 12px;
      margin-top: auto;
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 0.55;
      }
      50% {
        opacity: 0.95;
      }
    }

    .state-card {
      min-height: 280px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 48px 24px;
      border-radius: 16px;
      border: 1px dashed var(--mat-sys-outline-variant, rgba(0, 0, 0, 0.12));
      background: var(--mat-sys-surface-container-lowest, transparent);
      margin: 16px 0;
    }

    .state-icon {
      width: 56px;
      height: 56px;
      display: grid;
      place-items: center;
      margin-bottom: 16px;
      border-radius: 16px;
      background: var(--mat-sys-surface-container, #eeeeee);
      color: var(--mat-sys-primary, #005ac1);
    }

    .state-icon mat-icon {
      width: 28px;
      height: 28px;
      font-size: 28px;
    }

    .error-icon {
      color: var(--mat-sys-error, #ba1a1a);
      background: var(--mat-sys-error-container, #ffdad6);
    }

    .state-card h3 {
      margin: 0 0 8px;
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--mat-sys-on-surface, #1a1c1e);
    }

    .state-card p {
      max-width: 400px;
      margin: 0 0 20px;
      color: var(--mat-sys-on-surface-variant, #44474e);
      font-size: 0.925rem;
      line-height: 1.45;
    }

    @media (max-width: 768px) {
      .dashboard {
        padding: 24px 16px 36px;
      }

      .tools {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }

      .search-field {
        width: 100%;
      }

      .sort-toggle {
        width: 100%;
        display: flex;
      }

      .sort-toggle mat-button-toggle {
        flex: 1;
      }
    }

    @media (max-width: 540px) {
      .head {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .create-button {
        width: 100%;
        justify-content: center;
      }

      .card-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class DashboardPage {
  protected readonly collections = httpResource<CollectionSummary[]>(
    () => "/api/collections",
  );

  protected readonly skeletonPlaceholders = Array(6).fill(null);
  protected readonly query = signal("");
  protected readonly sort = signal<"recent" | "name">("recent");

  protected readonly all = computed(() => this.collections.value() ?? []);

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
      if (!tokens.length) {
        return true;
      }
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
