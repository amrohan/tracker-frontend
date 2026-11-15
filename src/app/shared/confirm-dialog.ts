import { Component, inject } from "@angular/core";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NZ_MODAL_DATA, NzModalModule, NzModalRef } from "ng-zorro-antd/modal";

export interface ConfirmData {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
}

@Component({
  selector: "app-confirm-dialog",
  imports: [NzModalModule, NzButtonModule, NzIconModule],
  template: `
    <div *nzModalTitle class="dialog-title-row">
      <div
        class="dialog-icon-box"
        [class.destructive]="data.destructive"
      >
        <nz-icon [nzType]="data.destructive ? 'exclamation-circle' : 'question-circle'" />
      </div>
      <span class="dialog-title-text">{{ data.title }}</span>
    </div>

    <div *nzModalContent class="dialog-content-body">
      <p class="dialog-message">{{ data.message }}</p>
    </div>

    <div *nzModalFooter class="dialog-footer-actions">
      <button nz-button nzType="default" (click)="cancel()" class="dialog-btn">
        Cancel
      </button>
      <button
        nz-button
        nzType="primary"
        [nzDanger]="data.destructive"
        (click)="confirm()"
        class="dialog-btn"
      >
        {{ data.confirmLabel ?? "Confirm" }}
      </button>
    </div>
  `,
  styles: `
    .dialog-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .dialog-icon-box {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: var(--app-primary-container);
      color: var(--app-on-primary-container);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;

      &.destructive {
        background: var(--app-error-container);
        color: var(--app-error);
      }
    }

    .dialog-title-text {
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--app-text);
      letter-spacing: -0.015em;
    }

    .dialog-content-body {
      padding: 12px 0 8px;
    }

    .dialog-message {
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--app-text-secondary);
      margin: 0;
    }

    .dialog-footer-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      padding-top: 12px;
    }

    .dialog-btn {
      height: 36px;
      padding: 0 16px;
      border-radius: var(--radius-md);
      font-weight: 500;
    }
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmData>(NZ_MODAL_DATA);
  private readonly modalRef = inject(NzModalRef);

  protected cancel(): void {
    this.modalRef.close(false);
  }

  protected confirm(): void {
    this.modalRef.close(true);
  }
}
