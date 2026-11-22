import { NgTemplateOutlet } from "@angular/common";
import { Component, inject, input, model, output } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { NzButtonModule } from "ng-zorro-antd/button";
import { NzDatePickerModule } from "ng-zorro-antd/date-picker";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzSelectModule } from "ng-zorro-antd/select";
import { NzTooltipModule } from "ng-zorro-antd/tooltip";

import { FieldTypeCatalog } from "../../core/field-types.service";
import { OP_LABELS } from "../../core/labels";
import { Field, FilterOperator, ValueKind } from "../../core/models";
import { ReferenceSelector } from "../../shared/reference-selector";
import { FilterDraft, NO_OPERAND, newFilter } from "./filters";

@Component({
  selector: "app-filter-panel",
  imports: [
    NgTemplateOutlet,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    NzDatePickerModule,
    NzTooltipModule,
    ReferenceSelector,
  ],
  template: `
    <section class="filter-panel-card" aria-label="Filters">
      <!-- Header -->
      <div class="panel-header">
        <div class="header-main">
          <div class="header-icon-box" aria-hidden="true">
            <nz-icon nzType="filter" />
          </div>

          <div class="header-text">
            <div class="title-row">
              <h3 class="panel-title">Filters</h3>
              @if (filters().length) {
                <span class="filter-badge">
                  {{ filters().length }} {{ filters().length === 1 ? "rule" : "rules" }}
                </span>
              }
            </div>
            <p class="panel-sub">
              Narrow down records by matching custom conditions
            </p>
          </div>
        </div>

        <button
          nz-button
          nzType="text"
          nzShape="circle"
          type="button"
          class="panel-close-btn"
          (click)="close.emit()"
          aria-label="Close filters"
          nz-tooltip
          nzTooltipTitle="Close filters"
        >
          <nz-icon nzType="close" />
        </button>
      </div>

      <!-- Filter Rules List -->
      @if (filters().length) {
        <div class="rules-list">
          @for (row of filters(); track row.id; let i = $index) {
            <div class="rule-card">
              <!-- Mobile Header & Desktop Step Indicator -->
              <div class="rule-step-bar">
                <span class="step-chip" [class.first-step]="i === 0">
                  {{ i === 0 ? "Where" : "And" }}
                </span>

                <button
                  nz-button
                  nzType="text"
                  nzShape="circle"
                  type="button"
                  class="mobile-delete-btn"
                  (click)="remove(i)"
                  [attr.aria-label]="'Remove condition ' + (i + 1)"
                >
                  <nz-icon nzType="close" />
                </button>
              </div>

              <!-- Rule Fields Group -->
              <div class="rule-fields-group">
                <!-- Field Selector -->
                <div class="control-box field-box">
                  <nz-select
                    [ngModel]="row.fieldId"
                    (ngModelChange)="setField(i, $event)"
                    nzPlaceHolder="Select field"
                    class="full-select"
                  >
                    @for (f of fields(); track f.id) {
                      <nz-option [nzValue]="f.id" [nzLabel]="f.name" />
                    }
                  </nz-select>
                </div>

                <!-- Condition Operator Selector -->
                <div class="control-box op-box">
                  <nz-select
                    [ngModel]="row.op"
                    (ngModelChange)="patch(i, { op: $event })"
                    nzPlaceHolder="Condition"
                    class="full-select"
                  >
                    @for (op of operators(row); track op) {
                      <nz-option [nzValue]="op" [nzLabel]="opLabel(op)" />
                    }
                  </nz-select>
                </div>

                <!-- Dynamic Value Input -->
                @if (row.op && !noOperand(row.op)) {
                  <div class="control-box value-box">
                    @switch (kind(row)) {
                      <!-- Number -->
                      @case ("number") {
                        <div class="input-pair">
                          <input
                            nz-input
                            type="number"
                            placeholder="Value"
                            class="rule-input"
                            [value]="row.value ?? ''"
                            (input)="patch(i, { value: text($event) })"
                          />

                          @if (row.op === "between") {
                            <input
                              nz-input
                              type="number"
                              placeholder="And"
                              class="rule-input"
                              [value]="row.value2 ?? ''"
                              (input)="patch(i, { value2: text($event) })"
                            />
                          }
                        </div>
                      }

                      <!-- Date -->
                      @case ("date") {
                        <ng-container
                          [ngTemplateOutlet]="dates"
                          [ngTemplateOutletContext]="{ row, i }"
                        />
                      }

                      <!-- DateTime -->
                      @case ("dateTime") {
                        <ng-container
                          [ngTemplateOutlet]="dates"
                          [ngTemplateOutletContext]="{ row, i }"
                        />
                      }

                      <!-- Boolean -->
                      @case ("boolean") {
                        <nz-select
                          [ngModel]="row.value"
                          (ngModelChange)="patch(i, { value: $event })"
                          nzPlaceHolder="Select"
                          class="full-select"
                        >
                          <nz-option nzValue="true" nzLabel="Yes" />
                          <nz-option nzValue="false" nzLabel="No" />
                        </nz-select>
                      }

                      <!-- Choice -->
                      @case ("choice") {
                        <ng-container
                          [ngTemplateOutlet]="choice"
                          [ngTemplateOutletContext]="{ row, i }"
                        />
                      }

                      <!-- Multi choice -->
                      @case ("multiChoice") {
                        <ng-container
                          [ngTemplateOutlet]="choice"
                          [ngTemplateOutletContext]="{ row, i }"
                        />
                      }

                      <!-- Default text -->
                      @default {
                        <input
                          nz-input
                          placeholder="Value"
                          class="rule-input"
                          [value]="row.value ?? ''"
                          (input)="patch(i, { value: text($event) })"
                        />
                      }
                    }
                  </div>
                }
              </div>

              <!-- Desktop Delete Button -->
              <button
                nz-button
                nzType="text"
                nzShape="circle"
                type="button"
                class="desktop-delete-btn"
                (click)="remove(i)"
                [attr.aria-label]="'Remove condition ' + (i + 1)"
                nz-tooltip
                nzTooltipTitle="Remove condition"
              >
                <nz-icon nzType="close" />
              </button>
            </div>
          }
        </div>
      } @else {
        <!-- Empty State -->
        <div class="empty-rules">
          <div class="empty-icon" aria-hidden="true">
            <nz-icon nzType="filter" />
          </div>
          <div class="empty-info">
            <strong>No active filters</strong>
            <p>Add a condition to filter records in this tracker.</p>
          </div>
        </div>
      }

      <!-- Footer Actions -->
      <div class="panel-footer">
        <div class="footer-left">
          <button
            nz-button
            nzType="primary"
            type="button"
            class="action-btn add-btn"
            (click)="add()"
          >
            <nz-icon nzType="plus" />
            <span>Add condition</span>
          </button>

          @if (filters().length > 0) {
            <button
              nz-button
              nzType="default"
              type="button"
              class="action-btn clear-btn"
              (click)="filters.set([])"
            >
              <nz-icon nzType="delete" />
              <span>Clear all</span>
            </button>
          }
        </div>

        <button
          nz-button
          nzType="default"
          type="button"
          class="action-btn done-btn"
          (click)="close.emit()"
        >
          <span>Done</span>
        </button>
      </div>
    </section>

    <!-- Date Templates -->
    <ng-template #dates let-row="row" let-i="i">
      <div class="input-pair">
        <nz-date-picker
          class="full-datepicker"
          [ngModel]="row.value"
          (ngModelChange)="patch(i, { value: dateValue($event) })"
        />

        @if (row.op === "between") {
          <nz-date-picker
            class="full-datepicker"
            [ngModel]="row.value2"
            (ngModelChange)="patch(i, { value2: dateValue($event) })"
          />
        }
      </div>
    </ng-template>

    <!-- Choice / Reference Template -->
    <ng-template #choice let-row="row" let-i="i">
      @let f = fieldOf(row);

      @if (
        f &&
        (f.type === "reference" || f.type === "multiReference") &&
        f.config.targetCollectionId
      ) {
        <app-reference-selector
          class="block w-full"
          [collectionId]="f.config.targetCollectionId"
          label="Record"
          [value]="$any(row.value ?? null)"
          (valueChange)="patch(i, { value: $event })"
        />
      } @else if (f) {
        <nz-select
          [ngModel]="row.value"
          (ngModelChange)="patch(i, { value: $event })"
          nzPlaceHolder="Option"
          class="full-select"
        >
          @for (o of f.config.options ?? []; track o) {
            <nz-option [nzValue]="o" [nzLabel]="o" />
          }
        </nz-select>
      }
    </ng-template>
  `,
  styles: `
    :host {
      display: block;
    }

    .filter-panel-card {
      background: var(--app-surface);
      border: 1px solid var(--app-outline);
      border-radius: var(--radius-xl);
      padding: 16px;
      box-shadow: var(--app-shadow-xs);
      margin-bottom: 16px;
      transition: all var(--transition-fast);
    }

    /* ---- Panel Header ---- */
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--app-outline-variant);
    }

    .header-main {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .header-icon-box {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-md);
      background: var(--app-primary-container);
      color: var(--app-primary);
      display: grid;
      place-items: center;
      font-size: 16px;
      flex-shrink: 0;
    }

    .header-text {
      min-width: 0;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .panel-title {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--app-text);
      line-height: 1.2;
    }

    .filter-badge {
      display: inline-flex;
      align-items: center;
      padding: 1px 7px;
      border-radius: var(--radius-full);
      background: var(--app-primary-container);
      color: var(--app-on-primary-container);
      font-size: 0.6875rem;
      font-weight: 700;
      line-height: 1.3;
    }

    .panel-sub {
      margin: 2px 0 0;
      font-size: 0.75rem;
      color: var(--app-text-muted);
      line-height: 1.3;
    }

    .panel-close-btn {
      color: var(--app-text-muted);
      flex-shrink: 0;
      &:hover {
        color: var(--app-text);
        background: var(--app-surface-container-high);
      }
    }

    /* ---- Rules List ---- */
    .rules-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 14px 0 10px;
    }

    .rule-card {
      display: grid;
      grid-template-columns: 78px minmax(130px, 1.2fr) minmax(120px, 1fr) minmax(140px, 1.5fr) 32px;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: var(--app-surface-container-low);
      border: 1px solid var(--app-outline-variant);
      border-radius: var(--radius-lg);
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--app-outline);
        background: var(--app-surface);
      }

      &:focus-within {
        border-color: var(--app-primary);
        box-shadow: 0 0 0 1px var(--app-primary);
      }
    }

    .rule-step-bar {
      display: flex;
      align-items: center;
    }

    .step-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 26px;
      padding: 0 8px;
      border-radius: var(--radius-sm);
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: var(--app-surface-container);
      color: var(--app-text-secondary);
      user-select: none;

      &.first-step {
        background: var(--app-primary-container);
        color: var(--app-primary);
      }
    }

    .rule-fields-group {
      display: contents;
    }

    .control-box {
      min-width: 0;
    }

    .full-select {
      width: 100% !important;
    }

    .full-datepicker {
      width: 100% !important;
    }

    .rule-input {
      width: 100% !important;
      height: 32px !important;
      border-radius: var(--radius-sm) !important;
    }

    .input-pair {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
    }

    .mobile-delete-btn {
      display: none !important;
    }

    .desktop-delete-btn {
      color: var(--app-text-muted);
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      width: 28px !important;
      height: 28px !important;

      &:hover {
        color: var(--app-error);
        background: var(--app-error-container);
      }
    }

    /* ---- Empty Rules State ---- */
    .empty-rules {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 18px 14px;
      margin: 12px 0 8px;
      background: var(--app-surface-container-low);
      border: 1px dashed var(--app-outline-variant);
      border-radius: var(--radius-lg);
    }

    .empty-icon {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-md);
      background: var(--app-surface-container);
      color: var(--app-text-muted);
      display: grid;
      place-items: center;
      font-size: 18px;
      flex-shrink: 0;
    }

    .empty-info {
      strong {
        display: block;
        font-size: 0.84375rem;
        font-weight: 600;
        color: var(--app-text);
      }
      p {
        margin: 2px 0 0;
        font-size: 0.75rem;
        color: var(--app-text-muted);
      }
    }

    /* ---- Footer Actions ---- */
    .panel-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding-top: 12px;
      border-top: 1px solid var(--app-outline-variant);
      flex-wrap: wrap;
    }

    .footer-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .action-btn {
      height: 34px !important;
      border-radius: var(--radius-md) !important;
      font-size: 0.8125rem !important;
      font-weight: 500 !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
    }

    .done-btn {
      color: var(--app-text-secondary);
    }

    /* ---- Mobile Responsiveness ---- */
    @media (max-width: 767px) {
      .filter-panel-card {
        padding: 12px;
        margin-bottom: 12px;
      }

      .rules-list {
        gap: 10px;
        padding: 12px 0 8px;
      }

      .rule-card {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
        border-radius: var(--radius-lg);
      }

      .rule-step-bar {
        width: 100%;
        justify-content: space-between;
      }

      .rule-fields-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
      }

      .control-box {
        width: 100%;
      }

      .mobile-delete-btn {
        display: inline-flex !important;
        color: var(--app-text-muted);
        width: 28px !important;
        height: 28px !important;

        &:hover {
          color: var(--app-error);
          background: var(--app-error-container);
        }
      }

      .desktop-delete-btn {
        display: none !important;
      }

      .panel-footer {
        flex-direction: column;
        align-items: stretch;
      }

      .footer-left {
        width: 100%;
        display: grid;
        grid-template-columns: 1fr auto;
      }

      .add-btn {
        width: 100%;
        justify-content: center;
      }

      .done-btn {
        width: 100%;
        justify-content: center;
      }
    }
  `,
})
export class FilterPanel {
  readonly fields = input.required<Field[]>();
  readonly filters = model<FilterDraft[]>([]);
  readonly close = output<void>();

