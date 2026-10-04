import { CdkDragHandle } from "@angular/cdk/drag-drop";
import { NgTemplateOutlet } from "@angular/common";
import {
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCollapseModule } from "ng-zorro-antd/collapse";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzSelectModule } from "ng-zorro-antd/select";
import { NzSwitchModule } from "ng-zorro-antd/switch";

import { FieldTypeCatalog } from "../../core/field-types.service";
import {
  AGG_LABELS,
  CURRENCIES,
  TYPE_LABELS,
  defaultConfig,
} from "../../core/labels";
import {
  AggregationType,
  CollectionSummary,
  FieldConfig,
  FieldType,
} from "../../core/models";
import { FieldDraft } from "./field-draft";

@Component({
  selector: "app-field-editor",
  imports: [
    NgTemplateOutlet,
    CdkDragHandle,
    FormsModule,
    NzCollapseModule,
    NzInputModule,
    NzSelectModule,
    NzSwitchModule,
    NzButtonModule,
    NzIconModule,
  ],
  template: `
    <nz-collapse class="panel">
      <nz-collapse-panel
        [nzActive]="isNew()"
        [nzHeader]="headerTpl"
        [nzExtra]="extraTpl"
        [nzShowArrow]="false"
      >
        <ng-template #headerTpl>
          <div class="panel-header-title">
            <button
              cdkDragHandle
              type="button"
              nz-button
              nzType="text"
              nzShape="circle"
              aria-label="Drag to reorder"
              (click)="$event.stopPropagation()"
            >
              <nz-icon nzType="holder" />
            </button>
            <nz-icon class="type-icon" [nzType]="icon(field().type)" />
            <span class="name">{{ field().name || "Untitled field" }}</span>
          </div>
        </ng-template>

        <ng-template #extraTpl>
          <div class="panel-header-desc">
            <span class="type-name">{{ label(field().type) }}</span>
            @if (field().required) {
              <span class="badge">required</span>
            }
            @if (field().isTitle) {
              <span class="badge">title</span>
            }
          </div>
        </ng-template>

        <div class="form-body">
          <div class="grid">
            <div class="form-group">
              <label class="form-label">Field name</label>
              <input
                nz-input
                maxlength="80"
                [value]="field().name"
                (input)="patch({ name: text($event) })"
                placeholder="Field name"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Type</label>
              <nz-select
                class="full"
                [ngModel]="field().type"
                (ngModelChange)="changeType($event)"
              >
                @for (t of typeChoices(); track t) {
                  <nz-option [nzValue]="t" [nzLabel]="label(t)" />
                }
              </nz-select>
              @if (!isNew() && typeChoices().length === 1) {
                <span class="hint"
                  >This type cannot be changed safely. Add a new field
                  instead.</span
                >
              }
            </div>
          </div>

          <div class="form-group full">
            <label class="form-label">Help text (optional)</label>
            <input
              nz-input
              maxlength="300"
              [value]="field().description"
              (input)="patch({ description: text($event) })"
              placeholder="Help text"
            />
          </div>

          @switch (field().type) {
            @case ("select") {
              <ng-container *ngTemplateOutlet="optionsTpl" />
            }
            @case ("multiSelect") {
              <ng-container *ngTemplateOutlet="optionsTpl" />
            }
            @case ("reference") {
              <ng-container *ngTemplateOutlet="targetTpl" />
            }
            @case ("multiReference") {
              <ng-container *ngTemplateOutlet="targetTpl" />
            }
            @case ("currency") {
              <div class="grid">
                <div class="form-group">
                  <label class="form-label">Currency</label>
                  <nz-select
                    class="full"
                    [ngModel]="field().config.currency ?? 'INR'"
                    (ngModelChange)="patchConfig({ currency: $event })"
                  >
                    @for (c of currencies; track c) {
                      <nz-option [nzValue]="c" [nzLabel]="c" />
                    }
                  </nz-select>
                </div>
              </div>
              <ng-container *ngTemplateOutlet="rangeTpl" />
            }
            @case ("number") {
              <ng-container *ngTemplateOutlet="rangeTpl" />
            }
            @case ("rating") {
              <div class="form-group" style="max-width: 240px;">
                <label class="form-label">Scale</label>
                <nz-select
                  class="full"
                  [ngModel]="field().config.max ?? 5"
                  (ngModelChange)="patchConfig({ max: $event })"
                >
                  @for (n of scale; track n) {
                    <nz-option [nzValue]="n" [nzLabel]="'1 – ' + n" />
                  }
                </nz-select>
              </div>
            }
          }

          <div class="toggles">
            @if (field().type !== "boolean") {
              <label class="toggle-item">
                <nz-switch
                  [ngModel]="field().required"
                  (ngModelChange)="patch({ required: $event })"
                />
                <span>Required</span>
              </label>
            }
            <label class="toggle-item">
              <nz-switch
                [ngModel]="field().showInList"
                (ngModelChange)="patch({ showInList: $event })"
              />
              <span>Show as a table column</span>
            </label>
            <label class="toggle-item">
              <nz-switch
                [ngModel]="field().isTitle"
                (ngModelChange)="patch({ isTitle: $event })"
              />
              <span>Use as the record title</span>
            </label>
          </div>

          <div class="form-group agg">
            <label class="form-label">Summary calculation</label>
            <nz-select
              class="full"
              [ngModel]="field().aggregation"
              (ngModelChange)="patch({ aggregation: $event })"
            >
              <nz-option nzValue="none" nzLabel="None" />
              @for (a of aggregations(); track a) {
                <nz-option [nzValue]="a" [nzLabel]="aggLabel(a)" />
              }
            </nz-select>
            <span class="hint">Shown in the summary and the table footer.</span>
          </div>

          <div class="panel-actions">
            <button
              nz-button
              nzType="default"
              type="button"
              [disabled]="index() === 0"
              (click)="moveUp.emit()"
            >
              <nz-icon nzType="arrow-up" /> Up
            </button>
            <button
              nz-button
              nzType="default"
              type="button"
              [disabled]="index() === count() - 1"
              (click)="moveDown.emit()"
            >
              <nz-icon nzType="arrow-down" /> Down
            </button>
            <span class="spacer"></span>
            <button
              nz-button
              nzType="default"
              nzDanger
              type="button"
              (click)="removed.emit()"
            >
              <nz-icon nzType="delete" /> Remove
            </button>
          </div>
        </div>
      </nz-collapse-panel>
    </nz-collapse>

    <ng-template #optionsTpl>
      <div class="form-group full">
        <label class="form-label">Options (one per line)</label>
        <textarea
          nz-input
          rows="4"
          [value]="optionsText()"
          (input)="onOptions($event)"
          placeholder="Option 1&#10;Option 2&#10;Option 3"
        ></textarea>
        <span class="hint"
          >Removing an option later keeps it on records that already use
          it.</span
        >
      </div>
    </ng-template>

    <ng-template #targetTpl>
      <div class="form-group full">
        <label class="form-label">Points to collection</label>
        <nz-select
          class="full"
          [ngModel]="field().config.targetCollectionId ?? null"
          [nzDisabled]="!isNew()"
          (ngModelChange)="patchConfig({ targetCollectionId: $event })"
          nzPlaceHolder="Select collection"
        >
          @for (c of collections(); track c.id) {
            <nz-option [nzValue]="c.id" [nzLabel]="c.icon + ' ' + c.name" />
          }
        </nz-select>
        @if (!isNew()) {
          <span class="hint"
            >The target of an existing reference cannot change.</span
          >
        } @else if (collections().length === 0) {
          <span class="hint"
            >Create the collection you want to reference first.</span
          >
        }
      </div>
    </ng-template>

    <ng-template #rangeTpl>
      <div class="grid">
        <div class="form-group">
          <label class="form-label">Minimum (optional)</label>
          <input
            nz-input
            type="number"
            [value]="field().config.min ?? ''"
            (input)="patchConfig({ min: num($event) })"
            placeholder="Min"
          />
        </div>
        <div class="form-group">
          <label class="form-label">Maximum (optional)</label>
          <input
            nz-input
            type="number"
            [value]="field().config.max ?? ''"
            (input)="patchConfig({ max: num($event) })"
            placeholder="Max"
          />
        </div>
      </div>
    </ng-template>
  `,
  styles: `
    .panel {
      margin-bottom: 12px;
      border-radius: 14px;
      overflow: hidden;
    }
    .panel-header-title {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .type-icon {
      font-size: 16px;
      color: var(--app-primary);
    }
    .name {
      font-weight: 600;
      color: var(--app-text);
    }
    .panel-header-desc {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .type-name {
      color: var(--app-text-muted);
      font-size: 0.85rem;
    }
    .badge {
      padding: 1px 8px;
      border-radius: 999px;
      font-size: 0.75rem;
      background: var(--app-primary-container);
      color: var(--app-on-primary-container);
    }
    .form-body {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding-top: 4px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-label {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--app-text);
    }
    .hint {
      font-size: 0.785rem;
      color: var(--app-text-muted);
    }
    .full {
      width: 100%;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px 16px;
    }
    .toggles {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 24px;
      margin: 4px 0 6px;
    }
    .toggle-item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      cursor: pointer;
    }
    .agg {
      width: min(320px, 100%);
    }
    .panel-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-top: 14px;
      border-top: 1px solid var(--app-outline-variant);
    }
    .spacer {
      flex: 1;
    }
  `,
  host: { style: "display:block" },
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
  protected readonly optionsText = signal("");
  private seeded = false;

  protected readonly isNew = computed(() => !this.field().id);
  protected readonly aggregations = computed<AggregationType[]>(() =>
    this.catalog.aggregations(this.field().type).filter((a) => a !== "none"),
  );
  protected readonly typeChoices = computed<FieldType[]>(() => {
    const all = this.catalog.types().map((t) => t.type);
    if (this.isNew())
      return all.length ? all : (Object.keys(TYPE_LABELS) as FieldType[]);
    const original = this.field().originalType ?? this.field().type;
    return [original, ...this.catalog.convertibleTo(original)];
  });

  constructor() {
    effect(() => {
      const f = this.field();
      if (this.seeded) return;
      this.seeded = true;
      this.optionsText.set((f.config.options ?? []).join("\n"));
    });
  }

  protected icon(t: FieldType): string {
    const map: Record<FieldType, string> = {
      text: "font-size",
      longText: "file-text",
      number: "number",
      currency: "dollar",
      date: "calendar",
      dateTime: "clock-circle",
      boolean: "check-square",
      select: "down-circle",
      multiSelect: "unordered-list",
      rating: "star",
      reference: "link",
      multiReference: "share-alt",
      url: "global",
    };
    return map[t] || "file";
  }

  protected label(t: FieldType): string {
    return this.catalog.info(t)?.label ?? TYPE_LABELS[t];
  }
  protected aggLabel(a: AggregationType): string {
    return AGG_LABELS[a];
  }
  protected text(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }
  protected num(e: Event): number | null {
    const v = (e.target as HTMLInputElement).value;
    return v === "" || isNaN(Number(v)) ? null : Number(v);
  }

  protected patch(p: Partial<FieldDraft>): void {
    this.field.update((f) => ({ ...f, ...p }));
  }

  protected patchConfig(p: Partial<FieldConfig>): void {
    this.field.update((f) => ({ ...f, config: { ...f.config, ...p } }));
  }

  protected changeType(type: FieldType): void {
    const supported = this.catalog.aggregations(type);
    const keep = supported.includes(this.field().aggregation)
      ? this.field().aggregation
      : "none";
    this.optionsText.set("");
    this.patch({ type, config: defaultConfig(type), aggregation: keep });
  }

  protected onOptions(e: Event): void {
    const raw = (e.target as HTMLTextAreaElement).value;
    this.optionsText.set(raw);
    this.patchConfig({
      options: raw
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }
}
