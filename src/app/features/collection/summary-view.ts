import { httpResource } from "@angular/common/http";
import { Component, inject } from "@angular/core";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzSpinModule } from "ng-zorro-antd/spin";

import { CollectionContext } from "../../core/collection-context";
import { formatDateTime, formatMetric, metricLabel } from "../../core/format";
import { SummaryReport } from "../../core/models";

@Component({
  selector: "app-summary-view",
  imports: [NzIconModule, NzSpinModule, NzButtonModule],
  template: `
    <div class="page summary-page">
      @if (summary.isLoading()) {
        <div class="loading-wrap">
          <nz-spin nzSimple />
        </div>
      }

      @if (summary.value(); as s) {
        @if (s.recordCount === 0) {
          <div class="empty-state">
            <div class="empty-icon-box" aria-hidden="true">
              <nz-icon nzType="line-chart" />
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
                  <nz-icon nzType="database" />
                </div>
              </div>
              <span class="value">{{ s.recordCount }}</span>
            </article>

            @if (s.lastActivityAt) {
              <article class="tile tile-wide">
                <div class="tile-top">
                  <span class="label">Last activity</span>
                  <div class="tile-icon-badge" aria-hidden="true">
                    <nz-icon nzType="clock-circle" />
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
                    <nz-icon [nzType]="metricIcon(m.aggregation)" />
                  </div>
                </div>
                <span class="value">{{ format(m) }}</span>
              </article>
            }
          </section>

          @if (s.metrics.length === 0) {
            <div class="hint-card">
              <div class="hint-icon" aria-hidden="true">
                <nz-icon nzType="bulb" />
              </div>
              <div class="hint-body">
                <strong>Add summary calculations</strong>
                <p>
                  Turn on a "Summary calculation" for any number, currency or
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
            <nz-icon nzType="disconnect" />
          </div>
          <h3>Could not load the summary</h3>
          <p>Something went wrong while calculating the summary metrics.</p>
          <button
            nz-button
            nzType="default"
            type="button"
            (click)="summary.reload()"
          >
            <nz-icon nzType="reload" /> Try again
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

    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 20px 0;
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
      background: var(--app-surface-container-low);
      border: 1px solid var(--app-outline-variant);
    }

    .tile-primary {
      background: var(--app-primary-container);
      color: var(--app-on-primary-container);
      border-color: transparent;
    }

    .tile-wide {
      grid-column: 1 / -1;
    }

    @media (min-width: 560px) {
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
      color: var(--app-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .tile-primary .label {
      color: var(--app-on-primary-container);
      opacity: 0.85;
    }

    .tile-icon-badge {
      width: clamp(30px, 4vw, 36px);
      height: clamp(30px, 4vw, 36px);
      flex: none;
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: var(--app-surface-container-high);
      color: var(--app-text-muted);
      font-size: 18px;
    }
    .primary-badge {
      background: var(--app-primary);
      color: var(--app-on-primary);
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
      background: var(--app-surface-container-low);
      border: 1px solid var(--app-outline-variant);
    }
    .hint-icon {
      width: 32px;
      height: 32px;
      flex: none;
      display: grid;
      place-items: center;
      border-radius: 8px;
      background: var(--app-tertiary-container);
      color: var(--app-on-tertiary-container);
      font-size: 20px;
    }
    .hint-body strong {
      display: block;
      margin-bottom: 3px;
      font-size: 0.925rem;
    }
    .hint-body p {
      margin: 0;
      font-size: 0.85rem;
      color: var(--app-text-muted);
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
      border: 1.5px dashed var(--app-outline-variant);
    }
    .empty-icon-box {
      width: 52px;
      height: 52px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      margin-bottom: 14px;
      background: var(--app-surface-container);
      color: var(--app-text-muted);
      font-size: 26px;
    }
    .empty-icon-box.error-box {
      background: var(--app-error-container);
      color: var(--app-error);
    }
    .empty-state h3 {
      margin: 0 0 6px;
      font-size: 1.15rem;
    }
    .empty-state p {
      max-width: 380px;
      margin: 0 0 16px;
      font-size: 0.9rem;
      color: var(--app-text-muted);
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
        return "number";
      case "avg":
      case "average":
        return "line-chart";
      case "min":
        return "arrow-down";
      case "max":
        return "arrow-up";
      case "count":
        return "filter";
      default:
        return "bar-chart";
    }
  }
}
