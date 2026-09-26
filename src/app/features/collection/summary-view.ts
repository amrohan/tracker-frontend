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
      @if (summary.isLoading()) {
        <mat-progress-bar
          class="loading"
          mode="indeterminate"
          aria-label="Loading summary"
        />
      }

      @if (summary.value(); as s) {
        @if (s.recordCount === 0) {
          <div class="empty-state">
            <div class="empty-icon-box" aria-hidden="true">
              <mat-icon>insights</mat-icon>
            </div>
            <h3>Nothing to summarize yet</h3>
            <p>
              Add a few records and totals, averages and dates will show up
              here.
            </p>
          </div>
        } @else {
          <section class="grid" aria-label="Collection summary metrics">
            <article class="tile tile-primary tile-wide">
              <div class="tile-top">
                <span class="label">Total records</span>
                <div class="tile-icon-badge primary-badge" aria-hidden="true">
                  <mat-icon>storage</mat-icon>
                </div>
              </div>
              <span class="value">{{ s.recordCount }}</span>
            </article>

            @if (s.lastActivityAt) {
              <article class="tile tile-wide">
                <div class="tile-top">
                  <span class="label">Last activity</span>
                  <div class="tile-icon-badge" aria-hidden="true">
                    <mat-icon>schedule</mat-icon>
                  </div>
                </div>
                <span class="value value-date">{{
                  dateTime(s.lastActivityAt)
                }}</span>
              </article>
            }

            @for (m of s.metrics; track m.fieldId + ":" + m.aggregation) {
              <article class="tile">
                <div class="tile-top">
                  <span class="label" [title]="label(m)">{{ label(m) }}</span>
                  <div class="tile-icon-badge" aria-hidden="true">
                    <mat-icon>{{ metricIcon(m.aggregation) }}</mat-icon>
                  </div>
                </div>
                <span class="value">{{ format(m) }}</span>
              </article>
            }
          </section>

          @if (s.metrics.length === 0) {
            <div class="hint-card">
              <div class="hint-icon" aria-hidden="true">
                <mat-icon>lightbulb</mat-icon>
              </div>
              <div class="hint-body">
                <strong>Add summary calculations</strong>
                <p>
                  Turn on a “Summary calculation” for any number, currency or
                  rating field — like Sum for expenses or Average for ratings —
                  and it will appear here automatically.
                </p>
              </div>
            </div>
          }
        }
      } @else if (summary.error()) {
        <div class="empty-state">
          <div class="empty-icon-box error-box" aria-hidden="true">
            <mat-icon>cloud_off</mat-icon>
          </div>
          <h3>Could not load the summary</h3>
          <p>Something went wrong while calculating the summary metrics.</p>
          <button mat-stroked-button type="button" (click)="summary.reload()">
            <mat-icon>refresh</mat-icon> Try again
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .summary-page {
      padding-top: clamp(16px, 3vw, 24px);
    }

    .loading {
      margin-bottom: 18px;
      border-radius: 999px;
      height: 4px;
    }

    /* ---------------- grid ---------------- */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: clamp(10px, 2vw, 16px);
    }

    .tile {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: clamp(10px, 2vw, 16px);
      padding: clamp(14px, 2.4vw, 20px);
      border-radius: clamp(14px, 2vw, 18px);
      background: var(--mat-sys-surface-container-low);
      border: 1px solid var(--mat-sys-outline-variant);
    }

    .tile-primary {
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
      border-color: transparent;
    }

    .tile-wide {
      grid-column: 1 / -1;
    }

    @media (min-width: 560px) {
      /* on wider screens the two headline tiles sit side by side instead of stacking full-width */
      .tile-wide {
        grid-column: span 2;
      }
    }

    .tile-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
    }

    .label {
      font-size: 0.85rem;
      font-weight: 600;
      line-height: 1.3;
      color: var(--mat-sys-on-surface-variant);
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .tile-primary .label {
      color: var(--mat-sys-on-primary-container);
      opacity: 0.85;
    }

    .tile-icon-badge {
      width: clamp(30px, 4vw, 36px);
      height: clamp(30px, 4vw, 36px);
      flex: none;
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-on-surface-variant);
    }
    .tile-icon-badge mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .primary-badge {
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
    }

    .value {
      display: block;
      font-size: clamp(1.5rem, 1.1rem + 1.6vw, 2.2rem);
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
      overflow-wrap: anywhere;
    }
    .value-date {
      font-size: clamp(1rem, 0.9rem + 0.4vw, 1.15rem);
      font-weight: 600;
    }

    /* ---------------- hint ---------------- */
    .hint-card {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-top: 18px;
      padding: 16px clamp(14px, 3vw, 20px);
      border-radius: 16px;
      background: var(--mat-sys-surface-container-low);
      border: 1px solid var(--mat-sys-outline-variant);
    }
    .hint-icon {
      width: 32px;
      height: 32px;
      flex: none;
      display: grid;
      place-items: center;
      border-radius: 8px;
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }
    .hint-icon mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .hint-body strong {
      display: block;
      margin-bottom: 3px;
      font-size: 0.925rem;
    }
    .hint-body p {
      margin: 0;
      font-size: 0.85rem;
      color: var(--mat-sys-on-surface-variant);
      line-height: 1.45;
    }

    /* ---------------- empty / error ---------------- */
    .empty-state {
      min-height: 240px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 40px 20px;
      border-radius: 16px;
      border: 1.5px dashed var(--mat-sys-outline-variant);
    }
    .empty-icon-box {
      width: 52px;
      height: 52px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      margin-bottom: 14px;
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface-variant);
    }
    .empty-icon-box.error-box {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-error);
    }
    .empty-icon-box mat-icon {
      font-size: 26px;
      width: 26px;
      height: 26px;
    }
    .empty-state h3 {
      margin: 0 0 6px;
      font-size: 1.15rem;
    }
    .empty-state p {
      max-width: 380px;
      margin: 0 0 16px;
      font-size: 0.9rem;
      color: var(--mat-sys-on-surface-variant);
    }

    /* ---------------- phones ---------------- */
    @media (max-width: 640px) {
      .grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 340px) {
      .grid {
        grid-template-columns: 1fr;
      }
      .tile-wide {
        grid-column: 1 / -1;
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
