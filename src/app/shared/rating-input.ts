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
      />
      @if (value()) {
        <button type="button" class="clear" (click)="value.set(null)">
          Clear
        </button>
      }
    </div>
  `,
  styles: `
    .rating-wrap {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .clear {
      background: none;
      border: 0;
      cursor: pointer;
      color: var(--app-text-muted);
      font-size: 0.85rem;
      text-decoration: underline;
      padding: 0;
    }
    .clear:hover {
      color: var(--app-text);
    }
  `,
})
export class RatingInput {
  readonly value = model<number | null>(null);
  readonly max = input(5);
  readonly label = input("Rating");
}
