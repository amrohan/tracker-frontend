import { Injectable, inject } from "@angular/core";
import { NzMessageService } from "ng-zorro-antd/message";

@Injectable({ providedIn: "root" })
export class Notify {
  private readonly message = inject(NzMessageService);

  info(content: string): void {
    this.message.info(content, { nzDuration: 3500 });
  }

  success(content: string): void {
    this.message.success(content, { nzDuration: 3500 });
  }

  error(content: string): void {
    this.message.error(content, { nzDuration: 7000 });
  }

  warning(content: string): void {
    this.message.warning(content, { nzDuration: 5000 });
  }
}
