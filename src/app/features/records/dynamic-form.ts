import {
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { safeHttpUrl } from "../../core/format";
import { Field, RecordReference } from "../../core/models";
import { DynamicField } from "./dynamic-field";

function isEmpty(v: unknown): boolean {
  return (
    v === null ||
    v === undefined ||
    v === "" ||
    (Array.isArray(v) && v.length === 0)
  );
}

function buildInitial(
  fields: Field[],
  initial: Record<string, unknown> | null,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = initial?.[f.key];
    out[f.key] = v !== undefined ? v : f.type === "boolean" ? false : null;
  }
  return out;
}

/** One generic form for every collection: the fields array is the only input that varies. */
@Component({
  selector: "app-dynamic-form",
  imports: [DynamicField, MatButtonModule, MatIconModule],
  template: `
    <form (submit)="onSubmit($event)" novalidate class="form-layout">
      <!-- Dynamic Fields -->
      <div class="fields-list">
        @for (f of fields(); track f.id) {
          <div class="field-item">
            <app-dynamic-field
              [field]="f"
              [value]="values()[f.key]"
              (valueChange)="setValue(f.key, $event)"
              [error]="errorFor(f)"
              [references]="references()"
            />
          </div>
        }
      </div>

      <!-- Validation Error Summary Banner -->
      @if (attempted() && errorCount() > 0) {
        <div class="form-alert" role="alert">
          <mat-icon class="alert-icon" aria-hidden="true"
            >error_outline</mat-icon
          >
          <span>
            Please correct the
            {{
              errorCount() === 1 ? "required field" : errorCount() + " fields"
            }}
            highlighted above.
          </span>
        </div>
      }

      <!-- Actions -->
      <div class="actions">
        <button
          mat-button
          type="button"
          class="cancel-btn"
          [disabled]="saving()"
          (click)="cancelled.emit()"
        >
          Cancel
        </button>

        <button
          mat-flat-button
          type="submit"
          class="submit-btn"
          [disabled]="saving()"
        >
          {{ saving() ? "Saving…" : submitLabel() }}
        </button>
      </div>
    </form>
  `,
  styles: `
    .actions {
      position: sticky;
      bottom: 0;
      z-index: 2;
      margin: 16px calc(-1 * var(--drawer-pad, 0px))
        calc(-1 * var(--drawer-pad, 0px));
      padding: 12px var(--drawer-pad, 0px)
        calc(12px + env(safe-area-inset-bottom));
      background: var(--drawer-bg, transparent);
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    @media (max-width: 560px) {
      .actions button {
        flex: 1;
        min-height: 46px;
      }
      .actions .spacer {
        display: none;
      }
    }
  `,
  // styles: `
  //   :host {
  //     display: block;
  //   }

  //   .form-layout {
  //     display: flex;
  //     flex-direction: column;
  //   }

  //   /* =========================================================
  //      FIELDS
  //      ========================================================= */

  //   .fields-list {
  //     display: flex;
  //     flex-direction: column;
  //     gap: 16px;
  //   }

  //   .field-item {
  //     width: 100%;
  //   }

  //   /* =========================================================
  //      ALERT
  //      ========================================================= */

  //   .form-alert {
  //     display: flex;
  //     align-items: center;
  //     gap: 10px;
  //     margin-top: 18px;
  //     padding: 12px 16px;
  //     border-radius: 12px;
  //     background: var(--mat-sys-error-container, #ffdad6);
  //     color: var(--mat-sys-on-error-container, #410002);
  //     font-size: 0.875rem;
  //     font-weight: 500;
  //     line-height: 1.4;
  //   }

  //   .alert-icon {
  //     font-size: 20px;
  //     width: 20px;
  //     height: 20px;
  //     flex-shrink: 0;
  //   }

  //   /* =========================================================
  //      ACTIONS
  //      ========================================================= */

  //   .actions {
  //     display: flex;
  //     align-items: center;
  //     justify-content: flex-end;
  //     gap: 12px;
  //     margin-top: 24px;
  //     padding-top: 16px;
  //     border-top: 1px solid var(--mat-sys-outline-variant, #e0e2ec);
  //   }

  //   .cancel-btn {
  //     min-height: 42px;
  //     padding: 0 18px;
  //     border-radius: 10px;
  //     font-weight: 600;
  //     color: var(--mat-sys-on-surface-variant, #49454f);
  //     transition:
  //       background-color 140ms ease,
  //       color 140ms ease;
  //   }

  //   .cancel-btn:hover:not([disabled]) {
  //     background: var(--mat-sys-surface-container-high, #ece6f0);
  //     color: var(--mat-sys-on-surface, #1d1b20);
  //   }

  //   .submit-btn {
  //     min-height: 42px;
  //     padding: 0 22px;
  //     border-radius: 10px;
  //     font-weight: 600;
  //     letter-spacing: 0.01em;
  //   }

  //   /* =========================================================
  //      RESPONSIVE (MOBILE <= 600px)
  //      ========================================================= */

  //   @media (max-width: 600px) {
  //     .fields-list {
  //       gap: 14px;
  //     }

  //     .actions {
  //       display: grid;
  //       grid-template-columns: 1fr 1fr;
  //       gap: 10px;
  //       margin-top: 20px;
  //       padding-top: 14px;
  //     }

  //     .cancel-btn,
  //     .submit-btn {
  //       width: 100%;
  //       min-height: 44px;
  //       justify-content: center;
  //     }
  //   }

  //   /* =========================================================
  //      EXTRA SMALL PHONES (<= 380px)
  //      ========================================================= */

  //   @media (max-width: 380px) {
  //     .actions {
  //       grid-template-columns: 1fr;
  //     }

  //     /* Stack submit button first or cancel button clearly */
  //     .cancel-btn {
  //       order: 2;
  //     }

  //     .submit-btn {
  //       order: 1;
  //     }
  //   }

  //   @media (prefers-reduced-motion: reduce) {
  //     .cancel-btn,
  //     .submit-btn {
  //       transition: none;
  //     }
  //   }
  // `,
})
export class DynamicForm {
  readonly fields = input.required<Field[]>();
  readonly initial = input<Record<string, unknown> | null>(null);
  readonly references = input<Record<string, RecordReference>>({});
  readonly serverErrors = input<Record<string, string[]>>({});
  readonly saving = input(false);
  readonly submitLabel = input("Save");

