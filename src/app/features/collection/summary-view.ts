import { httpResource } from "@angular/common/http";
import { Component, inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";

import { CollectionContext } from "../../core/collection-context";
import { formatDateTime, formatMetric, metricLabel } from "../../core/format";
import { SummaryReport } from "../../core/models";

@Component({
  selector: "app-summary-view",
  imports: [MatIconModule, MatProgressBarModule, MatButtonModule],
  template: `
    <div class="page summary-page">
      <!-- ================= LOADING ================= -->
      @if (summary.isLoading() && !summary.hasValue()) {
        <mat-progress-bar
          class="loading"
          mode="indeterminate"
          aria-label="Loading summary"
        />
      }

      <!-- ================= SUMMARY ================= -->
      @if (summary.value(); as s) {
        <section class="grid" aria-label="Collection summary metrics">
          <!-- Total Records Tile -->
          <article class="tile tile-primary">
            <div class="tile-top">
              <span class="label">Total Records</span>
              <div class="tile-icon-badge primary-badge" aria-hidden="true">
                <mat-icon>storage</mat-icon>
              </div>
            </div>
            <div class="value-wrapper">
              <span class="value">{{ s.recordCount }}</span>
            </div>
          </article>

          <!-- Last Activity Tile -->
          @if (s.lastActivityAt) {
            <article class="tile tile-date tile-wide">
              <div class="tile-top">
                <span class="label">Last Activity</span>
                <div class="tile-icon-badge" aria-hidden="true">
                  <mat-icon>schedule</mat-icon>
                </div>
              </div>
              <div class="value-wrapper">
                <span class="value value-date">
                  {{ dateTime(s.lastActivityAt) }}
                </span>
              </div>
            </article>
          }

          <!-- Metric Aggregation Tiles -->
          @for (m of s.metrics; track m.fieldId + ":" + m.aggregation) {
            <article class="tile">
              <div class="tile-top">
                <span class="label" [title]="label(m)">{{ label(m) }}</span>
                <div class="tile-icon-badge" aria-hidden="true">
                  <mat-icon>{{ metricIcon(m.aggregation) }}</mat-icon>
                </div>
              </div>
              <div class="value-wrapper">
                <span class="value">{{ format(m) }}</span>
              </div>
            </article>
          }
        </section>

        <!-- ================= EMPTY METRICS HINT ================= -->
        @if (s.metrics.length === 0) {
          <div class="hint-card">
            <div class="hint-icon" aria-hidden="true">
              <mat-icon>lightbulb</mat-icon>
            </div>
            <div class="hint-body">
              <strong>Add summary calculations</strong>
              <p>
                Configure a “Summary calculation” on any numerical or rated
                field (like Sum for expenses or Average for ratings) to see
                instant stats here.
              </p>
            </div>
          </div>
        }
      }

      <!-- ================= ERROR STATE ================= -->
      @else if (summary.error()) {
        <div class="empty-state">
          <div class="error-icon-box" aria-hidden="true">
            <mat-icon>cloud_off</mat-icon>
          </div>
          <h3>Could not load the summary</h3>
          <p>Something went wrong while calculating the summary metrics.</p>
          <button mat-stroked-button type="button" (click)="summary.reload()">
            <mat-icon>refresh</mat-icon>
            Try again
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    /* =========================================================
       PAGE WRAPPER
       ========================================================= */
    .summary-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px 16px 48px;
    }

    /* =========================================================
       LOADING
       ========================================================= */
    .loading {
      margin-bottom: 24px;
      border-radius: 999px;
      height: 4px;
    }

    /* =========================================================
       SUMMARY GRID
       ========================================================= */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
      gap: 16px;
    }

    /* =========================================================
       TILE (KPI CARD)
       ========================================================= */
    .tile {
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 16px;
      padding: 20px;
      border-radius: 18px;
      background: var(--mat-sys-surface-container-low, #f7f7f9);
      border: 1px solid var(--mat-sys-outline-variant, rgba(0, 0, 0, 0.08));
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      transition:
        transform 0.15s ease,
        box-shadow 0.15s ease,
        border-color 0.15s ease;
    }

    .tile:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
      border-color: var(--mat-sys-outline, rgba(0, 0, 0, 0.16));
    }

    /* =========================================================
       PRIMARY TILE
       ========================================================= */
    .tile-primary {
      background: var(--mat-sys-primary-container, #d8e2ff);
      color: var(--mat-sys-on-primary-container, #001a41);
      border-color: transparent;
    }

    .tile-primary:hover {
      box-shadow: 0 6px 18px rgba(0, 90, 193, 0.16);
    }

    /* =========================================================
       TILE TOP & ICON BADGE
       ========================================================= */
    .tile-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .label {
      font-size: 0.85rem;
      font-weight: 600;
      line-height: 1.35;
      color: var(--mat-sys-on-surface-variant, #44474e);
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .tile-primary .label {
      color: var(--mat-sys-on-primary-container, #001a41);
      opacity: 0.85;
    }

    .tile-icon-badge {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      border-radius: 10px;
      background: var(--mat-sys-surface-container-high, #e2e2e6);
      color: var(--mat-sys-on-surface-variant, #44474e);
    }

    .tile-icon-badge mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .primary-badge {
      background: var(--mat-sys-primary, #005ac1);
      color: var(--mat-sys-on-primary, #ffffff);
    }

    /* =========================================================
       VALUE
       ========================================================= */
    .value-wrapper {
      min-width: 0;
    }

    .value {
      display: block;
      font-size: clamp(1.8rem, 1.4rem + 1vw, 2.2rem);
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
      color: var(--mat-sys-on-surface, #1a1c1e);
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .tile-primary .value {
      color: var(--mat-sys-on-primary-container, #001a41);
    }

    .value-date {
      font-size: 1.05rem;
      font-weight: 600;
      line-height: 1.35;
      letter-spacing: -0.01em;
      color: var(--mat-sys-on-surface-variant, #44474e);
    }

    /* =========================================================
       HINT CALLOUT CARD
       ========================================================= */
    .hint-card {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-top: 24px;
      padding: 16px 20px;
      border-radius: 16px;
      background: var(--mat-sys-surface-container-low, #f7f7f9);
      border: 1px solid var(--mat-sys-outline-variant, rgba(0, 0, 0, 0.08));
    }

    .hint-icon {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      border-radius: 8px;
      background: var(--mat-sys-tertiary-container, #ffd8e4);
      color: var(--mat-sys-on-tertiary-container, #31111d);
    }

    .hint-icon mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .hint-body strong {
      display: block;
      margin-bottom: 3px;
      color: var(--mat-sys-on-surface, #1a1c1e);
      font-size: 0.925rem;
    }

    .hint-body p {
      margin: 0;
      font-size: 0.85rem;
      color: var(--mat-sys-on-surface-variant, #44474e);
      line-height: 1.45;
    }

    /* =========================================================
       ERROR / EMPTY STATE
       ========================================================= */
    .empty-state {
      min-height: 260px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 40px 20px;
      border-radius: 16px;
      border: 1px dashed var(--mat-sys-outline-variant, rgba(0, 0, 0, 0.12));
    }

    .error-icon-box {
      width: 52px;
      height: 52px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      background: var(--mat-sys-error-container, #ffdad6);
      color: var(--mat-sys-error, #ba1a1a);
      margin-bottom: 14px;
    }

    .error-icon-box mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .empty-state h3 {
      margin: 0 0 6px;
      color: var(--mat-sys-on-surface, #1a1c1e);
      font-size: 1.15rem;
      font-weight: 600;
    }

    .empty-state p {
      max-width: 380px;
      margin: 0 0 16px;
      color: var(--mat-sys-on-surface-variant, #44474e);
      font-size: 0.9rem;
    }

    /* =========================================================
       MOBILE RESPONSIVENESS (< 640px)
       ========================================================= */
    @media (max-width: 640px) {
      .summary-page {
        padding: 16px 12px 36px;
      }

      /* 2-column mobile widget dashboard layout */
      .grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }

      .tile {
        padding: 14px;
        border-radius: 14px;
        gap: 12px;
      }

      .tile-wide {
        grid-column: 1 / -1;
      }

      .value {
        font-size: 1.6rem;
      }

      .value-date {
        font-size: 0.95rem;
      }

      .tile-icon-badge {
        width: 30px;
        height: 30px;
        border-radius: 8px;
      }

      .tile-icon-badge mat-icon {
        font-size: 17px;
        width: 17px;
        height: 17px;
      }

      .hint-card {
        padding: 14px;
        gap: 10px;
        margin-top: 16px;
      }
    }

    /* EXTRA SMALL PHONES (< 360px) */
    @media (max-width: 360px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class SummaryView {
  private readonly ctx = inject(CollectionContext);

  protected readonly summary = httpResource<SummaryReport>(() => {
    const id = this.ctx.id();
    return id ? `/api/collections/${id}/summary` : undefined;
  });

  protected readonly format = formatMetric;
  protected readonly label = metricLabel;
  protected readonly dateTime = formatDateTime;

  protected metricIcon(aggregation?: string): string {
    switch (aggregation?.toLowerCase()) {
      case "sum":
        return "functions";
      case "avg":
      case "average":
        return "query_stats";
      case "min":
        return "arrow_downward";
      case "max":
        return "arrow_upward";
      case "count":
        return "pin";
      default:
        return "analytics";
    }
  }
}
