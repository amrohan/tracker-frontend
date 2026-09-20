import { Component, computed, input } from "@angular/core";
import { coverBackground, fallbackBackground } from "../core/cover-presets";
import { Cover } from "../core/models";
import { SecureImage } from "./secure-image";

@Component({
  selector: "app-cover-view",
  imports: [SecureImage],
  template: `
    <div class="cover" [style.background]="background()">
      @if (imageUrl(); as url) {
        <app-secure-image [src]="url" />
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
    .cover {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
  `,
})
export class CoverView {
  readonly cover = input<Cover | null>(null);
  readonly collectionId = input.required<string>();

  protected readonly background = computed(
    () =>
      coverBackground(this.cover()) ?? fallbackBackground(this.collectionId()),
  );
  protected readonly imageUrl = computed(() => {
    const c = this.cover();
    return c?.type === "image"
      ? `/api/collections/${this.collectionId()}/cover/image?v=${c.version ?? 0}`
      : null;
  });
}
