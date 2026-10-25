import { Component, input, output, signal } from "@angular/core";
import { NzIconModule } from "ng-zorro-antd/icon";
import { formatMetric, metricLabel } from "../../core/format";
import {
  Field,
  RecordReference,
  SummaryMetric,
  TrackerRecord,
} from "../../core/models";
import { FieldValue } from "../../shared/field-value";
import { RecordActionMenu } from "../../shared/record-action-menu";
import { hasVisibleValue } from "./record-list.utils";

@Component({
  selector: "app-record-card-list",
  imports: [FieldValue, RecordActionMenu, NzIconModule],
  template: `
    <ul class="cards" role="list" [class.dim]="dimmed()" aria-label="Records">
      @for (r of items(); track r.id) {
        @let fields = visibleFieldsFor(r);
        @let expanded = isExpanded(r.id);
        @let displayFields = expanded ? fields : fields.slice(0, 3);
        @let remainingCount = fields.length - 3;

        <li
          class="card"
          (click)="open.emit(r)"
          tabindex="0"
          role="button"
          [attr.aria-label]="labelOf(r)"
        >
          <!-- Card Header: Title + Action menu -->
          <div class="card-head">
            <div class="title-wrap">
              @if (titleField(); as tf) {
                <span class="card-title">
                  <app-field-value
                    [field]="tf"
                    [value]="r.values[tf.key]"
                    [references]="references()"
                  />
                </span>
              }
            </div>

            <div class="head-actions" (click)="$event.stopPropagation()">
              <app-record-action-menu
                [collectionId]="collectionId()"
                [recordId]="r.id"
                [label]="labelOf(r)"
                [canEdit]="canEdit()"
                (view)="open.emit(r)"
                (edit)="edit.emit(r)"
                (share)="share.emit(r)"
                (delete)="delete.emit(r)"
              />
            </div>
          </div>

          <!-- Card Key Attributes -->
          @if (displayFields.length > 0) {
            <dl class="card-body">
              @for (f of displayFields; track f.id) {
                <div class="kv">
                  <dt>{{ f.name }}</dt>
                  <dd>
                    <app-field-value
                      [field]="f"
                      [value]="r.values[f.key]"
                      [references]="references()"
                    />
                  </dd>
                </div>
              }
            </dl>
          }

          <!-- Card Footer: Expand toggle & Tap to view hint -->
          <div class="card-foot">
            @if (remainingCount > 0) {
              <button
                type="button"
                class="expand-btn"
                (click)="toggleExpand($event, r.id)"
              >
                <nz-icon
                  [nzType]="expanded ? 'up' : 'down'"
                  class="expand-icon"
                />
                <span>{{
                  expanded
                    ? "Show less"
                    : "+" + remainingCount + " more details"
                }}</span>
              </button>
            } @else {
              <span class="spacer"></span>
            }

            <span class="view-hint">
              <span>View</span>
              <nz-icon nzType="right" class="chevron" />
            </span>
          </div>
        </li>
      }
    </ul>

    <!-- Modern Compact Totals / Summary -->
    @if (metrics().length) {
      <section class="totals" aria-label="Totals">
        <div class="totals-head">
          <nz-icon nzType="bar-chart" class="totals-icon" />
          <span class="totals-title">Summary</span>
          @if (filtered()) {
            <span class="totals-badge">filtered</span>
          }
        </div>
        <div class="totals-grid">
          @for (m of metrics(); track m.fieldId + m.aggregation) {
            <div class="total-chip">
              <span class="t-label">{{ metricLabel(m) }}</span>
              <span class="t-value">{{ formatMetric(m) }}</span>
            </div>
          }
        </div>
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .spacer {
      flex: 1 1 auto;
    }

    .cards {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: opacity 0.18s ease;
    }

    .cards.dim {
      opacity: 0.6;
    }

    /* ---------------- Mobile Card ---------------- */
    .card {
      position: relative;
      background: var(--app-surface);
      border: 1px solid var(--app-outline-variant);
      border-radius: 16px;
      padding: 14px 16px;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      transition:
        transform 0.15s ease,
        box-shadow 0.15s ease,
        background-color 0.15s ease;
      -webkit-tap-highlight-color: transparent;
    }

    .card:active {
      transform: scale(0.985);
      background: var(--app-surface-container);
    }

    /* ---------------- Card Header ---------------- */
    .card-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .title-wrap {
      min-width: 0;
      flex: 1;
      padding-top: 2px;
    }

    .card-title {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      font-size: 1.05rem;
      font-weight: 700;
      line-height: 1.35;
      color: var(--app-text);
      overflow-wrap: anywhere;
    }

    .head-actions {
      flex: none;
      margin: -6px -6px 0 0;
    }

    /* ---------------- Card Body ---------------- */
    .card-body {
      margin: 12px 0 0;
      padding-top: 10px;
      border-top: 1px dashed var(--app-outline-variant);
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 14px;
    }

    .kv {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    dt {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    dd {
      margin: 0;
      font-size: 0.9rem;
      color: var(--app-text);
      overflow-wrap: anywhere;
      line-height: 1.4;
    }

    /* ---------------- Card Footer ---------------- */
    .card-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 12px;
      padding-top: 8px;
    }

    .expand-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 8px;
      margin-left: -8px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--app-primary);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.12s ease;
    }

    .expand-btn:active {
      background: var(--app-surface-container);
    }

    .expand-icon {
      font-size: 11px;
    }

    .view-hint {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--app-text-muted);
    }

    .chevron {
      font-size: 11px;
      opacity: 0.7;
    }

    /* ---------------- Totals Section ---------------- */
    .totals {
      margin-top: 16px;
      padding: 14px 16px;
      border-radius: 16px;
      background: var(--app-surface-container-low);
      border: 1px solid var(--app-outline-variant);
    }

    .totals-head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .totals-icon {
      font-size: 16px;
      color: var(--app-primary);
    }

    .totals-title {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--app-text);
      letter-spacing: -0.01em;
    }

    .totals-badge {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: 2px 7px;
      border-radius: 999px;
      background: var(--app-surface-container-high);
      color: var(--app-text-muted);
    }

    .totals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 10px;
    }

    .total-chip {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 10px 12px;
      border-radius: 12px;
      background: var(--app-surface);
      border: 1px solid var(--app-outline-variant);
    }

    .t-label {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--app-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .t-value {
      font-size: 1.0625rem;
      font-weight: 700;
      color: var(--app-text);
      overflow-wrap: anywhere;
    }
  `,
})
export class RecordCardList {
  readonly collectionId = input.required<string>();
  readonly titleField = input<Field | undefined>();
  readonly cardFields = input<Field[]>([]);
  readonly items = input<TrackerRecord[]>([]);
  readonly references = input<Record<string, RecordReference>>({});
  readonly metrics = input<SummaryMetric[]>([]);
  readonly filtered = input(false);
  readonly dimmed = input(false);
  readonly canEdit = input(true);

  readonly open = output<TrackerRecord>();
  readonly edit = output<TrackerRecord>();
  readonly share = output<TrackerRecord>();
  readonly delete = output<TrackerRecord>();

  protected readonly expandedRecords = signal<Set<string>>(new Set());
  protected readonly hasVisibleValue = hasVisibleValue;
  protected readonly formatMetric = formatMetric;
  protected readonly metricLabel = metricLabel;

  protected isExpanded(id: string): boolean {
    return this.expandedRecords().has(id);
  }

  protected toggleExpand(event: Event, id: string): void {
    event.stopPropagation();
    this.expandedRecords.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected visibleFieldsFor(r: TrackerRecord): Field[] {
    return this.cardFields().filter((f) => this.hasVisibleValue(r, f));
  }

  protected labelOf(r: TrackerRecord): string {
    const key = this.titleField()?.key;
    const v = key ? r.values[key] : null;
    return typeof v === "string" && v ? v : "this record";
  }
}
