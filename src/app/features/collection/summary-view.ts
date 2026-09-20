import { httpResource } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CollectionContext } from '../../core/collection-context';
import { formatDateTime, formatMetric, metricLabel } from '../../core/format';
import { SummaryReport } from '../../core/models';

@Component({
  selector: 'app-summary-view',
  imports: [MatIconModule, MatProgressBarModule],
  template: `
    <div class="page">
      @if (summary.isLoading() && !summary.hasValue()) { <mat-progress-bar mode="indeterminate" /> }
      @if (summary.value(); as s) {
        <div class="grid">
          <div class="tile primary">
            <span class="label">Records</span>
            <span class="value">{{ s.recordCount }}</span>
          </div>
          @if (s.lastActivityAt) {
            <div class="tile">
              <span class="label">Last activity</span>
              <span class="value small">{{ dateTime(s.lastActivityAt) }}</span>
            </div>
          }
          @for (m of s.metrics; track m.fieldId + m.aggregation) {
            <div class="tile">
              <span class="label">{{ label(m) }}</span>
              <span class="value">{{ format(m) }}</span>
            </div>
          }
        </div>
        @if (s.metrics.length === 0) {
          <p class="muted hint">
            <mat-icon>lightbulb</mat-icon>
            Choose a “Summary calculation” on a field (for example Sum on an amount or Average on a rating) and it will appear here.
          </p>
        }
      } @else if (summary.error()) {
        <div class="empty-state"><h3>Could not load the summary</h3></div>
      }
    </div>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .tile { display: flex; flex-direction: column; gap: 6px; padding: 22px; border-radius: 20px; background: var(--mat-sys-surface-container-low); border: 1px solid var(--mat-sys-outline-variant); }
    .tile.primary { background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container); border-color: transparent; }
    .label { font-size: .9rem; opacity: .8; }
    .value { font-family: 'Bricolage Grotesque', sans-serif; font-size: 2.3rem; font-weight: 700; letter-spacing: -.02em; overflow-wrap: anywhere; }
    .value.small { font-size: 1.4rem; }
    .hint { display: flex; gap: 8px; align-items: center; margin-top: 24px; }
  `,
})
export class SummaryView {
  private readonly ctx = inject(CollectionContext);
  protected readonly summary = httpResource<SummaryReport>(() => {
    const id = this.ctx.id();
    return id ? `/api/collections/${id}/summary` : undefined;
  });
  protected format = formatMetric;
  protected label = metricLabel;
  protected dateTime = formatDateTime;
}
