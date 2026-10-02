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
    <div *nzModalTitle>{{ data.title }}</div>
    <div *nzModalContent>{{ data.message }}</div>
    <div *nzModalFooter>
      <button nz-button nzType="default" (click)="cancel()">Cancel</button>
      <button
        nz-button
        nzType="primary"
        [nzDanger]="data.destructive"
        (click)="confirm()"
      >
        {{ data.confirmLabel ?? "Confirm" }}
      </button>
    </div>
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
