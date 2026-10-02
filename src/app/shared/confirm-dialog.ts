import { Component, inject } from "@angular/core";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NZ_MODAL_DATA, NzModalModule, NzModalRef } from "ng-zorro-antd/modal";

export interface ConfirmData {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
}

@Component({
  selector: "app-confirm-dialog",
  imports: [NzModalModule, NzButtonModule],
  template: `
    <div class="dialog-wrap">
      <h3 class="modal-title">{{ data.title }}</h3>
      <div class="modal-content">{{ data.message }}</div>
      <div class="modal-actions">
        <button nz-button nzType="default" (click)="cancel()">Cancel</button>
        <button
          nz-button
          [nzType]="data.destructive ? 'primary' : 'primary'"
          [nzDanger]="data.destructive"
          (click)="confirm()"
        >
          {{ data.confirmLabel ?? "Confirm" }}
        </button>
      </div>
    </div>
  `,
  styles: `
    .dialog-wrap {
      padding: 12px 4px 4px;
    }
    .modal-title {
      font-size: 1.15rem;
      font-weight: 600;
      margin: 0 0 12px;
      color: var(--app-text);
    }
    .modal-content {
      font-size: 0.95rem;
      line-height: 1.5;
      color: var(--app-text-secondary);
      margin-bottom: 24px;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
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
