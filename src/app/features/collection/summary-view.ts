import { httpResource } from "@angular/common/http";
import { Component, inject } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";

import { CollectionContext } from "../../core/collection-context";
import { formatDateTime, formatMetric, metricLabel } from "../../core/format";
import { SummaryReport } from "../../core/models";

@Component({
  selector: "app-summary-view",

  imports: [MatIconModule, MatProgressBarModule],

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
        <section class="grid" aria-label="Collection summary">
          <!-- Records -->
          <article class="tile tile-primary">
            <div class="tile-header">
              <span class="label"> Records </span>

              <mat-icon aria-hidden="true"> database </mat-icon>
            </div>

            <span class="value">
              {{ s.recordCount }}
            </span>
          </article>

          <!-- Last activity -->
          @if (s.lastActivityAt) {
            <article class="tile">
              <div class="tile-header">
                <span class="label"> Last activity </span>

                <mat-icon aria-hidden="true"> schedule </mat-icon>
              </div>

              <span class="value value-date">
                {{ dateTime(s.lastActivityAt) }}
              </span>
            </article>
          }

          <!-- Metrics -->
          @for (m of s.metrics; track m.fieldId + ":" + m.aggregation) {
            <article class="tile">
              <div class="tile-header">
                <span class="label">
                  {{ label(m) }}
                </span>

                <mat-icon aria-hidden="true"> analytics </mat-icon>
              </div>

              <span class="value">
                {{ format(m) }}
              </span>
            </article>
          }
        </section>

        <!-- ================= NO METRICS ================= -->
        @if (s.metrics.length === 0) {
          <div class="hint">
            <mat-icon aria-hidden="true"> lightbulb </mat-icon>

            <div>
              <strong> Add summary calculations </strong>

              <p>
                Choose a “Summary calculation” on a field, such as Sum for an
                amount or Average for a rating, and it will appear here.
              </p>
            </div>
          </div>
        }
      }

      <!-- ================= ERROR ================= -->
      @else if (summary.error()) {
        <div class="empty-state">
          <mat-icon aria-hidden="true"> error_outline </mat-icon>

          <h3>Could not load the summary</h3>

          <p>Something went wrong while loading the collection summary.</p>
        </div>
      }
    </div>
  `,

  styles: `
    /* =========================================================
       PAGE
       ========================================================= */

    .summary-page {
      padding-top: 24px;
      padding-bottom: 40px;
    }

    /* =========================================================
       LOADING
       ========================================================= */

    .loading {
      margin-bottom: 20px;
      border-radius: 999px;
    }

    /* =========================================================
       SUMMARY GRID
       ========================================================= */

    .grid {
      display: grid;

      grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));

      gap: 16px;
    }

    /* =========================================================
       TILE
       ========================================================= */

    .tile {
      min-width: 0;

      display: flex;
      flex-direction: column;

      gap: 14px;

      padding: 20px;

      border-radius: 20px;

      background: var(--mat-sys-surface-container-low);

      border: 1px solid var(--mat-sys-outline-variant);

      transition:
        transform 120ms ease,
        box-shadow 120ms ease;
    }

    .tile:hover {
      transform: translateY(-1px);

      box-shadow: var(--mat-sys-level1);
    }

    /* =========================================================
       PRIMARY TILE
       ========================================================= */

    .tile-primary {
      background: var(--mat-sys-primary-container);

      color: var(--mat-sys-on-primary-container);

      border-color: transparent;
    }

    /* =========================================================
       TILE HEADER
       ========================================================= */

    .tile-header {
      display: flex;

      align-items: center;
      justify-content: space-between;

      gap: 12px;

      min-width: 0;
    }

    .tile-header mat-icon {
      width: 20px;
      height: 20px;

      font-size: 20px;

      flex-shrink: 0;

      opacity: 0.65;
    }

    /* =========================================================
       LABEL
       ========================================================= */

    .label {
      min-width: 0;

      font-size: 0.875rem;

      font-weight: 500;

      line-height: 1.3;

      color: var(--mat-sys-on-surface-variant);

      overflow-wrap: anywhere;
    }

    .tile-primary .label {
      color: var(--mat-sys-on-primary-container);
    }

    /* =========================================================
       VALUE
       ========================================================= */

    .value {
      display: block;

      min-width: 0;

      font-family: "Bricolage Grotesque", sans-serif;

      font-size: clamp(1.8rem, 1.4rem + 1.2vw, 2.4rem);

      font-weight: 700;

      line-height: 1.1;

      letter-spacing: -0.02em;

      overflow-wrap: anywhere;

      word-break: break-word;
    }

    .value-date {
      font-size: clamp(1.05rem, 0.9rem + 0.4vw, 1.4rem);

      line-height: 1.25;
    }

    /* =========================================================
       HINT
       ========================================================= */

    .hint {
      display: flex;

      align-items: flex-start;

      gap: 12px;

      margin-top: 20px;

      padding: 16px 18px;

      border-radius: 16px;

      background: var(--mat-sys-surface-container-low);

      border: 1px solid var(--mat-sys-outline-variant);

      color: var(--mat-sys-on-surface-variant);
    }

    .hint > mat-icon {
      width: 22px;
      height: 22px;

      font-size: 22px;

      flex-shrink: 0;

      color: var(--mat-sys-primary);
    }

    .hint strong {
      display: block;

      margin-bottom: 4px;

      color: var(--mat-sys-on-surface);

      font-size: 0.95rem;
    }

    .hint p {
      margin: 0;

      font-size: 0.875rem;

      line-height: 1.5;
    }

    /* =========================================================
       EMPTY / ERROR STATE
       ========================================================= */

    .empty-state {
      min-height: 260px;

      display: flex;

      flex-direction: column;

      align-items: center;

      justify-content: center;

      text-align: center;

      padding: 40px 20px;

      color: var(--mat-sys-on-surface-variant);
    }

    .empty-state mat-icon {
      width: 48px;
      height: 48px;

      font-size: 48px;

      margin-bottom: 12px;
    }

    .empty-state h3 {
      margin: 0 0 8px;

      color: var(--mat-sys-on-surface);

      font-size: 1.2rem;
    }

    .empty-state p {
      max-width: 420px;

      margin: 0;

      line-height: 1.5;
    }

    /* =========================================================
       TABLET
       ========================================================= */

    @media (max-width: 768px) {
      .summary-page {
        padding-top: 20px;
      }

      .grid {
        gap: 12px;
      }

      .tile {
        padding: 18px;

        border-radius: 18px;
      }
    }

    /* =========================================================
       PHONE
       ========================================================= */

    @media (max-width: 640px) {
      .summary-page {
        padding-top: 16px;
        padding-bottom: 32px;
      }

      .grid {
        grid-template-columns: 1fr;

        gap: 12px;
      }

      .tile {
        padding: 18px;

        border-radius: 16px;

        gap: 12px;
      }

      .value {
        font-size: 2rem;
      }

      .value-date {
        font-size: 1.1rem;
      }

      .hint {
        padding: 14px;

        margin-top: 16px;
      }
    }

    /* =========================================================
       VERY SMALL PHONE
       ========================================================= */

    @media (max-width: 380px) {
      .tile {
        padding: 16px;
      }

      .value {
        font-size: 1.8rem;
      }

      .hint {
        gap: 10px;
      }

      .hint p {
        font-size: 0.825rem;
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
}
