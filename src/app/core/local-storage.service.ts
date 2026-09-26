import { Injectable, PLATFORM_ID, inject } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { Notify } from "./notify.service";

@Injectable({
  providedIn: "root",
})
export class LocalStorageService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly notify = inject(Notify);

  getItem<T>(key: string): T | null {
    if (!this.isBrowser) return null;
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  setItem<T>(key: string, value: T): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      this.notify.error("Unable to save items to local storage");
    }
  }

  removeItem(key: string): void {
    if (!this.isBrowser) return;
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}
