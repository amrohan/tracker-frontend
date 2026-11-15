import { Component, input, model } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NzRateModule } from "ng-zorro-antd/rate";

@Component({
  selector: "app-rating-input",
  imports: [FormsModule, NzRateModule],
  template: `
    <div class="rating-wrap" [attr.aria-label]="label()">
      <nz-rate
        [ngModel]="value()"
        (ngModelChange)="value.set($event)"
        [nzCount]="max()"
        [nzAllowClear]="true"
        class="custom-rate"
      />
      @if (value()) {
        <button type="button" class="clear-btn" (click)="value.set(null)" aria-label="Clear rating">
          Clear
        </button>
      }
    </div>
  `,
  styles: `
    .rating-wrap {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }

    .custom-rate {
      color: #f59e0b;
      font-size: 18px;
    }

    .clear-btn {
      background: none;
      border: 0;
      cursor: pointer;
      color: var(--app-text-muted);
      font-size: 0.75rem;
      font-weight: 500;
      text-decoration: underline;
      padding: 2px 4px;
      border-radius: var(--radius-xs);
      transition: color var(--transition-fast);

      &:hover {
        color: var(--app-error);
      }
    }
  `,
})
export class RatingInput {
  readonly value = model<number | null>(null);
  readonly max = input(5);
  readonly label = input("Rating");
}
