import { Component, computed, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { formatCurrency, formatDate, formatDateTime, formatNumber, safeHttpUrl } from '../core/format';
import { Field, RecordReference } from '../core/models';

/** Read-only rendering of one value, driven entirely by the field's type. Used by the table and the detail page. */
@Component({
  selector: 'app-field-value',
  imports: [MatChipsModule, MatIconModule, RouterLink],
  template: `
    @if (isEmpty()) {
      <span class="muted">—</span>
    } @else {
      @switch (field().type) {
        @case ('url') {
          @if (url(); as u) { <a [href]="u" target="_blank" rel="noopener noreferrer">{{ u }}</a> } @else { {{ text() }} }
        }
        @case ('boolean') { <mat-icon [attr.aria-label]="value() === true ? 'Yes' : 'No'">{{ value() === true ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon> }
        @case ('rating') {
          <span class="stars" [attr.aria-label]="value() + ' out of ' + (field().config.max ?? 5)">
            @for (n of stars(); track n) { <mat-icon class="star">{{ n <= +$any(value()) ? 'star' : 'star_border' }}</mat-icon> }
          </span>
        }
        @case ('select') { <span class="chip">{{ text() }}</span> }
        @case ('multiSelect') { @for (v of list(); track v) { <span class="chip">{{ v }}</span> } }
        @case ('reference') { @for (r of refs(); track r.id) { <a class="chip link" [routerLink]="['/collections', r.collectionId, 'records', r.id]">{{ r.label }}</a> } }
        @case ('multiReference') { @for (r of refs(); track r.id) { <a class="chip link" [routerLink]="['/collections', r.collectionId, 'records', r.id]">{{ r.label }}</a> } }
        @case ('longText') { <span class="long">{{ text() }}</span> }
        @default { {{ text() }} }
      }
    }
  `,
  styles: `
    :host { display: inline; }
    .chip { display: inline-block; padding: 2px 10px; margin: 2px 4px 2px 0; border-radius: 999px; font-size: .85rem; background: var(--mat-sys-secondary-container); color: var(--mat-sys-on-secondary-container); text-decoration: none; }
    .chip.link:hover { background: var(--mat-sys-primary-container); }
    .stars { display: inline-flex; vertical-align: middle; }
    .star { font-size: 18px; width: 18px; height: 18px; color: var(--mat-sys-tertiary); }
    .long { white-space: pre-wrap; }
    mat-icon { vertical-align: middle; }
  `,
})
export class FieldValue {
  readonly field = input.required<Field>();
  readonly value = input<unknown>(undefined);
  readonly references = input<Record<string, RecordReference>>({});

  protected readonly isEmpty = computed(() => {
    const v = this.value();
    return v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
  });
  protected readonly url = computed(() => safeHttpUrl(this.value()));
  protected readonly list = computed(() => (Array.isArray(this.value()) ? (this.value() as unknown[]).map(String) : []));
  protected readonly stars = computed(() => Array.from({ length: this.field().config.max ?? 5 }, (_, i) => i + 1));
  protected readonly refs = computed(() => {
    const v = this.value();
    const ids = Array.isArray(v) ? (v as string[]) : typeof v === 'string' ? [v] : [];
    const map = this.references();
    return ids.map((id) => map[id]).filter((r): r is RecordReference => !!r);
  });

  protected readonly text = computed(() => {
    const v = this.value();
    const f = this.field();
    switch (f.type) {
      case 'number': return formatNumber(Number(v));
      case 'currency': return formatCurrency(Number(v), f.config.currency ?? 'USD');
      case 'date': return formatDate(String(v));
      case 'dateTime': return formatDateTime(String(v));
      default: return String(v);
    }
  });
}
