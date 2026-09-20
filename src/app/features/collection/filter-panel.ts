import { NgTemplateOutlet } from "@angular/common";
import { Component, inject, input, model } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";

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
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReferenceSelector,
  ],
  template: `
    <section class="panel surface-card" aria-label="Filters">
      <!-- Header -->
      <div class="panel-header">
        <div class="panel-title">
          <span class="panel-icon" aria-hidden="true">
            <mat-icon>tune</mat-icon>
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
              <mat-form-field
                appearance="outline"
                subscriptSizing="dynamic"
                class="c-field"
              >
                <mat-label>Field</mat-label>

                <mat-select
                  [value]="row.fieldId"
                  (selectionChange)="setField(i, $event.value)"
                >
                  @for (f of fields(); track f.id) {
                    <mat-option [value]="f.id">
                      {{ f.name }}
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <!-- Condition / Operator Selector -->
              <mat-form-field
                appearance="outline"
                subscriptSizing="dynamic"
                class="c-op"
              >
                <mat-label>Condition</mat-label>

                <mat-select
                  [value]="row.op"
                  (selectionChange)="patch(i, { op: $event.value })"
                >
                  @for (op of operators(row); track op) {
                    <mat-option [value]="op">
                      {{ opLabel(op) }}
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <!-- Dynamic Value Input based on Field Kind -->
              @if (row.op && !noOperand(row.op)) {
                @switch (kind(row)) {
                  @case ("number") {
                    <mat-form-field
                      appearance="outline"
                      subscriptSizing="dynamic"
                      class="c-val"
                    >
                      <mat-label>Value</mat-label>

                      <input
                        matInput
                        type="number"
                        [value]="row.value ?? ''"
                        (input)="patch(i, { value: text($event) })"
                      />
                    </mat-form-field>

                    @if (row.op === "between") {
                      <mat-form-field
                        appearance="outline"
                        subscriptSizing="dynamic"
                        class="c-val"
                      >
                        <mat-label>And</mat-label>

                        <input
                          matInput
                          type="number"
                          [value]="row.value2 ?? ''"
                          (input)="patch(i, { value2: text($event) })"
                        />
                      </mat-form-field>
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
                    <mat-form-field
                      appearance="outline"
                      subscriptSizing="dynamic"
                      class="c-val"
                    >
                      <mat-label>Value</mat-label>

                      <mat-select
                        [value]="row.value"
                        (selectionChange)="patch(i, { value: $event.value })"
                      >
                        <mat-option value="true">Yes</mat-option>
                        <mat-option value="false">No</mat-option>
                      </mat-select>
                    </mat-form-field>
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
                    <mat-form-field
                      appearance="outline"
                      subscriptSizing="dynamic"
                      class="c-val"
                    >
                      <mat-label>Value</mat-label>

                      <input
                        matInput
                        [value]="row.value ?? ''"
                        (input)="patch(i, { value: text($event) })"
                      />
                    </mat-form-field>
                  }
                }
              }

              <!-- Remove Action -->
              <button
                mat-icon-button
                type="button"
                class="remove-button"
                (click)="remove(i)"
                [attr.aria-label]="'Remove filter ' + (i + 1)"
                [title]="'Remove filter ' + (i + 1)"
              >
                <mat-icon>close</mat-icon>
              </button>
            </div>
          }
        </div>
      } @else {
        <div class="empty-filters">
          <span class="empty-icon" aria-hidden="true">
            <mat-icon>filter_alt</mat-icon>
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
          mat-flat-button
          type="button"
          class="add-button"
          (click)="add()"
        >
          <mat-icon>add</mat-icon>
          Add filter
        </button>

        @if (filters().length) {
          <button
            mat-button
            type="button"
            class="clear-button"
            (click)="filters.set([])"
          >
            <mat-icon>clear_all</mat-icon>
            Clear all
          </button>
        }
      </div>
    </section>

    <!-- Template: Date / DateTime inputs -->
    <ng-template #dates let-row="row" let-i="i">
      <mat-form-field
        appearance="outline"
        subscriptSizing="dynamic"
        class="c-val"
      >
        <mat-label>Date</mat-label>

        <input
          matInput
          type="date"
          [value]="row.value ?? ''"
          (input)="patch(i, { value: text($event) })"
        />
      </mat-form-field>

      @if (row.op === "between") {
        <mat-form-field
          appearance="outline"
          subscriptSizing="dynamic"
          class="c-val"
        >
          <mat-label>And</mat-label>

          <input
            matInput
            type="date"
            [value]="row.value2 ?? ''"
            (input)="patch(i, { value2: text($event) })"
          />
        </mat-form-field>
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
        <mat-form-field
          appearance="outline"
          subscriptSizing="dynamic"
          class="c-val"
        >
          <mat-label>Option</mat-label>

          <mat-select
            [value]="row.value"
            (selectionChange)="patch(i, { value: $event.value })"
          >
            @for (o of f.config.options ?? []; track o) {
              <mat-option [value]="o">
                {{ o }}
              </mat-option>
            }
          </mat-select>
        </mat-form-field>
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
      border: 1px solid var(--mat-sys-outline-variant, #e0e2ec);
      background: var(--mat-sys-surface, #ffffff);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--mat-sys-outline-variant, #e0e2ec);
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
      background: var(--mat-sys-primary-container, #eaddff);
      color: var(--mat-sys-on-primary-container, #21005d);
    }

    .panel-icon mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .panel-headings h3 {
      font-size: 1.05rem;
      line-height: 1.25;
      font-weight: 700;
      margin: 0;
      color: var(--mat-sys-on-surface, #1d1b20);
    }

    .panel-headings p.muted {
      margin: 3px 0 0;
      font-size: 0.8125rem;
      line-height: 1.35;
      color: var(--mat-sys-on-surface-variant, #49454f);
    }

    .filter-count {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 0 12px;
      border-radius: 999px;
      background: var(--mat-sys-secondary-container, #e8def8);
      color: var(--mat-sys-on-secondary-container, #1d192b);
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
      border: 1px solid var(--mat-sys-outline-variant, #e0e2ec);
      border-radius: 14px;
      background: var(--mat-sys-surface, #ffffff);
      transition:
        border-color 160ms cubic-bezier(0.4, 0, 0.2, 1),
        background-color 160ms cubic-bezier(0.4, 0, 0.2, 1),
        box-shadow 160ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .filter-row:hover {
      border-color: color-mix(
        in srgb,
        var(--mat-sys-primary, #6750a4) 40%,
        var(--mat-sys-outline-variant, #e0e2ec)
      );
      background: var(--mat-sys-surface-container-lowest, #fdfbff);
    }

    .filter-row:focus-within {
      border-color: var(--mat-sys-primary, #6750a4);
      box-shadow:
        0 0 0 1px var(--mat-sys-primary, #6750a4),
        0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .filter-number {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 10px;
      border-radius: 8px;
      background: var(--mat-sys-surface-container-high, #ece6f0);
      color: var(--mat-sys-on-surface-variant, #49454f);
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
      user-select: none;
      flex: 0 0 auto;
    }

    .clause-tag {
      color: var(--mat-sys-primary, #6750a4);
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
      flex: 0 0 40px;
      width: 40px;
      height: 40px;
      color: var(--mat-sys-on-surface-variant, #49454f);
      border-radius: 10px;
      transition:
        color 140ms ease,
        background-color 140ms ease;
    }

    .remove-button:hover {
      color: var(--mat-sys-error, #ba1a1a);
      background: var(--mat-sys-error-container, #ffdad6);
    }

    .empty-filters {
      display: flex;
      align-items: center;
      gap: 14px;
      margin: 16px 0 6px;
      padding: 18px;
      border: 1.5px dashed var(--mat-sys-outline-variant, #cac4d0);
      border-radius: 14px;
      background: var(--mat-sys-surface, #ffffff);
    }

    .empty-icon {
      width: 44px;
      height: 44px;
      flex: 0 0 44px;
      display: grid;
      place-items: center;
      border-radius: 12px;
      background: var(--mat-sys-surface-container, #f3edf7);
      color: var(--mat-sys-on-surface-variant, #49454f);
    }

    .empty-icon mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .empty-text {
      display: grid;
      gap: 3px;
    }

    .empty-text strong {
      font-size: 0.925rem;
      font-weight: 600;
      color: var(--mat-sys-on-surface, #1d1b20);
    }

    .empty-text .muted {
      font-size: 0.8125rem;
      color: var(--mat-sys-on-surface-variant, #49454f);
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
    }

    .clear-button {
      color: var(--mat-sys-on-surface-variant, #49454f);
    }

    /* Tablet and Medium screens (Wrap gracefully) */
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

    /* Mobile screens (Single-column card style) */
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
      }

      .panel-icon mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
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
