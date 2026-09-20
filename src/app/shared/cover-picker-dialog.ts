import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatSliderModule } from "@angular/material/slider";
import { MatTabsModule } from "@angular/material/tabs";
import { COLORS, GRADIENTS, coverBackground } from "../core/cover-presets";
import { Cover, CoverSelection } from "../core/models";
import { Notify } from "../core/notify.service";

export interface CoverPickerData {
  cover: Cover;
  collectionId: string | null;
}

const BANNER_W = 1600;
const BANNER_H = 600;

function render(
  canvas: HTMLCanvasElement,
  bitmap: ImageBitmap,
  offset: number,
): void {
  canvas.width = BANNER_W;
  canvas.height = BANNER_H;
  const scale = Math.max(BANNER_W / bitmap.width, BANNER_H / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, BANNER_W, BANNER_H);
  ctx.drawImage(bitmap, (BANNER_W - w) / 2, -(h - BANNER_H) * offset, w, h);
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (webp) => {
        if (webp && webp.type === "image/webp") return resolve(webp);
        canvas.toBlob(
          (jpeg) => (jpeg ? resolve(jpeg) : reject(new Error("encode failed"))),
          "image/jpeg",
          0.85,
        );
      },
      "image/webp",
      0.85,
    );
  });
}

@Component({
  selector: "app-cover-picker-dialog",
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatTabsModule,
    MatIconModule,
    MatSliderModule,
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">Choose a cover</h2>

    <mat-dialog-content>
      <!-- Unified Live Banner Preview -->
      <div
        class="preview-container"
        [style.background]="
          tab() !== 2 || !hasImage() ? previewBackground() : 'none'
        "
        aria-hidden="true"
      >
        @if (tab() === 2 && hasImage()) {
          <canvas #preview class="canvas-preview"></canvas>
        } @else if (tab() === 2 && !hasImage()) {
          <div class="empty-preview">
            <mat-icon>add_photo_alternate</mat-icon>
            <span>Upload an image below to preview banner</span>
          </div>
        }
      </div>

      <!-- Controls Tab Group -->
      <mat-tab-group
        [selectedIndex]="tab()"
        (selectedIndexChange)="tab.set($event)"
        animationDuration="150ms"
        mat-stretch-tabs="false"
      >
        <!-- Gradients -->
        <mat-tab label="Gradients">
          <div class="tab-body">
            <div class="swatches-grid">
              @for (g of gradients; track g.key) {
                <button
                  type="button"
                  class="swatch"
                  [class.active]="gradient() === g.key"
                  [style.background]="g.css"
                  [attr.aria-label]="g.label"
                  [attr.aria-pressed]="gradient() === g.key"
                  (click)="gradient.set(g.key)"
                >
                  @if (gradient() === g.key) {
                    <mat-icon class="check-icon">check</mat-icon>
                  }
                </button>
              }
            </div>
          </div>
        </mat-tab>

        <!-- Solid Colours -->
        <mat-tab label="Colours">
          <div class="tab-body">
            <div class="swatches-grid">
              @for (c of colors; track c) {
                <button
                  type="button"
                  class="swatch"
                  [class.active]="color() === c"
                  [style.background]="c"
                  [attr.aria-label]="c"
                  [attr.aria-pressed]="color() === c"
                  (click)="color.set(c)"
                >
                  @if (color() === c) {
                    <mat-icon class="check-icon">check</mat-icon>
                  }
                </button>
              }

              <!-- Integrated Custom Color Picker Swatch -->
              <label
                class="swatch custom-swatch"
                [class.active]="isCustomColor()"
                [style.background]="
                  isCustomColor() ? color() : 'var(--mat-sys-surface-container)'
                "
                title="Choose custom color"
              >
                <input
                  type="color"
                  class="sr-only"
                  [value]="color()"
                  (input)="onColor($event)"
                  aria-label="Custom color picker"
                />
                <mat-icon
                  class="custom-icon"
                  [class.on-color]="isCustomColor()"
                >
                  {{ isCustomColor() ? "check" : "colorize" }}
                </mat-icon>
              </label>
            </div>
          </div>
        </mat-tab>

        <!-- Image Upload & Positioning -->
        <mat-tab label="Image">
          <div class="tab-body">
            @if (!hasImage()) {
              <label class="dropzone">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  (change)="onFile($event)"
                />
                <mat-icon class="dropzone-icon">cloud_upload</mat-icon>
                <span class="dropzone-title">Upload a banner image</span>
                <span class="dropzone-hint"
                  >Supports JPEG, PNG or WebP (up to 25 MB)</span
                >
              </label>
            } @else {
              <div class="image-controls">
                <div class="slider-header">
                  <div class="slider-label">
                    <mat-icon>swap_vert</mat-icon>
                    <span>Vertical position</span>
                  </div>
                  <span class="slider-value"
                    >{{ (offset() * 100).toFixed(0) }}%</span
                  >
                </div>

                <div class="slider-wrapper">
                  <mat-icon class="slider-bound-icon"
                    >vertical_align_top</mat-icon
                  >
                  <mat-slider
                    min="0"
                    max="1"
                    step="0.01"
                    class="position-slider"
                  >
                    <input
                      matSliderThumb
                      [value]="offset()"
                      (valueChange)="offset.set($event)"
                      aria-label="Vertical crop position"
                    />
                  </mat-slider>
                  <mat-icon class="slider-bound-icon"
                    >vertical_align_bottom</mat-icon
                  >
                </div>

                <div class="image-actions">
                  <label class="replace-btn" mat-stroked-button>
                    <mat-icon>cached</mat-icon>
                    Change image
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      (change)="onFile($event)"
                    />
                  </label>
                </div>
              </div>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      @if (data.cover.type !== "none") {
        <button
          mat-button
          color="warn"
          type="button"
          class="remove-btn"
          (click)="remove()"
        >
          <mat-icon>delete_outline</mat-icon>
          Remove cover
        </button>
      }
      <span class="spacer"></span>
      <button mat-button mat-dialog-close type="button">Cancel</button>
      <button
        mat-flat-button
        color="primary"
        type="button"
        [disabled]="busy() || (tab() === 2 && !hasImage())"
        (click)="apply()"
      >
        {{ busy() ? "Processing…" : "Use this cover" }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      max-width: 580px;
    }

    .dialog-title {
      margin-bottom: 8px;
      font-weight: 600;
    }

    /* Live Preview Banner */
    .preview-container {
      width: 100%;
      aspect-ratio: 16 / 6;
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 16px;
      background-size: cover;
      background-position: center;
      box-shadow: inset 0 0 0 1px
        var(--mat-sys-outline-variant, rgba(0, 0, 0, 0.1));
      transition: background 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--mat-sys-surface-container-high, #f2f2f2);
    }

    .canvas-preview {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }

    .empty-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      color: var(--mat-sys-on-surface-variant, #666);
      font-size: 0.875rem;

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        opacity: 0.7;
      }
    }

    .tab-body {
      padding: 16px 2px 8px;
      min-height: 160px;
    }

    /* Swatches Grid */
    .swatches-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
      gap: 12px;
    }

    .swatch {
      position: relative;
      height: 48px;
      border-radius: 12px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition:
        transform 0.15s ease,
        box-shadow 0.15s ease;
    }

    .swatch:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
    }

    .swatch.active {
      outline: 2px solid var(--mat-sys-primary, #005ac1);
      outline-offset: 2px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
    }

    .check-icon {
      color: #fff;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.7));
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Custom Color Picker Swatch */
    .custom-swatch {
      cursor: pointer;
    }

    .sr-only {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      pointer-events: none;
    }

    .custom-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--mat-sys-on-surface-variant, #444);
    }

    .custom-icon.on-color {
      color: #fff;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.7));
    }

    /* Image Tab Dropzone */
    .dropzone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 2px dashed var(--mat-sys-outline, rgba(0, 0, 0, 0.2));
      border-radius: 14px;
      padding: 24px 16px;
      cursor: pointer;
      background-color: var(--mat-sys-surface-container-low, transparent);
      transition:
        border-color 0.2s,
        background-color 0.2s;
    }

    .dropzone:hover {
      border-color: var(--mat-sys-primary, #005ac1);
      background-color: var(--mat-sys-surface-container, rgba(0, 0, 0, 0.02));
    }

    .dropzone-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: var(--mat-sys-primary, #005ac1);
    }

    .dropzone-title {
      font-weight: 500;
      color: var(--mat-sys-on-surface, #1b1b1f);
    }

    .dropzone-hint {
      font-size: 0.8125rem;
      color: var(--mat-sys-on-surface-variant, #74777f);
    }

    /* Image Controls */
    .image-controls {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .slider-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--mat-sys-on-surface, #1b1b1f);
    }

    .slider-label {
      display: flex;
      align-items: center;
      gap: 6px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        opacity: 0.8;
      }
    }

    .slider-value {
      font-variant-numeric: tabular-nums;
      color: var(--mat-sys-on-surface-variant, #74777f);
    }

    .slider-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .slider-bound-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--mat-sys-on-surface-variant, #74777f);
    }

    .position-slider {
      flex: 1;
    }

    .image-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 4px;
    }

    .replace-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }

    /* Actions */
    .dialog-actions {
      padding: 16px 24px;
      gap: 8px;
    }

    .remove-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .spacer {
      flex: 1;
    }
  `,
})
export class CoverPickerDialog {
  protected readonly data = inject<CoverPickerData>(MAT_DIALOG_DATA);
  private readonly ref =
    inject<MatDialogRef<CoverPickerDialog, CoverSelection>>(MatDialogRef);
  private readonly notify = inject(Notify);

  protected readonly gradients = GRADIENTS;
  protected readonly colors = COLORS;

  protected readonly tab = signal(
    this.data.cover.type === "color"
      ? 1
      : this.data.cover.type === "image"
        ? 2
        : 0,
  );
  protected readonly gradient = signal(
    this.data.cover.type === "gradient" && this.data.cover.value
      ? this.data.cover.value
      : GRADIENTS[0].key,
  );
  protected readonly color = signal(
    this.data.cover.type === "color" && this.data.cover.value
      ? this.data.cover.value
      : COLORS[0],
  );
  protected readonly offset = signal(0.5);
  protected readonly hasImage = signal(false);
  protected readonly busy = signal(false);

  protected readonly isCustomColor = computed(
    () => !this.colors.includes(this.color()),
  );

  private bitmap: ImageBitmap | null = null;
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("preview");

  protected previewBackground(): string {
    if (this.tab() === 0) {
      return (
        coverBackground({ type: "gradient", value: this.gradient() }) ?? ""
      );
    }
    if (this.tab() === 1) {
      return this.color();
    }
    return "var(--mat-sys-surface-container-high, #eee)";
  }

  constructor() {
    effect(() => {
      const offset = this.offset();
      const canvas = this.canvas()?.nativeElement;
      if (canvas && this.bitmap && this.hasImage()) {
        render(canvas, this.bitmap, offset);
      }
    });
  }

  protected onColor(e: Event): void {
    this.color.set((e.target as HTMLInputElement).value);
  }

  protected async onFile(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      this.notify.error("Please choose a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      this.notify.error("That image is very large. Choose one under 25 MB.");
      return;
    }

    try {
      this.bitmap?.close();
      this.bitmap = await createImageBitmap(file);
      this.hasImage.set(true);
      this.offset.set(0.5);
    } catch {
      this.notify.error("Could not read that image.");
    }
  }

  protected remove(): void {
    this.ref.close({ type: "none" });
  }

  protected async apply(): Promise<void> {
    if (this.tab() === 0)
      return this.ref.close({ type: "gradient", value: this.gradient() });
    if (this.tab() === 1)
      return this.ref.close({ type: "color", value: this.color() });

    const canvas = this.canvas()?.nativeElement;
    if (!canvas || !this.bitmap) return;

    this.busy.set(true);
    try {
      this.ref.close({ type: "image", blob: await toBlob(canvas) });
    } catch {
      this.notify.error("Could not process that image.");
      this.busy.set(false);
    }
  }
}
