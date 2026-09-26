import { Component, inject, input, output } from "@angular/core";
import { RouterLink } from "@angular/router";
import { FieldTypeCatalog } from "../../core/field-types.service";
import { formatMetric } from "../../core/format";
import {
  Field,
  RecordReference,
  SummaryMetric,
  TrackerRecord,
} from "../../core/models";
import { FieldValue } from "../../shared/field-value";
import { RecordActionMenu } from "../../shared/record-action-menu";
import { aggregationShortLabel } from "./record-list.utils";
import { MatIcon } from "@angular/material/icon";

@Component({
  selector: "app-record-table",
  imports: [RouterLink, FieldValue, RecordActionMenu, MatIcon],
  template: `
    <div class="table-container surface-card" [class.loading-table]="loading()">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              @for (f of columns(); track f.id) {
                <th scope="col" [attr.aria-sort]="ariaSort(f)">
                  @if (catalog.sortable(f.type)) {
                    <button
                      type="button"
                      class="sort"
                      (click)="toggleSort.emit(f)"
                    >
                      <span>{{ f.name }}</span>
                      <mat-icon class="arrow">{{ sortIcon(f) }}</mat-icon>
                    </button>
                  } @else {
                    <span>{{ f.name }}</span>
                  }
                </th>
              }
              <th class="actions-col" scope="col">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody>
            @for (r of items(); track r.id) {
              <tr class="record-row" (click)="open.emit(r)">
                @for (f of columns(); track f.id; let first = $first) {
                  <td>
                    @if (first) {
                      <a
                        class="first"
                        [routerLink]="[
                          '/collections',
                          collectionId(),
                          'records',
                          r.id,
                        ]"
                        (click)="$event.stopPropagation()"
                      >
                        <app-field-value
                          [field]="f"
                          [value]="r.values[f.key]"
                          [references]="references()"
                        />
                      </a>
                    } @else {
                      <app-field-value
                        [field]="f"
                        [value]="r.values[f.key]"
                        [references]="references()"
                      />
                    }
                  </td>
                }
                <td class="actions-col" (click)="$event.stopPropagation()">
                  <app-record-action-menu
                    [collectionId]="collectionId()"
                    [recordId]="r.id"
                    [label]="labelOf(r)"
                    (delete)="delete.emit(r)"
                  />
                </td>
              </tr>
            }
          </tbody>

          @if (metrics().length) {
            <tfoot>
              <tr>
                @for (f of columns(); track f.id) {
                  <td>
                    @if (metricOf(f.id); as m) {
                      <span class="agg">
                        <span class="agg-label">{{
                          aggregationShortLabel(m.aggregation)
                        }}</span>
                        <span class="agg-value">{{ format(m) }}</span>
                      </span>
                    }
                  </td>
                }
                <td class="actions-col"></td>
              </tr>
            </tfoot>
          }
        </table>
      </div>
    </div>
  `,
  styles: `
    .table-container {
      padding: 0;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface);
      transition: opacity 0.18s ease;
    }
    .table-container.loading-table {
      opacity: 0.6;
      pointer-events: none;
    }
    .table-scroll {
      max-height: calc(100vh - 290px);
      min-height: 220px;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
    }
    table {
      width: 100%;
      min-width: 680px;
      border-collapse: separate;
      border-spacing: 0;
    }
    th,
    td {
      padding: 12px 16px;
      text-align: left;
      vertical-align: middle;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      font-size: 0.9375rem;
    }

    thead th {
      position: sticky;
      top: 0;
      z-index: 3;
      height: 46px;
      white-space: nowrap;
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    tbody td:first-child,
    tfoot td:first-child {
      position: sticky;
      left: 0;
      z-index: 1;
      background: var(--mat-sys-surface);
    }
    thead th:first-child {
      left: 0;
      z-index: 5;
    }
    tfoot td:first-child {
      background: var(--mat-sys-surface-container);
      z-index: 2;
    }

    .record-row {
      cursor: pointer;
    }
    .record-row:hover > td {
      background: color-mix(
        in srgb,
        var(--mat-sys-primary) 7%,
        var(--mat-sys-surface)
      );
    }
    .record-row:last-child td {
      border-bottom: 0;
    }

    .sort {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 6px;
      margin: -4px -6px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: inherit;
      font: inherit;
      letter-spacing: inherit;
      text-transform: inherit;
      cursor: pointer;
    }
    .sort:hover {
      background: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-primary);
    }
    .sort .arrow {
      width: 18px;
      height: 18px;
      font-size: 18px;
      opacity: 0.55;
    }
    .sort:hover .arrow,
    th[aria-sort] .arrow {
      opacity: 1;
    }
    th[aria-sort] .arrow {
      color: var(--mat-sys-primary);
    }

    .first {
      color: var(--mat-sys-primary);
      font-weight: 600;
      text-decoration: none;
      overflow-wrap: anywhere;
    }
    .first:hover {
      text-decoration: underline;
    }

    .actions-col {
      width: 52px;
      min-width: 52px;
      padding: 6px 8px;
      text-align: right;
      position: sticky;
      right: 0;
      z-index: 1;
      background: var(--mat-sys-surface);
      box-shadow: -1px 0 0 var(--mat-sys-outline-variant);
    }
    thead .actions-col {
      background: var(--mat-sys-surface-container);
      z-index: 4;
    }
    tfoot .actions-col {
      background: var(--mat-sys-surface-container);
      z-index: 2;
    }

    tfoot td {
      position: sticky;
      bottom: 0;
      z-index: 2;
      background: var(--mat-sys-surface-container);
      border-top: 2px solid var(--mat-sys-outline-variant);
      border-bottom: 0;
      font-weight: 600;
    }
    .agg {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 6px;
      background: var(--mat-sys-surface-container-high);
      white-space: nowrap;
    }
    .agg-label {
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .agg-value {
      font-weight: 700;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `,
})
export class RecordTable {
  protected readonly catalog = inject(FieldTypeCatalog);

  readonly collectionId = input.required<string>();
  readonly columns = input<Field[]>([]);
  readonly items = input<TrackerRecord[]>([]);
  readonly references = input<Record<string, RecordReference>>({});
  readonly metrics = input<SummaryMetric[]>([]);
  readonly sortFieldId = input<string | null>(null);
  readonly sortAscending = input(false);
  readonly loading = input(false);

  readonly toggleSort = output<Field>();
  readonly open = output<TrackerRecord>();
  readonly delete = output<TrackerRecord>();

  protected readonly aggregationShortLabel = aggregationShortLabel;

  protected format(m: SummaryMetric): string {
    return formatMetric(m);
  }

  protected ariaSort(f: Field): string | null {
    if (this.sortFieldId() !== f.id) return null;
    return this.sortAscending() ? "ascending" : "descending";
  }

  protected sortIcon(f: Field): string {
    if (this.sortFieldId() !== f.id) return "unfold_more";
    return this.sortAscending() ? "arrow_upward" : "arrow_downward";
  }

  protected metricOf(fieldId: string): SummaryMetric | undefined {
    return this.metrics().find((m) => m.fieldId === fieldId);
  }

  protected labelOf(r: TrackerRecord): string {
    const first = this.columns()[0];
    const v = first ? r.values[first.key] : null;
    return typeof v === "string" && v ? v : "this record";
  }
}
