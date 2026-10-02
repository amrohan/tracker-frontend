import { NgTemplateOutlet } from "@angular/common";
import { Component, inject, input, model } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { NzButtonModule } from "ng-zorro-antd/button";
import { NzDatePickerModule } from "ng-zorro-antd/date-picker";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzSelectModule } from "ng-zorro-antd/select";

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
    ReferenceSelector,
  ],
  template: `
    <section
      class="
        my-3 mb-4
        rounded-2xl
        border border-[var(--app-outline-variant,#e0e2ec)]
        bg-[var(--app-surface,#fff)]
        p-3.5 sm:p-5
        shadow-sm
      "
      aria-label="Filters"
    >
      <!-- Header -->
      <div
        class="
          flex items-start justify-between gap-3
          border-b border-[var(--app-outline-variant,#e0e2ec)]
          pb-3.5 sm:pb-4
        "
      >
        <div class="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
          <!-- Icon -->
          <span
            class="
              grid size-9 shrink-0 place-items-center
              rounded-xl
              bg-[var(--app-primary-container,#eaddff)]
              text-[var(--app-on-primary-container,#21005d)]
              text-lg sm:size-[42px] sm:text-xl
            "
            aria-hidden="true"
          >
            <nz-icon nzType="control" />
          </span>

          <!-- Title -->
          <div class="min-w-0">
            <h3
              class="
                m-0
                text-[0.95rem] font-bold leading-tight
                text-[var(--app-text,#1d1b20)]
                sm:text-[1.05rem]
              "
            >
              Filters
            </h3>

            <p
              class="
                mt-1 hidden
                text-xs leading-snug
                text-[var(--app-text-muted,#49454f)]
                sm:block sm:text-[0.8125rem]
              "
            >
              Narrow down the records you want to see.
            </p>
          </div>
        </div>

        <!-- Filter count -->
        @if (filters().length) {
          <span
            class="
              inline-flex min-h-7 shrink-0 items-center
              rounded-full
              bg-[var(--app-surface-container-high,#e8def8)]
              px-2.5 sm:px-3
              text-[0.6875rem] sm:text-xs
              font-bold tracking-wide
              text-[var(--app-text,#1d192b)]
            "
          >
            {{ filters().length }}
            {{ filters().length === 1 ? "filter" : "filters" }}
          </span>
        }
      </div>

      <!-- Filter List -->
      @if (filters().length) {
        <div class="flex flex-col gap-2.5 py-4 pb-1.5">
          @for (row of filters(); track row.id; let i = $index) {
            <div
              class="
                group
                grid min-w-0
                grid-cols-[1fr_auto]
                gap-2.5
                rounded-xl
                border border-[var(--app-outline-variant,#e0e2ec)]
                bg-[var(--app-surface,#fff)]
                p-3
                transition-all duration-150

                hover:border-[color-mix(in_srgb,var(--app-primary,#6750a4)_40%,var(--app-outline-variant,#e0e2ec))]
                hover:bg-[var(--app-surface-container-lowest,#fdfbff)]

                focus-within:border-[var(--app-primary,#6750a4)]
                focus-within:shadow-[0_0_0_1px_var(--app-primary,#6750a4),0_2px_8px_rgba(0,0,0,0.05)]

                sm:flex sm:flex-wrap sm:items-center
                sm:gap-2.5
                sm:p-2.5 sm:px-3.5
              "
            >
              <!-- Logic condition -->
              <div
                class="
                  flex h-7 w-fit
                  items-center gap-1.5
                  rounded-lg
                  bg-[var(--app-surface-container-high,#ece6f0)]
                  px-2.5
                  select-none
                  sm:h-8
                "
                aria-hidden="true"
              >
                <span
                  class="
                    text-[0.625rem] font-bold uppercase tracking-wider
                    text-[var(--app-primary,#6750a4)]
                    sm:text-[0.6875rem]
                  "
                >
                  {{ i === 0 ? "Where" : "And" }}
                </span>

                <span
                  class="
                    inline-flex size-[18px]
                    items-center justify-center
                    rounded-full
                    text-[0.625rem] font-semibold
                    opacity-75
                  "
                >
                  #{{ i + 1 }}
                </span>
              </div>

              <!-- Remove -->
              <button
                nz-button
                nzType="text"
                nzShape="circle"
                type="button"
                class="
                  !m-0
                  !flex !size-8
                  shrink-0
                  items-center justify-center
                  self-start
                  text-[var(--app-text-muted,#49454f)]
                  hover:!bg-[var(--app-error-container,#ffdad6)]
                  hover:!text-[var(--app-error,#ba1a1a)]
                  sm:order-last
                  sm:ml-auto
                "
                (click)="remove(i)"
                [attr.aria-label]="'Remove filter ' + (i + 1)"
                [title]="'Remove filter ' + (i + 1)"
              >
                <nz-icon nzType="close" />
              </button>

              <!-- Field -->
              <div
                class="
                  col-span-2
                  min-w-0 w-full

                  sm:order-none
                  sm:flex-[1_1_200px]
                  sm:min-w-[180px]
                  sm:w-auto
                "
              >
                <nz-select
                  [ngModel]="row.fieldId"
                  (ngModelChange)="setField(i, $event)"
                  nzPlaceHolder="Field"
                  class="w-full"
                >
                  @for (f of fields(); track f.id) {
                    <nz-option [nzValue]="f.id" [nzLabel]="f.name" />
                  }
                </nz-select>
              </div>

              <!-- Operator -->
              <div
                class="
                  col-span-2
                  min-w-0 w-full

                  sm:order-none
                  sm:flex-[0.9_1_180px]
                  sm:min-w-[160px]
                  sm:w-auto
                "
              >
                <nz-select
                  [ngModel]="row.op"
                  (ngModelChange)="patch(i, { op: $event })"
                  nzPlaceHolder="Condition"
                  class="w-full"
                >
                  @for (op of operators(row); track op) {
                    <nz-option [nzValue]="op" [nzLabel]="opLabel(op)" />
                  }
                </nz-select>
              </div>

              <!-- Dynamic Value -->
              @if (row.op && !noOperand(row.op)) {
                @switch (kind(row)) {
                  <!-- Number -->
                  @case ("number") {
                    <div
                      class="
                        col-span-2
                        min-w-0 w-full

                        sm:flex-[1.1_1_200px]
                        sm:min-w-[170px]
                        sm:w-auto
                      "
                    >
                      <input
                        nz-input
                        type="number"
                        placeholder="Value"
                        class="!w-full"
                        [value]="row.value ?? ''"
                        (input)="patch(i, { value: text($event) })"
                      />
                    </div>

                    @if (row.op === "between") {
                      <div
                        class="
                          col-span-2
                          min-w-0 w-full

                          sm:flex-[1.1_1_200px]
                          sm:min-w-[170px]
                          sm:w-auto
                        "
                      >
                        <input
                          nz-input
                          type="number"
                          placeholder="And"
                          class="!w-full"
                          [value]="row.value2 ?? ''"
                          (input)="patch(i, { value2: text($event) })"
                        />
                      </div>
                    }
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
                    <div
                      class="
                        col-span-2
                        min-w-0 w-full

                        sm:flex-[1.1_1_200px]
                        sm:min-w-[170px]
                        sm:w-auto
                      "
                    >
                      <nz-select
                        [ngModel]="row.value"
                        (ngModelChange)="patch(i, { value: $event })"
                        nzPlaceHolder="Value"
                        class="w-full"
                      >
                        <nz-option nzValue="true" nzLabel="Yes" />
                        <nz-option nzValue="false" nzLabel="No" />
                      </nz-select>
                    </div>
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

                  <!-- Default -->
                  @default {
                    <div
                      class="
                        col-span-2
                        min-w-0 w-full

                        sm:flex-[1.1_1_200px]
                        sm:min-w-[170px]
                        sm:w-auto
                      "
                    >
                      <input
                        nz-input
                        placeholder="Value"
                        class="!w-full"
                        [value]="row.value ?? ''"
                        (input)="patch(i, { value: text($event) })"
                      />
                    </div>
                  }
                }
              }
            </div>
          }
        </div>
      } @else {
        <!-- Empty state -->
        <div
          class="
            my-4 mb-1
            flex flex-col items-center
            gap-3
            rounded-xl
            border-[1.5px] border-dashed
            border-[var(--app-outline-variant,#cac4d0)]
            bg-[var(--app-surface,#fff)]
            p-4
            text-center

            sm:flex-row sm:items-center
            sm:gap-3.5
            sm:p-[18px]
            sm:text-left
          "
        >
          <span
            class="
              grid size-11 shrink-0
              place-items-center
              rounded-xl
              bg-[var(--app-surface-container,#f3edf7)]
              text-[22px]
              text-[var(--app-text-muted,#49454f)]
            "
            aria-hidden="true"
          >
            <nz-icon nzType="filter" />
          </span>

          <div class="grid min-w-0 gap-0.5">
            <strong
              class="
                text-[0.875rem] font-semibold
                text-[var(--app-text,#1d1b20)]
                sm:text-[0.925rem]
              "
            >
              No filters applied
            </strong>

            <span
              class="
                text-xs
                text-[var(--app-text-muted,#49454f)]
                sm:text-[0.8125rem]
              "
            >
              Add a filter to narrow down your records.
            </span>
          </div>
        </div>
      }

      <!-- Footer -->
      <div
        class="
          flex flex-col gap-2.5
          border-t border-[var(--app-outline-variant,#e0e2ec)]
          pt-3.5

          sm:flex-row sm:items-center
          sm:pt-4
        "
      >
        <!-- Add -->
        <button
          nz-button
          nzType="primary"
          type="button"
          class="
            !m-0
            !inline-flex
            !h-10
            w-full
            items-center justify-center
            gap-1.5
            rounded-[10px]
            sm:w-auto
          "
          (click)="add()"
        >
          <nz-icon nzType="plus" />
          Add filter
        </button>

        <!-- Clear -->
        @if (filters().length) {
          <button
            nz-button
            nzType="default"
            type="button"
            class="
              !m-0
              !inline-flex
              !h-10
              w-full
              items-center justify-center
              gap-1.5
              rounded-[10px]
              text-[var(--app-text-muted,#49454f)]
              sm:w-auto
            "
            (click)="filters.set([])"
          >
            <nz-icon nzType="clear" />
            Clear all
          </button>
        }
      </div>
    </section>

    <!-- Date / DateTime -->
    <ng-template #dates let-row="row" let-i="i">
      <div
        class="
          col-span-2
          min-w-0 w-full

          sm:flex-[1.1_1_200px]
          sm:min-w-[170px]
          sm:w-auto
        "
      >
        <nz-date-picker
          class="!w-full"
          [ngModel]="row.value"
          (ngModelChange)="patch(i, { value: dateValue($event) })"
        />
      </div>

      @if (row.op === "between") {
        <div
          class="
            col-span-2
            min-w-0 w-full

            sm:flex-[1.1_1_200px]
            sm:min-w-[170px]
            sm:w-auto
          "
        >
          <nz-date-picker
            class="!w-full"
            [ngModel]="row.value2"
            (ngModelChange)="patch(i, { value2: dateValue($event) })"
          />
        </div>
      }
    </ng-template>

    <!-- Choice / MultiChoice / Reference -->
    <ng-template #choice let-row="row" let-i="i">
      @let f = fieldOf(row);

      @if (
        f &&
        (f.type === "reference" || f.type === "multiReference") &&
        f.config.targetCollectionId
      ) {
        <div
          class="
            col-span-2
            min-w-0 w-full

            sm:flex-[1.4_1_240px]
            sm:min-w-[200px]
            sm:w-auto
          "
        >
          <app-reference-selector
            class="block w-full"
            [collectionId]="f.config.targetCollectionId"
            label="Record"
            [value]="$any(row.value ?? null)"
            (valueChange)="patch(i, { value: $event })"
          />
        </div>
      } @else if (f) {
        <div
          class="
            col-span-2
            min-w-0 w-full

            sm:flex-[1.1_1_200px]
            sm:min-w-[170px]
            sm:w-auto
          "
        >
          <nz-select
            [ngModel]="row.value"
            (ngModelChange)="patch(i, { value: $event })"
            nzPlaceHolder="Option"
            class="w-full"
          >
            @for (o of f.config.options ?? []; track o) {
              <nz-option [nzValue]="o" [nzLabel]="o" />
            }
          </nz-select>
        </div>
      }
    </ng-template>
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

  protected dateValue(value: Date | null): string | null {
    if (!value) return null;

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");

    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }
}
