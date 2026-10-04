import { NgTemplateOutlet } from "@angular/common";
import { Component, computed, input, model } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NzDatePickerModule } from "ng-zorro-antd/date-picker";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzSelectModule } from "ng-zorro-antd/select";
import { NzSwitchModule } from "ng-zorro-antd/switch";
import {
  currencySymbol,
  fromLocalInput,
  parseIsoDate,
  toIsoDate,
  toLocalInput,
} from "../../core/format";
import { Field, FieldType, RecordReference } from "../../core/models";
import { RatingInput } from "../../shared/rating-input";
import { ReferenceSelector } from "../../shared/reference-selector";

@Component({
  selector: "app-dynamic-field",
  imports: [
    NgTemplateOutlet,
    FormsModule,
    NzInputModule,
    NzSelectModule,
    NzSwitchModule,
    NzDatePickerModule,
    NzIconModule,
    RatingInput,
    ReferenceSelector,
  ],
  template: `
    <div class="wrap">
      @switch (field().type) {
        @case ("text") {
          <div class="field-item">
            <label class="field-label">
              <nz-icon [nzType]="typeIcon(field().type)" class="type-icon" />
              <span>{{ label() }}</span>
            </label>
            <input
              nz-input
              maxlength="500"
              [value]="str()"
              (input)="setText($event)"
              [placeholder]="field().name"
            />
            @if (field().description) {
              <span class="muted hint">{{ field().description }}</span>
            }
          </div>
        }
        @case ("url") {
          <div class="field-item">
            <label class="field-label">
              <nz-icon [nzType]="typeIcon(field().type)" class="type-icon" />
              <span>{{ label() }}</span>
            </label>
            <input
              nz-input
              type="url"
              inputmode="url"
              placeholder="https://"
              [value]="str()"
              (input)="setText($event)"
            />
            @if (field().description) {
              <span class="muted hint">{{ field().description }}</span>
            }
          </div>
        }
        @case ("longText") {
          <div class="field-item">
            <label class="field-label">
              <nz-icon [nzType]="typeIcon(field().type)" class="type-icon" />
              <span>{{ label() }}</span>
            </label>
            <textarea
              nz-input
              rows="4"
              maxlength="20000"
              [value]="str()"
              (input)="setText($event)"
              [placeholder]="field().name"
            ></textarea>
            @if (field().description) {
              <span class="muted hint">{{ field().description }}</span>
            }
          </div>
        }
        @case ("number") {
          <div class="field-item">
            <label class="field-label">
              <nz-icon [nzType]="typeIcon(field().type)" class="type-icon" />
              <span>{{ label() }}</span>
            </label>
            <input
              nz-input
              type="number"
              step="any"
              [attr.min]="field().config.min ?? null"
              [attr.max]="field().config.max ?? null"
              [value]="numStr()"
              (input)="setNumber($event)"
              [placeholder]="field().name"
            />
            @if (field().description) {
              <span class="muted hint">{{ field().description }}</span>
            }
          </div>
        }
        @case ("currency") {
          <div class="field-item">
            <label class="field-label">
              <nz-icon [nzType]="typeIcon(field().type)" class="type-icon" />
              <span>{{ label() }}</span>
            </label>
            <nz-input-wrapper [nzPrefix]="symbol()">
              <input
                nz-input
                type="number"
                step="0.01"
                [attr.min]="field().config.min ?? null"
                [attr.max]="field().config.max ?? null"
                [value]="numStr()"
                (input)="setNumber($event)"
                [placeholder]="field().name"
              />
            </nz-input-wrapper>
            @if (field().description) {
              <span class="muted hint">{{ field().description }}</span>
            }
          </div>
        }
        @case ("date") {
          <div class="field-item">
            <label class="field-label">
              <nz-icon [nzType]="typeIcon(field().type)" class="type-icon" />
              <span>{{ label() }}</span>
            </label>
            <nz-date-picker
              class="full"
              [ngModel]="dateValue()"
              [ngModelOptions]="{ standalone: true }"
              (ngModelChange)="setDate($event)"
              [nzPlaceHolder]="field().name"
            />
            @if (field().description) {
              <span class="muted hint">{{ field().description }}</span>
            }
          </div>
        }
        @case ("dateTime") {
          <div class="field-item">
            <label class="field-label">
              <nz-icon [nzType]="typeIcon(field().type)" class="type-icon" />
              <span>{{ label() }}</span>
            </label>
            <input
              nz-input
              type="datetime-local"
              class="full"
              [value]="localValue()"
              (input)="setLocal($event)"
            />
            @if (field().description) {
              <span class="muted hint">{{ field().description }}</span>
            }
          </div>
        }
        @case ("boolean") {
          <div class="toggle">
            <div class="toggle-row">
              <nz-switch
                [ngModel]="value() === true"
                [ngModelOptions]="{ standalone: true }"
                (ngModelChange)="value.set($event)"
              />
              <span class="toggle-label">
                <nz-icon [nzType]="typeIcon(field().type)" class="type-icon" />
                <span>{{ label() }}</span>
              </span>
            </div>
            @if (field().description) {
              <span class="muted hint">{{ field().description }}</span>
            }
          </div>
        }
        @case ("select") {
          <div class="field-item">
            <label class="field-label">
              <nz-icon [nzType]="typeIcon(field().type)" class="type-icon" />
              <span>{{ label() }}</span>
            </label>
            <nz-select
              class="full"
              [ngModel]="value() ?? null"
              [ngModelOptions]="{ standalone: true }"
              (ngModelChange)="value.set($event)"
              [nzAllowClear]="!field().required"
              [nzPlaceHolder]="field().name"
            >
              @if (!field().required) {
                <nz-option [nzValue]="null" nzLabel="—" />
              }
              @for (o of options(); track o) {
                <nz-option [nzValue]="o" [nzLabel]="o" />
              }
            </nz-select>
            @if (field().description) {
              <span class="muted hint">{{ field().description }}</span>
            }
          </div>
        }
        @case ("multiSelect") {
          <div class="field-item">
            <label class="field-label">
              <nz-icon [nzType]="typeIcon(field().type)" class="type-icon" />
              <span>{{ label() }}</span>
            </label>
            <nz-select
              nzMode="multiple"
              class="full"
              [ngModel]="list()"
              [ngModelOptions]="{ standalone: true }"
              (ngModelChange)="value.set($event)"
              [nzPlaceHolder]="field().name"
            >
              @for (o of options(); track o) {
                <nz-option [nzValue]="o" [nzLabel]="o" />
              }
            </nz-select>
            @if (field().description) {
              <span class="muted hint">{{ field().description }}</span>
            }
          </div>
        }
        @case ("rating") {
          <div class="rating">
            <span class="field-label">
              <nz-icon [nzType]="typeIcon(field().type)" class="type-icon" />
              <span>{{ label() }}</span>
            </span>
            <app-rating-input
              [max]="field().config.max ?? 5"
              [label]="field().name"
              [value]="rating()"
              (valueChange)="value.set($event)"
            />
            @if (field().description) {
              <span class="muted hint">{{ field().description }}</span>
            }
          </div>
        }
        @case ("reference") {
          <ng-container *ngTemplateOutlet="ref" />
        }
        @case ("multiReference") {
          <ng-container *ngTemplateOutlet="ref" />
        }
      }
      @if (error(); as msg) {
        <p class="field-error" role="alert">{{ msg }}</p>
      }
    </div>

    <ng-template #ref>
      @if (target(); as t) {
        <app-reference-selector
          [collectionId]="t"
          [multiple]="field().type === 'multiReference'"
          [label]="label()"
          [value]="refValue()"
          (valueChange)="value.set($event)"
          [knownLabels]="references()"
        />
      }
    </ng-template>
  `,
  styles: `
    .wrap {
      margin-bottom: 12px;
    }
    .field-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .field-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--app-text);
    }
    .full {
      width: 100%;
    }
    .toggle {
      padding: 6px 0 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .toggle-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .rating {
      padding: 4px 0 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .hint {
      font-size: 0.8rem;
      color: var(--app-text-muted);
    }
    .type-icon {
      font-size: 15px;
      color: var(--app-primary);
      opacity: 0.85;
      flex: none;
    }
    .toggle-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .field-error {
      margin: 4px 0 0;
      font-size: 0.8rem;
      color: var(--app-error, #ff4d4f);
    }
  `,
})
export class DynamicField {
  readonly field = input.required<Field>();
  readonly value = model<unknown>(null);
  readonly error = input<string | null>(null);
  readonly references = input<Record<string, RecordReference>>({});

