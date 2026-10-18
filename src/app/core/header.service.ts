import { Injectable, signal } from "@angular/core";

export interface HeaderDetail {
  icon: string;
  title: string;
  backLink: string;
}

@Injectable({ providedIn: "root" })
export class HeaderService {
  readonly detail = signal<HeaderDetail | null>(null);

  set(detail: HeaderDetail): void {
    this.detail.set(detail);
  }

  clear(): void {
    this.detail.set(null);
  }
}
