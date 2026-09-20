import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FieldTypeCatalog } from '../../core/field-types.service';
import { AGG_LABELS, CURRENCIES, TYPE_ICONS, TYPE_LABELS, defaultConfig } from '../../core/labels';
import { AggregationType, CollectionSummary, FieldConfig, FieldType } from '../../core/models';
import { FieldDraft } from './field-draft';

@Component({
  selector: 'app-field-editor',
  imports: [NgTemplateOutlet, CdkDragHandle, MatExpansionModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule, MatButtonModule, MatIconModule],
  template: `
    <mat-expansion-panel [expanded]="isNew()" class="panel">
      <mat-expansion-panel-header>
        <mat-panel-title>
          <button cdkDragHandle type="button" class="handle" mat-icon-button aria-label="Drag to reorder" (click)="$event.stopPropagation()">
            <mat-icon>drag_indicator</mat-icon>
          </button>
          <mat-icon class="type-icon">{{ icon(field().type) }}</mat-icon>
          <span class="name">{{ field().name || 'Untitled field' }}</span>
        </mat-panel-title>
        <mat-panel-description>
          {{ label(field().type) }}
          @if (field().required) { <span class="badge">required</span> }
          @if (field().isTitle) { <span class="badge">title</span> }
        </mat-panel-description>
      </mat-expansion-panel-header>

      <div class="grid">
        <mat-form-field appearance="outline">
          <mat-label>Field name</mat-label>
          <input matInput maxlength="80" [value]="field().name" (input)="patch({ name: text($event) })" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Type</mat-label>
          <mat-select [value]="field().type" (selectionChange)="changeType($event.value)">
            @for (t of typeChoices(); track t) { <mat-option [value]="t">{{ label(t) }}</mat-option> }
          </mat-select>
          @if (!isNew() && typeChoices().length === 1) { <mat-hint>This type cannot be changed safely. Add a new field instead.</mat-hint> }
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Help text (optional)</mat-label>
        <input matInput maxlength="300" [value]="field().description" (input)="patch({ description: text($event) })" />
      </mat-form-field>

      @switch (field().type) {
        @case ('select') { <ng-container *ngTemplateOutlet="optionsTpl" /> }
        @case ('multiSelect') { <ng-container *ngTemplateOutlet="optionsTpl" /> }
        @case ('reference') { <ng-container *ngTemplateOutlet="targetTpl" /> }
        @case ('multiReference') { <ng-container *ngTemplateOutlet="targetTpl" /> }
        @case ('currency') {
          <div class="grid">
            <mat-form-field appearance="outline">
              <mat-label>Currency</mat-label>
              <mat-select [value]="field().config.currency ?? 'INR'" (selectionChange)="patchConfig({ currency: $event.value })">
                @for (c of currencies; track c) { <mat-option [value]="c">{{ c }}</mat-option> }
              </mat-select>
            </mat-form-field>
          </div>
          <ng-container *ngTemplateOutlet="rangeTpl" />
        }
        @case ('number') { <ng-container *ngTemplateOutlet="rangeTpl" /> }
        @case ('rating') {
          <mat-form-field appearance="outline">
            <mat-label>Scale</mat-label>
            <mat-select [value]="field().config.max ?? 5" (selectionChange)="patchConfig({ max: $event.value })">
              @for (n of scale; track n) { <mat-option [value]="n">1 – {{ n }}</mat-option> }
            </mat-select>
          </mat-form-field>
        }
      }

      <div class="toggles">
        @if (field().type !== 'boolean') {
          <mat-slide-toggle [checked]="field().required" (change)="patch({ required: $event.checked })">Required</mat-slide-toggle>
        }
        <mat-slide-toggle [checked]="field().showInList" (change)="patch({ showInList: $event.checked })">Show as a table column</mat-slide-toggle>
        <mat-slide-toggle [checked]="field().isTitle" (change)="patch({ isTitle: $event.checked })">Use as the record title</mat-slide-toggle>
      </div>

      <mat-form-field appearance="outline" class="agg">
        <mat-label>Summary calculation</mat-label>
        <mat-select [value]="field().aggregation" (selectionChange)="patch({ aggregation: $event.value })">
          <mat-option value="none">None</mat-option>
          @for (a of aggregations(); track a) { <mat-option [value]="a">{{ aggLabel(a) }}</mat-option> }
        </mat-select>
        <mat-hint>Shown in the summary and the table footer.</mat-hint>
      </mat-form-field>

      <mat-action-row>
        <button mat-button type="button" [disabled]="index() === 0" (click)="moveUp.emit()"><mat-icon>arrow_upward</mat-icon> Up</button>
        <button mat-button type="button" [disabled]="index() === count() - 1" (click)="moveDown.emit()"><mat-icon>arrow_downward</mat-icon> Down</button>
        <span class="spacer"></span>
        <button mat-button type="button" class="danger" (click)="removed.emit()"><mat-icon>delete</mat-icon> Remove</button>
      </mat-action-row>
    </mat-expansion-panel>

    <ng-template #optionsTpl>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Options (one per line)</mat-label>
        <textarea matInput rows="4" [value]="optionsText()" (input)="onOptions($event)"></textarea>
        <mat-hint>Removing an option later keeps it on records that already use it.</mat-hint>
      </mat-form-field>
    </ng-template>

    <ng-template #targetTpl>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Points to collection</mat-label>
        <mat-select [value]="field().config.targetCollectionId ?? null" [disabled]="!isNew()"
                    (selectionChange)="patchConfig({ targetCollectionId: $event.value })">
          @for (c of collections(); track c.id) { <mat-option [value]="c.id">{{ c.icon }} {{ c.name }}</mat-option> }
        </mat-select>
        @if (!isNew()) { <mat-hint>The target of an existing reference cannot change.</mat-hint> }
        @else if (collections().length === 0) { <mat-hint>Create the collection you want to reference first.</mat-hint> }
      </mat-form-field>
    </ng-template>

    <ng-template #rangeTpl>
      <div class="grid">
        <mat-form-field appearance="outline">
          <mat-label>Minimum (optional)</mat-label>
          <input matInput type="number" [value]="field().config.min ?? ''" (input)="patchConfig({ min: num($event) })" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Maximum (optional)</mat-label>
          <input matInput type="number" [value]="field().config.max ?? ''" (input)="patchConfig({ max: num($event) })" />
        </mat-form-field>
      </div>
    </ng-template>
  `,
  styles: `
    .panel { margin-bottom: 10px; }
    .handle { cursor: grab; margin-left: -8px; }
    .type-icon { margin-right: 8px; color: var(--mat-sys-primary); }
    .name { font-weight: 600; }
    .badge { margin-left: 8px; padding: 1px 8px; border-radius: 999px; font-size: .75rem; background: var(--mat-sys-tertiary-container); color: var(--mat-sys-on-tertiary-container); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0 16px; padding-top: 8px; }
    .toggles { display: flex; flex-wrap: wrap; gap: 8px 24px; margin: 4px 0 16px; }
    .agg { width: min(320px, 100%); }
    .danger { color: var(--mat-sys-error); }
    .spacer { flex: 1; }
  `,
  host: { style: 'display:block' },
})
export class FieldEditor {
  readonly field = model.required<FieldDraft>();
  readonly collections = input.required<CollectionSummary[]>();
  readonly index = input.required<number>();
  readonly count = input.required<number>();
  readonly removed = output<void>();
  readonly moveUp = output<void>();
  readonly moveDown = output<void>();

