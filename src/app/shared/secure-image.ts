import { HttpClient } from "@angular/common/http";
import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from "@angular/core";

/** Loads an image through HttpClient (so the auth header is sent) and shows it via an object URL. */
@Component({
  selector: "app-secure-image",
  template: `@if (objectUrl(); as url) {
    <img [src]="url" [alt]="alt()" />
  }`,
  styles: `
    :host {
      display: contents;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  `,
})
export class SecureImage {
  readonly src = input.required<string>();
  readonly alt = input("");

  private readonly http = inject(HttpClient);
  protected readonly objectUrl = signal<string | null>(null);

  constructor() {
    effect((onCleanup) => {
      const src = this.src();
      const sub = this.http.get(src, { responseType: "blob" }).subscribe({
        next: (blob) => this.setUrl(URL.createObjectURL(blob)),
        error: () => this.setUrl(null),
      });
      onCleanup(() => sub.unsubscribe());
    });
    inject(DestroyRef).onDestroy(() => this.setUrl(null));
  }

  private setUrl(next: string | null): void {
    const previous = this.objectUrl();
    if (previous) URL.revokeObjectURL(previous);
    this.objectUrl.set(next);
  }
}
