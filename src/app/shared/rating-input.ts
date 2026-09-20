import { Component, computed, input, model } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-rating-input',
  imports: [MatIconModule],
  template: `
    <div class="stars" role="radiogroup" [attr.aria-label]="label()">
      @for (n of steps(); track n) {
        <button type="button" class="star" role="radio" [attr.aria-checked]="value() === n"
                [attr.aria-label]="n + ' of ' + max()" (click)="pick(n)">
          <mat-icon>{{ (value() ?? 0) >= n ? 'star' : 'star_border' }}</mat-icon>
        </button>
      }
      @if (value()) { <button type="button" class="clear" (click)="value.set(null)">Clear</button> }
    </div>
  `,
  styles: `
    .stars { display: flex; align-items: center; flex-wrap: wrap; gap: 2px; }
    .star { background: none; border: 0; cursor: pointer; padding: 2px; color: var(--mat-sys-tertiary); border-radius: 50%; }
    .clear { background: none; border: 0; cursor: pointer; color: var(--mat-sys-on-surface-variant); margin-left: 8px; font: inherit; text-decoration: underline; }
  `,
})
export class RatingInput {
  readonly value = model<number | null>(null);
  readonly max = input(5);
  readonly label = input('Rating');
  protected readonly steps = computed(() => Array.from({ length: this.max() }, (_, i) => i + 1));

  protected pick(n: number): void {
    this.value.set(this.value() === n ? null : n); // clicking the current star clears it
  }
}
