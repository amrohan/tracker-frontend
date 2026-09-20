import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, input, model } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FieldTypeCatalog } from '../../core/field-types.service';
import { OP_LABELS } from '../../core/labels';
import { Field, FilterOperator, ValueKind } from '../../core/models';
import { ReferenceSelector } from '../../shared/reference-selector';
import { FilterDraft, NO_OPERAND, newFilter } from './filters';

/** Filter builder generated from field metadata: operators and value editors depend only on the field's kind. */
@Component({
  selector: 'app-filter-panel',
  imports: [NgTemplateOutlet, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, ReferenceSelector],
  template: `
    <section class="panel surface-card" aria-label="Filters">
      @for (row of filters(); track row.id; let i = $index) {
        <div class="filter-row">
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="c-field">
            <mat-label>Field</mat-label>
            <mat-select [value]="row.fieldId" (selectionChange)="setField(i, $event.value)">
              @for (f of fields(); track f.id) { <mat-option [value]="f.id">{{ f.name }}</mat-option> }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="c-op">
            <mat-label>Condition</mat-label>
            <mat-select [value]="row.op" (selectionChange)="patch(i, { op: $event.value })">
              @for (op of operators(row); track op) { <mat-option [value]="op">{{ opLabel(op) }}</mat-option> }
            </mat-select>
          </mat-form-field>

          @if (row.op && !noOperand(row.op)) {
            @switch (kind(row)) {
              @case ('number') {
                <mat-form-field appearance="outline" subscriptSizing="dynamic" class="c-val">
                  <mat-label>Value</mat-label>
                  <input matInput type="number" [value]="row.value ?? ''" (input)="patch(i, { value: text($event) })" />
                </mat-form-field>
                @if (row.op === 'between') {
                  <mat-form-field appearance="outline" subscriptSizing="dynamic" class="c-val">
                    <mat-label>and</mat-label>
                    <input matInput type="number" [value]="row.value2 ?? ''" (input)="patch(i, { value2: text($event) })" />
                  </mat-form-field>
                }
              }
              @case ('date') { <ng-container [ngTemplateOutlet]="dates" [ngTemplateOutletContext]="{ row, i }" /> }
              @case ('dateTime') { <ng-container [ngTemplateOutlet]="dates" [ngTemplateOutletContext]="{ row, i }" /> }
              @case ('boolean') {
                <mat-form-field appearance="outline" subscriptSizing="dynamic" class="c-val">
                  <mat-label>Value</mat-label>
                  <mat-select [value]="row.value" (selectionChange)="patch(i, { value: $event.value })">
                    <mat-option value="true">Yes</mat-option><mat-option value="false">No</mat-option>
                  </mat-select>
                </mat-form-field>
              }
              @case ('choice') { <ng-container [ngTemplateOutlet]="choice" [ngTemplateOutletContext]="{ row, i }" /> }
              @case ('multiChoice') { <ng-container [ngTemplateOutlet]="choice" [ngTemplateOutletContext]="{ row, i }" /> }
              @default {
                <mat-form-field appearance="outline" subscriptSizing="dynamic" class="c-val">
                  <mat-label>Value</mat-label>
                  <input matInput [value]="row.value ?? ''" (input)="patch(i, { value: text($event) })" />
                </mat-form-field>
              }
            }
          }

          <button mat-icon-button type="button" (click)="remove(i)" aria-label="Remove filter"><mat-icon>close</mat-icon></button>
        </div>
      }

      <div class="row">
        <button mat-button type="button" (click)="add()"><mat-icon>add</mat-icon> Add filter</button>
        @if (filters().length) { <button mat-button type="button" (click)="filters.set([])">Clear all</button> }
      </div>
    </section>

    <ng-template #dates let-row="row" let-i="i">
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="c-val">
        <mat-label>Date</mat-label>
        <input matInput type="date" [value]="row.value ?? ''" (input)="patch(i, { value: text($event) })" />
      </mat-form-field>
      @if (row.op === 'between') {
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="c-val">
          <mat-label>and</mat-label>
          <input matInput type="date" [value]="row.value2 ?? ''" (input)="patch(i, { value2: text($event) })" />
        </mat-form-field>
      }
    </ng-template>

    <ng-template #choice let-row="row" let-i="i">
      @let f = fieldOf(row);
      @if (f && (f.type === 'reference' || f.type === 'multiReference') && f.config.targetCollectionId) {
        <div class="c-val ref">
          <app-reference-selector [collectionId]="f.config.targetCollectionId" label="Record"
                                  [value]="$any(row.value ?? null)" (valueChange)="patch(i, { value: $event })" />
        </div>
      } @else if (f) {
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="c-val">
          <mat-label>Option</mat-label>
          <mat-select [value]="row.value" (selectionChange)="patch(i, { value: $event.value })">
            @for (o of f.config.options ?? []; track o) { <mat-option [value]="o">{{ o }}</mat-option> }
          </mat-select>
        </mat-form-field>
      }
    </ng-template>
  `,
  styles: `
    .panel { margin: 12px 0 16px; }
    .filter-row { display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
    .c-field { width: 200px; } .c-op { width: 190px; } .c-val { width: 200px; } .ref { width: 280px; }
  `,
})
export class FilterPanel {
  readonly fields = input.required<Field[]>();
  readonly filters = model<FilterDraft[]>([]);
  private readonly catalog = inject(FieldTypeCatalog);

  protected fieldOf(row: FilterDraft): Field | undefined { return this.fields().find((f) => f.id === row.fieldId); }
  protected kind(row: FilterDraft): ValueKind | undefined {
    const f = this.fieldOf(row);
    return f ? this.catalog.kind(f.type) : undefined;
  }
  protected operators(row: FilterDraft): FilterOperator[] {
    const f = this.fieldOf(row);
    return f ? this.catalog.operators(f.type) : [];
  }
  protected opLabel(op: FilterOperator): string { return OP_LABELS[op]; }
  protected noOperand(op: FilterOperator): boolean { return NO_OPERAND.includes(op); }
  protected text(e: Event): string { return (e.target as HTMLInputElement).value; }

  protected add(): void {
    const first = this.fields()[0];
    const op = first ? this.catalog.operators(first.type)[0] ?? null : null;
    this.filters.update((l) => [...l, newFilter(first?.id ?? null, op)]);
  }

  protected remove(i: number): void { this.filters.update((l) => l.filter((_, idx) => idx !== i)); }

  protected patch(i: number, p: Partial<FilterDraft>): void {
    this.filters.update((l) => l.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
  }

  protected setField(i: number, fieldId: string): void {
    const f = this.fields().find((x) => x.id === fieldId);
    this.patch(i, { fieldId, op: f ? this.catalog.operators(f.type)[0] ?? null : null, value: null, value2: null });
  }
}