  readonly submitted = output<Record<string, unknown>>();
  readonly cancelled = output<void>();

  /** Re-seeds whenever the field list or the initial record changes. */
  protected readonly values = linkedSignal<Record<string, unknown>>(() =>
    buildInitial(this.fields(), this.initial()),
  );
  protected readonly attempted = linkedSignal<boolean>(() => {
    this.fields();
    return false;
  });
  private readonly edited = linkedSignal<ReadonlySet<string>>(() => {
    this.serverErrors();
    return new Set<string>();
  });

  protected readonly clientErrors = computed(() => {
    const errors: Record<string, string> = {};
    const values = this.values();
    for (const f of this.fields()) {
      const v = values[f.key];
      if (isEmpty(v)) {
        if (f.required && f.type !== "boolean")
          errors[f.key] = `${f.name} is required.`;
        continue;
      }
      if (
        (f.type === "number" || f.type === "currency") &&
        typeof v === "number"
      ) {
        if (f.config.min != null && v < f.config.min)
          errors[f.key] = `Must be at least ${f.config.min}.`;
        else if (f.config.max != null && v > f.config.max)
          errors[f.key] = `Must be at most ${f.config.max}.`;
      }
      if (f.type === "url" && !safeHttpUrl(v))
        errors[f.key] =
          "Enter a full web address starting with http:// or https://.";
    }
    return errors;
  });

  protected readonly errorCount = computed(
    () => Object.keys(this.clientErrors()).length,
  );

  protected errorFor(f: Field): string | null {
    if (this.attempted() && this.clientErrors()[f.key])
      return this.clientErrors()[f.key];
    if (this.edited().has(f.key)) return null;
    return this.serverErrors()[f.key]?.[0] ?? null;
  }

  protected setValue(key: string, value: unknown): void {
    this.values.update((v) => ({ ...v, [key]: value }));
    this.edited.update((s) => new Set([...s, key])); // editing a field dismisses its server error
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.attempted.set(true);
    if (Object.keys(this.clientErrors()).length > 0) return;

    const out: Record<string, unknown> = {};
    const values = this.values();
    for (const f of this.fields())
      out[f.key] = isEmpty(values[f.key]) ? null : values[f.key]; // null clears a value on PATCH
    this.submitted.emit(out);
  }
}
