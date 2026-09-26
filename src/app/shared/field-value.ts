import { Component, computed, input, signal } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { RouterLink } from "@angular/router";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  safeHttpUrl,
} from "../core/format";
import { Field, RecordReference } from "../core/models";

@Component({
  selector: "app-field-value",
  imports: [
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    RouterLink,
  ],
  template: `
    @if (isEmpty()) {
      <span class="muted">—</span>
    } @else {
      @switch (field().type) {
        @case ("url") {
          @if (url(); as u) {
            <a
              class="single-value"
              [href]="u"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ u }}
            </a>
          } @else {
            {{ text() }}
          }
        }

        @case ("boolean") {
          <mat-icon [attr.aria-label]="value() === true ? 'Yes' : 'No'">
            {{ value() === true ? "check_circle" : "radio_button_unchecked" }}
          </mat-icon>
        }

        @case ("rating") {
          <span
            class="stars"
            [attr.aria-label]="value() + ' out of ' + (field().config.max ?? 5)"
          >
            @for (n of stars(); track n) {
              <mat-icon class="star">
                {{ n <= +$any(value()) ? "star" : "star_border" }}
              </mat-icon>
            }
          </span>
        }

        @case ("select") {
          <span class="chip">
            {{ text() }}
          </span>
        }

        @case ("multiSelect") {
          <div class="multi-value">
            <div class="preview">
              @for (v of visibleList(); track v) {
                <span class="chip">{{ v }}</span>
              }
            </div>

            @if (hasMore()) {
              <button
                mat-icon-button
                class="more-button"
                [matMenuTriggerFor]="valuesMenu"
                (click)="$event.stopPropagation()"
                aria-label="Show all values"
              >
                <mat-icon>keyboard_arrow_down</mat-icon>
              </button>
            }
          </div>
        }

        @case ("reference") {
          @for (r of refs(); track r.id) {
            <a
              class="chip link"
              [routerLink]="['/collections', r.collectionId, 'records', r.id]"
            >
              {{ r.label }}
            </a>
          }
        }

        @case ("multiReference") {
          <div class="multi-value">
            <div class="preview">
              @for (r of visibleRefs(); track r.id) {
                <a
                  class="chip link"
                  [routerLink]="[
                    '/collections',
                    r.collectionId,
                    'records',
                    r.id,
                  ]"
                  (click)="$event.stopPropagation()"
                >
                  {{ r.label }}
                </a>
              }
            </div>

            @if (hasMoreRefs()) {
              <button
                mat-icon-button
                class="more-button"
                [matMenuTriggerFor]="valuesMenu"
                (click)="$event.stopPropagation()"
                aria-label="Show all references"
              >
                <mat-icon>keyboard_arrow_down</mat-icon>
              </button>
            }
          </div>
        }

        @case ("longText") {
          <span class="long">
            {{ text() }}
          </span>
        }

        @default {
          <span>
            {{ text() }}
          </span>
        }
      }
    }

    <!-- One shared menu -->
    <mat-menu #valuesMenu="matMenu">
      <div class="values-menu">
        @if (field().type === "multiSelect") {
          @for (v of list(); track v) {
            <div mat-menu-item>
              {{ v }}
            </div>
          }
        }

        @if (field().type === "multiReference") {
          @for (r of refs(); track r.id) {
            <a
              mat-menu-item
              [routerLink]="['/collections', r.collectionId, 'records', r.id]"
              (click)="$event.stopPropagation()"
            >
              {{ r.label }}
            </a>
          }
        }
      </div>
    </mat-menu>
  `,

  styles: `
    :host {
      display: inline;
      min-width: 0;
    }

    .chip {
      display: inline-block;
      padding: 2px 10px;
      margin: 2px 4px 2px 0;
      border-radius: 999px;
      font-size: 0.85rem;
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
      text-decoration: none;
      white-space: nowrap;
    }

    .chip.link:hover {
      background: var(--mat-sys-primary-container);
    }

    .multi-value {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      min-width: 0;
      vertical-align: middle;
    }

    .preview {
      display: flex;
      align-items: center;
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
    }

    .preview .chip {
      flex: 0 0 auto;
    }

    .more-button {
      flex: 0 0 auto;
      width: 28px;
      height: 28px;
      padding: 0;
      margin-left: 2px;
      color: var(--mat-sys-on-surface-variant);
    }

    .more-button mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
    }

    .more-button:hover {
      color: var(--mat-sys-primary);
      background: var(--mat-sys-surface-container-high);
    }

    .stars {
      display: inline-flex;
      vertical-align: middle;
    }

    .star {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--mat-sys-tertiary);
    }

    .long {
      white-space: pre-wrap;
    }

    mat-icon {
      vertical-align: middle;
    }

    .values-menu {
      max-width: 280px;
      max-height: 320px;
      overflow-y: auto;
      padding: 6px 0;
    }

    .value-item {
      display: block;
      padding: 8px 16px;
      font-size: 0.875rem;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .reference-item {
      color: var(--mat-sys-primary);
      text-decoration: none;
    }

    .reference-item:hover {
      background: var(--mat-sys-surface-container);
    }
  `,
})
export class FieldValue {
  readonly field = input.required<Field>();
  readonly value = input<unknown>(undefined);
  readonly references = input<Record<string, RecordReference>>({});

  protected readonly isEmpty = computed(() => {
    const v = this.value();

    return (
      v === null ||
      v === undefined ||
      v === "" ||
      (Array.isArray(v) && v.length === 0)
    );
  });

  protected readonly url = computed(() => safeHttpUrl(this.value()));

  protected readonly list = computed(() =>
    Array.isArray(this.value()) ? (this.value() as unknown[]).map(String) : [],
  );

  protected readonly refs = computed(() => {
    const v = this.value();

    const ids = Array.isArray(v)
      ? (v as string[])
      : typeof v === "string"
        ? [v]
        : [];

    const map = this.references();

    return ids.map((id) => map[id]).filter((r): r is RecordReference => !!r);
  });

  protected readonly stars = computed(() =>
    Array.from(
      {
        length: this.field().config.max ?? 5,
      },
      (_, i) => i + 1,
    ),
  );

  protected readonly text = computed(() => {
    const v = this.value();
    const f = this.field();

    switch (f.type) {
      case "number":
        return formatNumber(Number(v));

      case "currency":
        return formatCurrency(Number(v), f.config.currency ?? "USD");

      case "date":
        return formatDate(String(v));

      case "dateTime":
        return formatDateTime(String(v));

      default:
        return String(v);
    }
  });

  protected readonly visibleList = computed(() => this.list().slice(0, 2));

  protected readonly visibleRefs = computed(() => this.refs().slice(0, 2));

  protected readonly hasMore = computed(() => this.list().length > 2);

  protected readonly hasMoreRefs = computed(() => this.refs().length > 2);
}