  private readonly catalog = inject(FieldTypeCatalog);

  protected fieldOf(row: FilterDraft): Field | undefined {
    return this.fields().find((f) => f.id === row.fieldId);
  }

  protected kind(row: FilterDraft): ValueKind | undefined {
    const f = this.fieldOf(row);
    return f ? this.catalog.kind(f.type) : undefined;
  }

  protected operators(row: FilterDraft): FilterOperator[] {
    const f = this.fieldOf(row);
    return f ? this.catalog.operators(f.type) : [];
  }

  protected opLabel(op: FilterOperator): string {
    return OP_LABELS[op] ?? op;
  }

  protected noOperand(op: FilterOperator): boolean {
    return NO_OPERAND.includes(op);
  }

  protected text(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  protected add(): void {
    const first = this.fields()[0];
    const op = first ? (this.catalog.operators(first.type)[0] ?? null) : null;
    this.filters.update((l) => [...l, newFilter(first?.id ?? null, op)]);
  }

  protected remove(i: number): void {
    this.filters.update((l) => l.filter((_, idx) => idx !== i));
  }

  protected patch(i: number, p: Partial<FilterDraft>): void {
    this.filters.update((l) =>
      l.map((r, idx) => (idx === i ? { ...r, ...p } : r)),
    );
  }

  protected setField(i: number, fieldId: string): void {
    const f = this.fields().find((x) => x.id === fieldId);
    this.patch(i, {
      fieldId,
      op: f ? (this.catalog.operators(f.type)[0] ?? null) : null,
      value: null,
      value2: null,
    });
  }

  protected dateValue(value: Date | null): string | null {
    if (!value) return null;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
