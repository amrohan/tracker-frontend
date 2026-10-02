import { Component, input, output } from "@angular/core";
import { NzDrawerModule } from "ng-zorro-antd/drawer";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";

@Component({
  selector: "app-record-drawer",
  imports: [NzDrawerModule, NzButtonModule, NzIconModule],
  template: `
    <!-- Drawer title -->
    <ng-template #titleTpl>
      <div class="drawer-title-block">
        @if (eyebrow()) {
          <p class="drawer-eyebrow">
            @if (eyebrowIcon()) {
              <span class="drawer-eyebrow-icon" aria-hidden="true">
                {{ eyebrowIcon() }}
              </span>
            }

            <span>{{ eyebrow() }}</span>
          </p>
        }

        <span class="drawer-heading">
          {{ heading() }}
        </span>
      </div>
    </ng-template>

    <!-- Drawer footer -->
    <ng-template #footerTpl>
      <ng-content select="[drawerFooter]" />
    </ng-template>

    <nz-drawer
      [nzVisible]="true"
      nzPlacement="right"
      [nzWidth]="560"
      [nzTitle]="titleTpl"
      [nzFooter]="footer() ? footerTpl : undefined"
      [nzClosable]="!busy()"
      [nzMaskClosable]="closeOnBackdrop()"
      [nzKeyboard]="!busy()"
      (nzOnClose)="onClose()"
    >
      <ng-container *nzDrawerContent>
        <ng-content />
      </ng-container>
    </nz-drawer>
  `,

  styles: `
    .drawer-title-block {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .drawer-eyebrow {
      display: flex;
      align-items: center;
      gap: 6px;

      margin: 0;

      font-size: 0.8125rem;
      font-weight: 600;
      line-height: 1.2;

      color: var(--app-text-muted);
    }

    .drawer-eyebrow-icon {
      display: inline-flex;
      align-items: center;

      font-size: 0.9rem;
      line-height: 1;
    }

    .drawer-heading {
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.3;

      color: var(--app-text);
    }
  `,
})
export class RecordDrawer {
  readonly heading = input.required<string>();
  readonly eyebrow = input("");
  readonly eyebrowIcon = input("");
  readonly busy = input(false);
  readonly closeOnBackdrop = input(true);
  readonly footer = input(false);

  readonly closed = output<void>();

  protected onClose(): void {
    if (!this.busy()) {
      this.closed.emit();
    }
  }
}
