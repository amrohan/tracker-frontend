import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { safeHttpUrl } from '../../core/format';
import { Field, RecordReference } from '../../core/models';
import { DynamicField } from './dynamic-field';

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
}

function buildInitial(fields: Field[], initial: Record<string, unknown> | null): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = initial?.[f.key];
    out[f.key] = v !== undefined ? v : f.type === 'boolean' ? false : null;
  }
  return out;
}

/** One generic form for every collection: the fields array is the only input that varies. */
@Component({
  selector: 'app-dynamic-form',
  imports: [DynamicField, MatButtonModule],
  template: `
    <form (submit)="onSubmit($event)" novalidate>
      @for (f of fields(); track f.id) {
        <app-dynamic-field [field]="f" [value]="values()[f.key]" (valueChange)="setValue(f.key, $event)"
                           [error]="errorFor(f)" [references]="references()" />
      }
      <div class="row actions">
        <span class="spacer"></span>
        <button mat-button type="button" (click)="cancelled.emit()">Cancel</button>
        <button mat-flat-button type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : submitLabel() }}</button>
      </div>
    </form>
  `,
  styles: `.actions { margin-top: 16px; }`,
})
export class DynamicForm {
  readonly fields = input.required<Field[]>();
  readonly initial = input<Record<string, unknown> | null>(null);
  readonly references = input<Record<string, RecordReference>>({});
  readonly serverErrors = input<Record<string, string[]>>({});
  readonly saving = input(false);
  readonly submitLabel = input('Save');

  readonly submitted = output<Record<string, unknown>>();
  readonly cancelled = output<void>();

  /** Re-seeds whenever the field list or the initial record changes. */
  protected readonly values = linkedSignal<Record<string, unknown>>(() => buildInitial(this.fields(), this.initial()));
  private readonly attempted = linkedSignal<boolean>(() => { this.fields(); return false; });
  private readonly edited = linkedSignal<ReadonlySet<string>>(() => { this.serverErrors(); return new Set<string>(); });

  protected readonly clientErrors = computed(() => {
    const errors: Record<string, string> = {};
    const values = this.values();
    for (const f of this.fields()) {
      const v = values[f.key];
      if (isEmpty(v)) {
        if (f.required && f.type !== 'boolean') errors[f.key] = `${f.name} is required.`;
        continue;
      }
      if ((f.type === 'number' || f.type === 'currency') && typeof v === 'number') {
        if (f.config.min != null && v < f.config.min) errors[f.key] = `Must be at least ${f.config.min}.`;
        else if (f.config.max != null && v > f.config.max) errors[f.key] = `Must be at most ${f.config.max}.`;
      }
      if (f.type === 'url' && !safeHttpUrl(v)) errors[f.key] = 'Enter a full web address starting with http:// or https://.';
    }
    return errors;
  });

  protected errorFor(f: Field): string | null {
    if (this.attempted() && this.clientErrors()[f.key]) return this.clientErrors()[f.key];
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
    for (const f of this.fields()) out[f.key] = isEmpty(values[f.key]) ? null : values[f.key]; // null clears a value on PATCH
    this.submitted.emit(out);
  }
}
