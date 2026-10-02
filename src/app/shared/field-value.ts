import { Component, computed, input } from "@angular/core";
import { RouterLink } from "@angular/router";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzDropdownModule } from "ng-zorro-antd/dropdown";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzMenuModule } from "ng-zorro-antd/menu";
import { NzTagModule } from "ng-zorro-antd/tag";
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
    RouterLink,
    NzTagModule,
    NzIconModule,
    NzButtonModule,
    NzDropdownModule,
    NzMenuModule,
  ],
  template: `
    @if (isEmpty()) {
      <span class="muted">—</span>
    } @else {
      @switch (field().type) {
        @case ("url") {
          @if (url(); as u) {
            <a
              class="single-value link"
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
          <nz-icon
            [nzType]="value() === true ? 'check-circle' : 'close-circle'"
            [nzTheme]="value() === true ? 'fill' : 'outline'"
            [class.bool-yes]="value() === true"
            [class.bool-no]="value() !== true"
          />
        }

        @case ("rating") {
          <span
            class="stars"
            [attr.aria-label]="value() + ' out of ' + (field().config.max ?? 5)"
          >
            @for (n of stars(); track n) {
              <nz-icon
                [nzType]="'star'"
                [nzTheme]="n <= +$any(value()) ? 'fill' : 'outline'"
                class="star"
                [class.on]="n <= +$any(value())"
              />
            }
          </span>
        }

        @case ("select") {
          <nz-tag class="chip">
            {{ text() }}
          </nz-tag>
        }

        @case ("multiSelect") {
          <div class="multi-value">
            <div class="preview">
              @for (v of visibleList(); track v) {
                <nz-tag class="chip">{{ v }}</nz-tag>
              }
            </div>

            @if (hasMore()) {
              <button
                nz-button
                nzType="text"
                nzSize="small"
                class="more-button"
                nz-dropdown
                [nzDropdownMenu]="valuesMenu"
                (click)="$event.stopPropagation()"
                aria-label="Show all values"
              >
                <nz-icon nzType="down" />
              </button>
            }
          </div>
        }

        @case ("reference") {
          @for (r of refs(); track r.id) {
            <a
              class="chip-link"
              [routerLink]="['/collections', r.collectionId, 'records', r.id]"
            >
              <nz-tag nzColor="processing" class="chip clickable">
                {{ r.label }}
              </nz-tag>
            </a>
          }
        }

        @case ("multiReference") {
          <div class="multi-value">
            <div class="preview">
              @for (r of visibleRefs(); track r.id) {
                <a
                  class="chip-link"
                  [routerLink]="[
                    '/collections',
                    r.collectionId,
                    'records',
                    r.id,
                  ]"
                  (click)="$event.stopPropagation()"
                >
                  <nz-tag nzColor="processing" class="chip clickable">
                    {{ r.label }}
                  </nz-tag>
                </a>
              }
            </div>

            @if (hasMoreRefs()) {
              <button
                nz-button
                nzType="text"
                nzSize="small"
                class="more-button"
                nz-dropdown
                [nzDropdownMenu]="valuesMenu"
                (click)="$event.stopPropagation()"
                aria-label="Show all references"
              >
                <nz-icon nzType="down" />
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

    <!-- Dropdown for more values -->
    <nz-dropdown-menu #valuesMenu="nzDropdownMenu">
      <ul nz-menu class="values-menu">
        @if (field().type === "multiSelect") {
          @for (v of list(); track v) {
            <li nz-menu-item>
              {{ v }}
            </li>
          }
        }

        @if (field().type === "multiReference") {
          @for (r of refs(); track r.id) {
            <li nz-menu-item>
              <a
                [routerLink]="['/collections', r.collectionId, 'records', r.id]"
                (click)="$event.stopPropagation()"
              >
                {{ r.label }}
              </a>
            </li>
          }
        }
      </ul>
    </nz-dropdown-menu>
  `,
  styles: `
    :host {
      display: inline;
      min-width: 0;
    }

    .chip {
      margin: 2px 4px 2px 0;
      border-radius: 6px;
      font-size: 0.85rem;
    }

    .clickable {
      cursor: pointer;
    }

    .chip-link {
      text-decoration: none;
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

    .more-button {
      padding: 0 4px;
      height: 22px;
      line-height: 22px;
      font-size: 12px;
      color: var(--app-text-muted);
    }

    .stars {
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
      gap: 2px;
    }

    .star {
      font-size: 16px;
      color: #d9d9d9;
    }

    .star.on {
      color: #fadb14;
    }

    .bool-yes {
      color: #52c41a;
      font-size: 18px;
      vertical-align: middle;
    }

    .bool-no {
      color: #d9d9d9;
      font-size: 18px;
      vertical-align: middle;
    }

    .long {
      white-space: pre-wrap;
    }

    .values-menu {
      max-width: 280px;
      max-height: 320px;
      overflow-y: auto;
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
      { length: this.field().config.max ?? 5 },
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