  protected readonly label = computed(
    () => this.field().name + (this.field().required ? " *" : ""),
  );
  protected readonly options = computed(
    () => this.field().config.options ?? [],
  );
  protected readonly target = computed(
    () => this.field().config.targetCollectionId ?? null,
  );
  protected readonly symbol = computed(() =>
    currencySymbol(this.field().config.currency ?? "USD"),
  );

  protected readonly str = computed(() =>
    typeof this.value() === "string" ? (this.value() as string) : "",
  );
  protected readonly numStr = computed(() =>
    typeof this.value() === "number" ? String(this.value()) : "",
  );
  protected readonly list = computed(() =>
    Array.isArray(this.value()) ? (this.value() as string[]) : [],
  );
  protected readonly rating = computed(() =>
    typeof this.value() === "number" ? (this.value() as number) : null,
  );
  protected readonly refValue = computed(
    () => (this.value() ?? null) as string | string[] | null,
  );
  protected readonly dateValue = computed(() => {
    const v = this.value();
    return typeof v === "string" && v ? parseIsoDate(v) : null;
  });
  protected readonly localValue = computed(() => {
    const v = this.value();
    return typeof v === "string" && v ? toLocalInput(v) : "";
  });

  protected typeIcon(type: FieldType): string {
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
    return map[type] || "file";
  }

  protected setText(e: Event): void {
    this.value.set((e.target as HTMLInputElement).value);
  }

  protected setNumber(e: Event): void {
    const raw = (e.target as HTMLInputElement).value;
    const n = Number(raw);
    this.value.set(raw === "" || isNaN(n) ? null : n);
  }

  protected setDate(date: Date | null): void {
    this.value.set(date ? toIsoDate(date) : null);
  }

  protected setLocal(e: Event): void {
    this.value.set(fromLocalInput((e.target as HTMLInputElement).value));
  }
}
