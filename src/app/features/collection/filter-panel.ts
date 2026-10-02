import { NgTemplateOutlet } from "@angular/common";
import { Component, inject, input, model } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzSelectModule } from "ng-zorro-antd/select";

import { FieldTypeCatalog } from "../../core/field-types.service";
import { OP_LABELS } from "../../core/labels";
import { Field, FilterOperator, ValueKind } from "../../core/models";
import { ReferenceSelector } from "../../shared/reference-selector";
import { FilterDraft, NO_OPERAND, newFilter } from "./filters";

/**
 * Filter builder generated from field metadata:
 * operators and value editors depend only on the field's kind.
 */
@Component({
  selector: "app-filter-panel",
  imports: [
    NgTemplateOutlet,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    ReferenceSelector,
  ],
  template: `
    <section class="panel surface-card" aria-label="Filters">
      <!-- Header -->
      <div class="panel-header">
        <div class="panel-title">
          <span class="panel-icon" aria-hidden="true">
            <nz-icon nzType="control" />
          </span>

          <div class="panel-headings">
            <h3>Filters</h3>
            <p class="muted">Narrow down the records you want to see.</p>
          </div>
        </div>

        @if (filters().length) {
          <span class="filter-count">
            {{ filters().length }}
            {{ filters().length === 1 ? "filter" : "filters" }}
          </span>
        }
      </div>

      <!-- Filter List or Empty State -->
      @if (filters().length) {
        <div class="filters">
          @for (row of filters(); track row.id; let i = $index) {
            <div class="filter-row">
              <!-- Logic condition badge -->
              <div class="filter-number" aria-hidden="true">
                <span class="clause-tag">{{ i === 0 ? "Where" : "And" }}</span>
                <span class="index-tag">#{{ i + 1 }}</span>
              </div>

              <!-- Field Selector -->
              <div class="c-field">
                <nz-select
                  [ngModel]="row.fieldId"
                  (ngModelChange)="setField(i, $event)"
                  nzPlaceHolder="Field"
                  class="full-width"
                >
                  @for (f of fields(); track f.id) {
                    <nz-option [nzValue]="f.id" [nzLabel]="f.name" />
                  }
                </nz-select>
              </div>

              <!-- Condition / Operator Selector -->
              <div class="c-op">
                <nz-select
                  [ngModel]="row.op"
                  (ngModelChange)="patch(i, { op: $event })"
                  nzPlaceHolder="Condition"
                  class="full-width"
                >
                  @for (op of operators(row); track op) {
                    <nz-option [nzValue]="op" [nzLabel]="opLabel(op)" />
                  }
                </nz-select>
              </div>

              <!-- Dynamic Value Input based on Field Kind -->
              @if (row.op && !noOperand(row.op)) {
                @switch (kind(row)) {
                  @case ("number") {
                    <div class="c-val">
                      <input
                        nz-input
                        type="number"
                        placeholder="Value"
                        [value]="row.value ?? ''"
                        (input)="patch(i, { value: text($event) })"
                      />
                    </div>

                    @if (row.op === "between") {
                      <div class="c-val">
                        <input
                          nz-input
                          type="number"
                          placeholder="And"
                          [value]="row.value2 ?? ''"
                          (input)="patch(i, { value2: text($event) })"
                        />
                      </div>
                    }
                  }

                  @case ("date") {
                    <ng-container
                      [ngTemplateOutlet]="dates"
                      [ngTemplateOutletContext]="{ row, i }"
                    />
                  }

                  @case ("dateTime") {
                    <ng-container
                      [ngTemplateOutlet]="dates"
                      [ngTemplateOutletContext]="{ row, i }"
                    />
                  }

                  @case ("boolean") {
                    <div class="c-val">
                      <nz-select
                        [ngModel]="row.value"
                        (ngModelChange)="patch(i, { value: $event })"
                        nzPlaceHolder="Value"
                        class="full-width"
                      >
                        <nz-option nzValue="true" nzLabel="Yes" />
                        <nz-option nzValue="false" nzLabel="No" />
                      </nz-select>
                    </div>
                  }

                  @case ("choice") {
                    <ng-container
                      [ngTemplateOutlet]="choice"
                      [ngTemplateOutletContext]="{ row, i }"
                    />
                  }

                  @case ("multiChoice") {
                    <ng-container
                      [ngTemplateOutlet]="choice"
                      [ngTemplateOutletContext]="{ row, i }"
                    />
                  }

                  @default {
                    <div class="c-val">
                      <input
                        nz-input
                        placeholder="Value"
                        [value]="row.value ?? ''"
                        (input)="patch(i, { value: text($event) })"
                      />
                    </div>
                  }
                }
              }

              <!-- Remove Action -->
              <button
                nz-button
                nzType="text"
                nzShape="circle"
                type="button"
                class="remove-button"
                (click)="remove(i)"
                [attr.aria-label]="'Remove filter ' + (i + 1)"
                [title]="'Remove filter ' + (i + 1)"
              >
                <nz-icon nzType="close" />
              </button>
            </div>
          }
        </div>
      } @else {
        <div class="empty-filters">
          <span class="empty-icon" aria-hidden="true">
            <nz-icon nzType="filter" />
          </span>

          <div class="empty-text">
            <strong>No filters applied</strong>
            <span class="muted">
              Add a filter to narrow down your records.
            </span>
          </div>
        </div>
      }

      <!-- Footer Actions -->
      <div class="panel-footer">
        <button
          nz-button
          nzType="primary"
          type="button"
          class="add-button"
          (click)="add()"
        >
          <nz-icon nzType="plus" />
          Add filter
        </button>

        @if (filters().length) {
          <button
            nz-button
            nzType="default"
            type="button"
            class="clear-button"
            (click)="filters.set([])"
          >
            <nz-icon nzType="clear" />
            Clear all
          </button>
        }
      </div>
    </section>

    <!-- Template: Date / DateTime inputs -->
    <ng-template #dates let-row="row" let-i="i">
      <div class="c-val">
        <input
          nz-input
          type="date"
          [value]="row.value ?? ''"
          (input)="patch(i, { value: text($event) })"
        />
      </div>

      @if (row.op === "between") {
        <div class="c-val">
          <input
            nz-input
            type="date"
            placeholder="And"
            [value]="row.value2 ?? ''"
            (input)="patch(i, { value2: text($event) })"
          />
        </div>
      }
    </ng-template>

    <!-- Template: Choice / MultiChoice / Reference inputs -->
    <ng-template #choice let-row="row" let-i="i">
      @let f = fieldOf(row);

      @if (
        f &&
        (f.type === "reference" || f.type === "multiReference") &&
        f.config.targetCollectionId
      ) {
        <div class="c-val ref">
          <app-reference-selector
            [collectionId]="f.config.targetCollectionId"
            label="Record"
            [value]="$any(row.value ?? null)"
            (valueChange)="patch(i, { value: $event })"
          />
        </div>
      } @else if (f) {
        <div class="c-val">
          <nz-select
            [ngModel]="row.value"
            (ngModelChange)="patch(i, { value: $event })"
            nzPlaceHolder="Option"
            class="full-width"
          >
            @for (o of f.config.options ?? []; track o) {
              <nz-option [nzValue]="o" [nzLabel]="o" />
            }
          </nz-select>
        </div>
      }
    </ng-template>
  `,
  styles: `
    :host {
      display: block;
    }

    .panel {
      margin: 12px 0 16px;
      padding: 20px;
      border-radius: 16px;
      border: 1px solid var(--app-outline-variant, #e0e2ec);
      background: var(--app-surface, #ffffff);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--app-outline-variant, #e0e2ec);
    }

    .panel-title {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }

    .panel-icon {
      width: 42px;
      height: 42px;
      flex: 0 0 42px;
      display: grid;
      place-items: center;
      border-radius: 12px;
      background: var(--app-primary-container, #eaddff);
      color: var(--app-on-primary-container, #21005d);
      font-size: 20px;
    }

    .panel-headings h3 {
      font-size: 1.05rem;
      line-height: 1.25;
      font-weight: 700;
      margin: 0;
      color: var(--app-text, #1d1b20);
    }

    .panel-headings p.muted {
      margin: 3px 0 0;
      font-size: 0.8125rem;
      line-height: 1.35;
      color: var(--app-text-muted, #49454f);
    }

    .filter-count {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 0 12px;
      border-radius: 999px;
      background: var(--app-surface-container-high, #e8def8);
      color: var(--app-text, #1d192b);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .filters {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 16px 0 6px;
    }

    .filter-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      min-width: 0;
      padding: 10px 14px;
      border: 1px solid var(--app-outline-variant, #e0e2ec);
      border-radius: 14px;
      background: var(--app-surface, #ffffff);
      transition:
        border-color 160ms cubic-bezier(0.4, 0, 0.2, 1),
        background-color 160ms cubic-bezier(0.4, 0, 0.2, 1),
        box-shadow 160ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .filter-row:hover {
      border-color: color-mix(
        in srgb,
        var(--app-primary, #6750a4) 40%,
        var(--app-outline-variant, #e0e2ec)
      );
      background: var(--app-surface-container-lowest, #fdfbff);
    }

    .filter-row:focus-within {
      border-color: var(--app-primary, #6750a4);
      box-shadow:
        0 0 0 1px var(--app-primary, #6750a4),
        0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .filter-number {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 10px;
      border-radius: 8px;
      background: var(--app-surface-container-high, #ece6f0);
      color: var(--app-text-muted, #49454f);
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
      user-select: none;
      flex: 0 0 auto;
    }

    .clause-tag {
      color: var(--app-primary, #6750a4);
      font-weight: 700;
      text-transform: uppercase;
      font-size: 0.6875rem;
      letter-spacing: 0.04em;
    }

    .index-tag {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      border-radius: 999px;
      font-size: 0.6875rem;
      font-weight: 600;
      opacity: 0.75;
    }

    .full-width {
      width: 100%;
    }

    .c-field {
      flex: 1 1 200px;
      min-width: 180px;
    }

    .c-op {
      flex: 0.9 1 180px;
      min-width: 160px;
    }

    .c-val {
      flex: 1.1 1 200px;
      min-width: 170px;
    }

    .ref {
      flex: 1.4 1 240px;
      min-width: 200px;
    }

    .ref app-reference-selector {
      display: block;
      width: 100%;
    }

    .remove-button {
      flex: 0 0 36px;
      color: var(--app-text-muted, #49454f);
    }

    .remove-button:hover {
      color: var(--app-error, #ba1a1a);
      background: var(--app-error-container, #ffdad6);
    }

    .empty-filters {
      display: flex;
      align-items: center;
      gap: 14px;
      margin: 16px 0 6px;
      padding: 18px;
      border: 1.5px dashed var(--app-outline-variant, #cac4d0);
      border-radius: 14px;
      background: var(--app-surface, #ffffff);
    }

    .empty-icon {
      width: 44px;
      height: 44px;
      flex: 0 0 44px;
      display: grid;
      place-items: center;
      border-radius: 12px;
      background: var(--app-surface-container, #f3edf7);
      color: var(--app-text-muted, #49454f);
      font-size: 22px;
    }

    .empty-text {
      display: grid;
      gap: 3px;
    }

    .empty-text strong {
      font-size: 0.925rem;
      font-weight: 600;
      color: var(--app-text, #1d1b20);
    }

    .empty-text .muted {
      font-size: 0.8125rem;
      color: var(--app-text-muted, #49454f);
    }

    .panel-footer {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-top: 16px;
    }

    .panel-footer button {
      min-height: 40px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .clear-button {
      color: var(--app-text-muted, #49454f);
    }

    /* Tablet and Medium screens */
    @media (max-width: 900px) and (min-width: 681px) {
      .filter-row {
        gap: 8px;
        padding: 10px 12px;
      }

      .c-field,
      .c-op {
        flex: 1 1 40%;
      }

      .c-val,
      .ref {
        flex: 1 1 calc(100% - 60px);
      }
    }

    /* Mobile screens */
    @media (max-width: 680px) {
      .panel {
        margin: 8px 0 14px;
        padding: 14px;
        border-radius: 14px;
      }

      .panel-header {
        align-items: flex-start;
        padding-bottom: 12px;
      }

      .panel-icon {
        width: 38px;
        height: 38px;
        flex: 0 0 38px;
        border-radius: 10px;
        font-size: 18px;
      }

      .panel-headings p.muted {
        display: none;
      }

      .filter-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        padding: 12px;
      }

      .filter-number {
        grid-column: 1;
        grid-row: 1;
        justify-self: start;
        height: 28px;
      }

      .remove-button {
        grid-column: 2;
        grid-row: 1;
        justify-self: end;
      }

      .c-field,
      .c-op,
      .c-val,
      .ref {
        grid-column: 1 / -1;
        width: 100%;
        min-width: 0;
      }

      .panel-footer {
        flex-direction: column;
        align-items: stretch;
      }

      .panel-footer button {
        width: 100%;
        justify-content: center;
      }
    }

    /* Extra compact mobile screens */
    @media (max-width: 380px) {
      .panel {
        padding: 12px;
      }

      .panel-title {
        gap: 10px;
      }

      .panel-headings h3 {
        font-size: 0.95rem;
      }

      .filter-count {
        padding: 0 8px;
      }

      .empty-filters {
        flex-direction: column;
        text-align: center;
        padding: 14px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .filter-row,
      .remove-button {
        transition: none;
      }
    }
  `,
})
export class FilterPanel {
  readonly fields = input.required<Field[]>();
  readonly filters = model<FilterDraft[]>([]);

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
    return OP_LABELS[op];
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
}