  private readonly catalog = inject(FieldTypeCatalog);
  protected readonly currencies = CURRENCIES;
  protected readonly scale = [3, 4, 5, 6, 7, 8, 9, 10];
  protected readonly optionsText = signal('');
  private seeded = false;

  protected readonly isNew = computed(() => !this.field().id);
  protected readonly aggregations = computed<AggregationType[]>(() =>
    this.catalog.aggregations(this.field().type).filter((a) => a !== 'none'));
  protected readonly typeChoices = computed<FieldType[]>(() => {
    const all = this.catalog.types().map((t) => t.type);
    if (this.isNew()) return all.length ? all : (Object.keys(TYPE_LABELS) as FieldType[]);
    const original = this.field().originalType ?? this.field().type;
    return [original, ...this.catalog.convertibleTo(original)];
  });

  constructor() {
    effect(() => {
      const f = this.field();
      if (this.seeded) return;
      this.seeded = true;
      this.optionsText.set((f.config.options ?? []).join('\n'));
    });
  }

  protected icon(t: FieldType): string { return TYPE_ICONS[t]; }
  protected label(t: FieldType): string { return this.catalog.info(t)?.label ?? TYPE_LABELS[t]; }
  protected aggLabel(a: AggregationType): string { return AGG_LABELS[a]; }
  protected text(e: Event): string { return (e.target as HTMLInputElement).value; }
  protected num(e: Event): number | null {
    const v = (e.target as HTMLInputElement).value;
    return v === '' || isNaN(Number(v)) ? null : Number(v);
  }

  protected patch(p: Partial<FieldDraft>): void {
    this.field.update((f) => ({ ...f, ...p }));
  }

  protected patchConfig(p: Partial<FieldConfig>): void {
    this.field.update((f) => ({ ...f, config: { ...f.config, ...p } }));
  }

  protected changeType(type: FieldType): void {
    const supported = this.catalog.aggregations(type);
    const keep = supported.includes(this.field().aggregation) ? this.field().aggregation : 'none';
    this.optionsText.set('');
    this.patch({ type, config: defaultConfig(type), aggregation: keep });
  }

  protected onOptions(e: Event): void {
    const raw = (e.target as HTMLTextAreaElement).value;
    this.optionsText.set(raw);
    this.patchConfig({ options: raw.split('\n').map((s) => s.trim()).filter(Boolean) });
  }
}
