import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, model } from '@angular/core';
import { MatDatepickerInputEvent, MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { currencySymbol, fromLocalInput, parseIsoDate, toIsoDate, toLocalInput } from '../../core/format';
import { Field, RecordReference } from '../../core/models';
import { RatingInput } from '../../shared/rating-input';
import { ReferenceSelector } from '../../shared/reference-selector';

/** Renders the right control for ONE field. The whole form engine is this component plus DynamicForm. */
@Component({
  selector: 'app-dynamic-field',
  imports: [NgTemplateOutlet, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule, MatDatepickerModule, RatingInput, ReferenceSelector],
  template: `
    <div class="wrap">
      @switch (field().type) {
        @case ('text') {
          <mat-form-field appearance="outline" class="full"><mat-label>{{ label() }}</mat-label>
            <input matInput maxlength="500" [value]="str()" (input)="setText($event)" />
            @if (field().description) { <mat-hint>{{ field().description }}</mat-hint> }</mat-form-field>
        }
        @case ('url') {
          <mat-form-field appearance="outline" class="full"><mat-label>{{ label() }}</mat-label>
            <input matInput type="url" inputmode="url" placeholder="https://" [value]="str()" (input)="setText($event)" />
            @if (field().description) { <mat-hint>{{ field().description }}</mat-hint> }</mat-form-field>
        }
        @case ('longText') {
          <mat-form-field appearance="outline" class="full"><mat-label>{{ label() }}</mat-label>
            <textarea matInput rows="4" maxlength="20000" [value]="str()" (input)="setText($event)"></textarea>
            @if (field().description) { <mat-hint>{{ field().description }}</mat-hint> }</mat-form-field>
        }
        @case ('number') {
          <mat-form-field appearance="outline" class="full"><mat-label>{{ label() }}</mat-label>
            <input matInput type="number" step="any" [attr.min]="field().config.min ?? null" [attr.max]="field().config.max ?? null"
                   [value]="numStr()" (input)="setNumber($event)" />
            @if (field().description) { <mat-hint>{{ field().description }}</mat-hint> }</mat-form-field>
        }
        @case ('currency') {
          <mat-form-field appearance="outline" class="full"><mat-label>{{ label() }}</mat-label>
            <span matTextPrefix>{{ symbol() }}&nbsp;</span>
            <input matInput type="number" step="0.01" [attr.min]="field().config.min ?? null" [attr.max]="field().config.max ?? null"
                   [value]="numStr()" (input)="setNumber($event)" />
            @if (field().description) { <mat-hint>{{ field().description }}</mat-hint> }</mat-form-field>
        }
        @case ('date') {
          <mat-form-field appearance="outline" class="full"><mat-label>{{ label() }}</mat-label>
            <input matInput [matDatepicker]="dp" [value]="dateValue()" (dateChange)="setDate($event)" />
            <mat-datepicker-toggle matIconSuffix [for]="dp" />
            <mat-datepicker #dp />
            @if (field().description) { <mat-hint>{{ field().description }}</mat-hint> }</mat-form-field>
        }
        @case ('dateTime') {
          <mat-form-field appearance="outline" class="full"><mat-label>{{ label() }}</mat-label>
            <input matInput type="datetime-local" [value]="localValue()" (input)="setLocal($event)" />
            @if (field().description) { <mat-hint>{{ field().description }}</mat-hint> }</mat-form-field>
        }
        @case ('boolean') {
          <div class="toggle"><mat-slide-toggle [checked]="value() === true" (change)="value.set($event.checked)">{{ field().name }}</mat-slide-toggle>
            @if (field().description) { <span class="muted hint">{{ field().description }}</span> }</div>
        }
        @case ('select') {
          <mat-form-field appearance="outline" class="full"><mat-label>{{ label() }}</mat-label>
            <mat-select [value]="value() ?? null" (selectionChange)="value.set($event.value)">
              @if (!field().required) { <mat-option [value]="null">—</mat-option> }
              @for (o of options(); track o) { <mat-option [value]="o">{{ o }}</mat-option> }
            </mat-select>
            @if (field().description) { <mat-hint>{{ field().description }}</mat-hint> }</mat-form-field>
        }
        @case ('multiSelect') {
          <mat-form-field appearance="outline" class="full"><mat-label>{{ label() }}</mat-label>
            <mat-select multiple [value]="list()" (selectionChange)="value.set($event.value)">
              @for (o of options(); track o) { <mat-option [value]="o">{{ o }}</mat-option> }
            </mat-select>
            @if (field().description) { <mat-hint>{{ field().description }}</mat-hint> }</mat-form-field>
        }
        @case ('rating') {
          <div class="rating"><span class="lbl">{{ label() }}</span>
            <app-rating-input [max]="field().config.max ?? 5" [label]="field().name" [value]="rating()" (valueChange)="value.set($event)" />
            @if (field().description) { <span class="muted hint">{{ field().description }}</span> }</div>
        }
        @case ('reference') { <ng-container *ngTemplateOutlet="ref" /> }
        @case ('multiReference') { <ng-container *ngTemplateOutlet="ref" /> }
      }
      @if (error(); as msg) { <p class="field-error" role="alert">{{ msg }}</p> }
    </div>

    <ng-template #ref>
      @if (target(); as t) {
        <app-reference-selector [collectionId]="t" [multiple]="field().type === 'multiReference'" [label]="label()"
                                [value]="refValue()" (valueChange)="value.set($event)" [knownLabels]="references()" />
      }
    </ng-template>
  `,
  styles: `
    .wrap { margin-bottom: 4px; }
    .toggle, .rating { padding: 4px 4px 16px; display: flex; flex-direction: column; gap: 4px; }
    .lbl { font-size: .85rem; color: var(--mat-sys-on-surface-variant); }
    .hint { font-size: .8rem; }
  `,
})
export class DynamicField {
  readonly field = input.required<Field>();
  readonly value = model<unknown>(null);
  readonly error = input<string | null>(null);
  readonly references = input<Record<string, RecordReference>>({});

  protected readonly label = computed(() => this.field().name + (this.field().required ? ' *' : ''));
  protected readonly options = computed(() => this.field().config.options ?? []);
  protected readonly target = computed(() => this.field().config.targetCollectionId ?? null);
  protected readonly symbol = computed(() => currencySymbol(this.field().config.currency ?? 'USD'));

  protected readonly str = computed(() => (typeof this.value() === 'string' ? (this.value() as string) : ''));
  protected readonly numStr = computed(() => (typeof this.value() === 'number' ? String(this.value()) : ''));
  protected readonly list = computed(() => (Array.isArray(this.value()) ? (this.value() as string[]) : []));
  protected readonly rating = computed(() => (typeof this.value() === 'number' ? (this.value() as number) : null));
  protected readonly refValue = computed(() => (this.value() ?? null) as string | string[] | null);
  protected readonly dateValue = computed(() => {
    const v = this.value();
    return typeof v === 'string' && v ? parseIsoDate(v) : null;
  });
  protected readonly localValue = computed(() => {
    const v = this.value();
    return typeof v === 'string' && v ? toLocalInput(v) : '';
  });

  protected setText(e: Event): void { this.value.set((e.target as HTMLInputElement).value); }

  protected setNumber(e: Event): void {
    const raw = (e.target as HTMLInputElement).value;
    const n = Number(raw);
    this.value.set(raw === '' || isNaN(n) ? null : n);
  }

  protected setDate(e: MatDatepickerInputEvent<Date>): void {
    this.value.set(e.value ? toIsoDate(e.value) : null);
  }

  protected setLocal(e: Event): void {
    this.value.set(fromLocalInput((e.target as HTMLInputElement).value));
  }
}
