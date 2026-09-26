import { Component, input, output } from "@angular/core";
import { RouterLink } from "@angular/router";
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
  imports: [RouterLink, FieldValue, RecordActionMenu],
  template: `
    <ul class="cards" role="list" [class.dim]="dimmed()" aria-label="Records">
      @for (r of items(); track r.id) {
        <li class="card" (click)="open.emit(r)">
          <div class="card-head">
            @if (titleField(); as tf) {
              <a
                class="card-title"
                [routerLink]="['/collections', collectionId(), 'records', r.id]"
                (click)="$event.stopPropagation()"
              >
                <app-field-value
                  [field]="tf"
                  [value]="r.values[tf.key]"
                  [references]="references()"
                />
              </a>
            }
            <span class="spacer"></span>
            <span (click)="$event.stopPropagation()">
              <app-record-action-menu
                [collectionId]="collectionId()"
                [recordId]="r.id"
                [label]="labelOf(r)"
                (delete)="delete.emit(r)"
              />
            </span>
          </div>

          <dl class="card-body">
            @for (f of cardFields(); track f.id) {
              @if (hasVisibleValue(r, f)) {
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
            }
          </dl>
        </li>
      }
    </ul>

    @if (metrics().length) {
      <section class="totals" aria-label="Totals">
        <h4>
          Totals
          @if (filtered()) {
            <span>(matching records)</span>
          }
        </h4>
        <div class="totals-grid">
          @for (m of metrics(); track m.fieldId + m.aggregation) {
            <div class="total">
              <span class="t-label">{{ metricLabel(m) }}</span>
              <span class="t-value">{{ formatMetric(m) }}</span>
            </div>
          }
        </div>
      </section>
    }
  `,
  styles: `
    .spacer {
      flex: 1 1 auto;
    }
    .cards {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 10px;
      transition: opacity 0.18s ease;
    }
    .cards.dim {
      opacity: 0.6;
    }
    .card {
      padding: 6px 6px 14px 16px;
      border-radius: 16px;
      cursor: pointer;
      background: var(--mat-sys-surface-container-low);
      border: 1px solid var(--mat-sys-outline-variant);
    }
    .card:active {
      background: color-mix(
        in srgb,
        var(--mat-sys-primary) 7%,
        var(--mat-sys-surface)
      );
    }
    .card-head {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 48px;
    }
    .card-title {
      min-width: 0;
      font-size: 1.0625rem;
      font-weight: 600;
      line-height: 1.3;
      color: var(--mat-sys-primary);
      text-decoration: none;
      overflow-wrap: anywhere;
    }
    .card-body {
      margin: 0;
      padding-right: 10px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px 16px;
    }
    .kv {
      min-width: 0;
    }
    dt {
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
      margin-bottom: 2px;
    }
    dd {
      margin: 0;
      font-size: 0.9375rem;
      overflow-wrap: anywhere;
    }

    .totals {
      margin-top: 14px;
      padding: 14px 16px;
      border-radius: 16px;
      background: var(--mat-sys-surface-container);
      border: 1px solid var(--mat-sys-outline-variant);
    }
    .totals h4 {
      margin: 0 0 10px;
      font-size: 0.9rem;
    }
    .totals h4 span {
      font-weight: 400;
      color: var(--mat-sys-on-surface-variant);
    }
    .totals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
    }
    .total {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .t-label {
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .t-value {
      font-size: 1.125rem;
      font-weight: 700;
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

  readonly open = output<TrackerRecord>();
  readonly delete = output<TrackerRecord>();

  protected readonly hasVisibleValue = hasVisibleValue;
  protected readonly formatMetric = formatMetric;
  protected readonly metricLabel = metricLabel;

  protected labelOf(r: TrackerRecord): string {
    const id = this.titleField()?.id;
    const v = id ? r.values[id] : null;
    return typeof v === "string" && v ? v : "this record";
  }
}
