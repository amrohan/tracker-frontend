import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
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
import { NzIconModule } from "ng-zorro-antd/icon";
import { LocalStorageService } from "../../core/local-storage.service";

@Component({
  selector: "app-record-table",
  imports: [FieldValue, RecordActionMenu, NzIconModule],
  template: `
    <div
      class="table-container surface-card"
      [class.loading-table]="loading()"
      [class.resizing-active]="activeResizingCol() !== null"
    >
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              @for (f of columns(); track f.id; let first = $first) {
                <th
                  scope="col"
                  [attr.aria-sort]="ariaSort(f)"
                  [style.width.px]="colWidth(f.id)"
                  [style.min-width.px]="colWidth(f.id) || 120"
                  [class.sticky-col]="first"
                >
                  <div class="header-cell-content">
                    @if (catalog.sortable(f.type)) {
                      <button
                        type="button"
                        class="sort"
                        (click)="toggleSort.emit(f)"
                      >
                        <span>{{ f.name }}</span>
                        <nz-icon class="arrow" [nzType]="sortIconType(f)" />
                      </button>
                    } @else {
                      <span>{{ f.name }}</span>
                    }
                  </div>
                  <div
                    class="resize-handle"
                    [class.active]="activeResizingCol() === f.id"
                    (pointerdown)="onResizeStart($event, f.id)"
                    (click)="$event.stopPropagation()"
                  ></div>
                </th>
              }
              <th scope="col" class="actions-col sticky-end">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            @for (r of items(); track r.id) {
              <tr class="record-row" (click)="open.emit(r)">
                @for (f of columns(); track f.id; let first = $first) {
                  <td
                    [style.width.px]="colWidth(f.id)"
                    [style.min-width.px]="colWidth(f.id) || 120"
                    [class.sticky-col]="first"
                  >
                    @if (first) {
                      <span
                        class="first"
                        role="button"
                        tabindex="0"
                        (click)="$event.stopPropagation(); open.emit(r)"
                      >
                        <app-field-value
                          [field]="f"
                          [value]="r.values[f.key]"
                          [references]="references()"
                        />
                      </span>
                    } @else {
                      <app-field-value
                        [field]="f"
                        [value]="r.values[f.key]"
                        [references]="references()"
                      />
                    }
                  </td>
                }
                <td
                  class="actions-col sticky-end"
                  (click)="$event.stopPropagation()"
                >
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
                </td>
              </tr>
            }
          </tbody>
          @if (metrics().length) {
            <tfoot>
              <tr>
                @for (f of columns(); track f.id) {
                  <td
                    [style.width.px]="colWidth(f.id)"
                    [style.min-width.px]="colWidth(f.id) || 120"
                    class="footer-cell"
                  >
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
                <td class="actions-col footer-cell sticky-end"></td>
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
      border-radius: var(--radius-xl);
      overflow: hidden;
      border: 1px solid var(--app-outline);
      background: var(--app-surface);
      box-shadow: var(--app-shadow-xs);
      transition: opacity 0.18s ease;
    }
    .table-container.loading-table {
      opacity: 0.6;
      pointer-events: none;
    }
    .table-container.resizing-active {
      user-select: none;
      cursor: col-resize;
    }
    .table-scroll {
      max-height: calc(100vh - 280px);
      min-height: 220px;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
    }
    table {
      width: 100%;
      min-width: 680px;
      border-collapse: separate;
      border-spacing: 0;
      background: transparent;
    }

    th,
    td {
      padding: 10px 14px;
      vertical-align: middle;
      border-bottom: 1px solid var(--app-outline-variant);
      font-size: 0.875rem;
      box-sizing: border-box;
    }

    th {
      position: sticky;
      top: 0;
      z-index: 10;
      height: 42px;
      white-space: nowrap;
      background: var(--app-surface-container);
      color: var(--app-text);
      font-size: 0.71875rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border-bottom: 1px solid var(--app-outline);
    }

    .header-cell-content {
      display: flex;
      align-items: center;
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .resize-handle {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 10px;
      cursor: col-resize;
      user-select: none;
      z-index: 15;
      touch-action: none;
    }
    .resize-handle::after {
      content: "";
      position: absolute;
      top: 25%;
      bottom: 25%;
      right: 2px;
      width: 2px;
      background: var(--app-outline-variant);
      border-radius: 1px;
      transition: all var(--transition-fast);
    }
    .resize-handle:hover::after,
    .resize-handle.active::after {
      background: var(--app-primary);
      width: 3px;
      top: 15%;
      bottom: 15%;
    }

    .sticky-col {
      position: sticky;
      left: 0;
      z-index: 5;
    }
    td.sticky-col {
      background: var(--app-surface);
      box-shadow: 2px 0 6px -2px rgba(0, 0, 0, 0.06);
    }
    th.sticky-col {
      background: var(--app-surface-container);
      z-index: 12;
      box-shadow: 2px 0 6px -2px rgba(0, 0, 0, 0.06);
    }

    .sticky-end {
      position: sticky;
      right: 0;
      z-index: 5;
    }

    .record-row {
      cursor: pointer;
      transition: background-color var(--transition-fast);
    }
    .record-row:hover > td {
      background: color-mix(in srgb, var(--app-primary) 5%, var(--app-surface));
    }
    .record-row:last-child td {
      border-bottom: 0;
    }

    .sort {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 6px;
      margin: -3px -6px;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: inherit;
      font: inherit;
      letter-spacing: inherit;
      text-transform: inherit;
      cursor: pointer;
      transition: background-color var(--transition-fast), color var(--transition-fast);
    }
    .sort:hover {
      background: var(--app-surface-container-high);
      color: var(--app-primary);
    }
    .sort .arrow {
      opacity: 0.5;
      font-size: 13px;
    }
    .sort:hover .arrow,
    th[aria-sort] .arrow {
      opacity: 1;
    }
    th[aria-sort] .arrow {
      color: var(--app-primary);
    }

    .first {
      color: var(--app-primary);
      font-weight: 600;
      text-decoration: none;
      overflow-wrap: anywhere;
    }
    .first:hover {
      text-decoration: underline;
    }

    .actions-col {
      width: 48px;
      min-width: 48px;
      max-width: 48px;
      padding: 4px 6px;
      text-align: right;
      box-shadow: -1px 0 0 var(--app-outline-variant);
    }
    td.actions-col {
      background: var(--app-surface);
    }
    th.actions-col,
    .footer-cell.actions-col {
      background: var(--app-surface-container);
    }

    .footer-cell {
      background: var(--app-surface-container);
      border-top: 2px solid var(--app-outline-variant);
      border-bottom: 0;
      font-weight: 600;
      padding: 8px 14px;
    }
    .agg {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      background: var(--app-surface-container-high);
      white-space: nowrap;
    }
    .agg-label {
      color: var(--app-text-muted);
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .agg-value {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
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
  private readonly storage = inject(LocalStorageService);

  readonly collectionId = input.required<string>();
  readonly columns = input<Field[]>([]);
  readonly items = input<TrackerRecord[]>([]);
  readonly references = input<Record<string, RecordReference>>({});
  readonly metrics = input<SummaryMetric[]>([]);
  readonly sortFieldId = input<string | null>(null);
  readonly sortAscending = input(false);
  readonly loading = input(false);
  readonly canEdit = input(true);

  readonly toggleSort = output<Field>();
  readonly open = output<TrackerRecord>();
  readonly edit = output<TrackerRecord>();
  readonly share = output<TrackerRecord>();
  readonly delete = output<TrackerRecord>();

  protected readonly aggregationShortLabel = aggregationShortLabel;
  protected readonly columnWidths = signal<Record<string, number>>({});
  protected readonly activeResizingCol = signal<string | null>(null);

  protected readonly storageKey = computed(
    () => `record_table_widths_${this.collectionId()}`,
  );

  constructor() {
    effect(() => {
      const key = this.storageKey();
      const saved = this.storage.getItem<Record<string, number>>(key);
      if (saved && typeof saved === "object") {
        this.columnWidths.set(saved);
      } else {
        this.columnWidths.set({});
      }
    });
  }

  protected colWidth(fieldId: string): number | undefined {
    return this.columnWidths()[fieldId];
  }

  protected onResizeStart(event: PointerEvent, columnId: string): void {
    event.preventDefault();
    event.stopPropagation();

    const handle = event.currentTarget as HTMLElement;
    const headerCell = handle.closest("th") as HTMLElement | null;
    if (!headerCell) return;

    const startX = event.clientX;
    const startWidth = headerCell.getBoundingClientRect().width;
    const minWidth = 80;

    this.activeResizingCol.set(columnId);
    handle.setPointerCapture(event.pointerId);

    const onPointerMove = (e: PointerEvent) => {
      const delta = e.clientX - startX;
      const newWidth = Math.max(minWidth, Math.round(startWidth + delta));
      this.columnWidths.update((prev) => ({
        ...prev,
        [columnId]: newWidth,
      }));
    };

    const onPointerUp = (e: PointerEvent) => {
      handle.releasePointerCapture(e.pointerId);
      handle.removeEventListener("pointermove", onPointerMove);
      handle.removeEventListener("pointerup", onPointerUp);
      handle.removeEventListener("pointercancel", onPointerUp);
      this.activeResizingCol.set(null);
      this.storage.setItem(this.storageKey(), this.columnWidths());
    };

    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerUp);
    handle.addEventListener("pointercancel", onPointerUp);
  }

  protected format(m: SummaryMetric): string {
    return formatMetric(m);
  }

  protected ariaSort(f: Field): string | null {
    if (this.sortFieldId() !== f.id) return null;
    return this.sortAscending() ? "ascending" : "descending";
  }

  protected sortIconType(f: Field): string {
    if (this.sortFieldId() !== f.id) return "swap";
    return this.sortAscending() ? "arrow-up" : "arrow-down";
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
