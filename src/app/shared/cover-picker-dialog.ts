import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatTabsModule } from '@angular/material/tabs';
import { COLORS, GRADIENTS, coverBackground } from '../core/cover-presets';
import { Cover, CoverSelection } from '../core/models';
import { Notify } from '../core/notify.service';

export interface CoverPickerData { cover: Cover; collectionId: string | null; }

const BANNER_W = 1600;
const BANNER_H = 600;

/** Draws the bitmap "cover-fitted" into the canvas; `offset` (0..1) moves the crop vertically. */
function render(canvas: HTMLCanvasElement, bitmap: ImageBitmap, offset: number): void {
  canvas.width = BANNER_W;
  canvas.height = BANNER_H;
  const scale = Math.max(BANNER_W / bitmap.width, BANNER_H / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, BANNER_W, BANNER_H);
  ctx.drawImage(bitmap, (BANNER_W - w) / 2, -(h - BANNER_H) * offset, w, h);
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((webp) => {
      if (webp && webp.type === 'image/webp') return resolve(webp);
      canvas.toBlob((jpeg) => (jpeg ? resolve(jpeg) : reject(new Error('encode failed'))), 'image/jpeg', 0.85);
    }, 'image/webp', 0.85);
  });
}

@Component({
  selector: 'app-cover-picker-dialog',
  imports: [MatDialogModule, MatButtonModule, MatTabsModule, MatIconModule, MatSliderModule],
  template: `
    <h2 mat-dialog-title>Choose a cover</h2>
    <mat-dialog-content>
      <div class="preview" [style.background]="previewBackground()" aria-hidden="true"></div>

      <mat-tab-group [selectedIndex]="tab()" (selectedIndexChange)="tab.set($event)" animationDuration="0ms">
        <mat-tab label="Gradient">
          <div class="swatches">
            @for (g of gradients; track g.key) {
              <button type="button" class="swatch" [class.on]="gradient() === g.key" [style.background]="g.css"
                      [attr.aria-label]="g.label" [attr.aria-pressed]="gradient() === g.key" (click)="gradient.set(g.key)"></button>
            }
          </div>
        </mat-tab>
        <mat-tab label="Colour">
          <div class="swatches">
            @for (c of colors; track c) {
              <button type="button" class="swatch" [class.on]="color() === c" [style.background]="c"
                      [attr.aria-label]="c" [attr.aria-pressed]="color() === c" (click)="color.set(c)"></button>
            }
            <label class="custom">Custom <input type="color" [value]="color()" (input)="onColor($event)" /></label>
          </div>
        </mat-tab>
        <mat-tab label="Image">
          <div class="image-tab">
            <label class="upload">
              <mat-icon>upload</mat-icon> Choose an image
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden (change)="onFile($event)" />
            </label>
            <p class="muted">JPEG, PNG or WebP. It is cropped to a wide banner.</p>
            @if (hasImage()) {
              <canvas #preview class="canvas"></canvas>
              <label class="slider">
                Vertical position
                <mat-slider min="0" max="1" step="0.01"><input matSliderThumb [value]="offset()" (valueChange)="offset.set($event)" /></mat-slider>
              </label>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    </mat-dialog-content>
    <mat-dialog-actions>
      @if (data.cover.type !== 'none') { <button mat-button (click)="remove()">Remove cover</button> }
      <span class="spacer"></span>
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button [disabled]="busy() || (tab() === 2 && !hasImage())" (click)="apply()">Use this cover</button>
    </mat-dialog-actions>
  `,
  styles: `
    .preview { height: 120px; border-radius: 14px; margin-bottom: 12px; border: 1px solid var(--mat-sys-outline-variant); }
    .swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 10px; padding: 16px 2px; }
    .swatch { height: 52px; border-radius: 12px; border: 2px solid transparent; cursor: pointer; }
    .swatch.on { border-color: var(--mat-sys-on-surface); outline: 2px solid var(--mat-sys-surface); outline-offset: -4px; }
    .custom { display: flex; align-items: center; gap: 8px; grid-column: span 2; }
    .image-tab { padding: 16px 2px; }
    .upload { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border: 1px dashed var(--mat-sys-outline); border-radius: 12px; cursor: pointer; }
    .canvas { width: 100%; border-radius: 12px; margin-top: 8px; }
    .slider { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
    mat-dialog-actions { display: flex; gap: 8px; }
    .spacer { flex: 1; }
  `,
})
export class CoverPickerDialog {
  protected readonly data = inject<CoverPickerData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<CoverPickerDialog, CoverSelection>>(MatDialogRef);
  private readonly notify = inject(Notify);

  protected readonly gradients = GRADIENTS;
  protected readonly colors = COLORS;

  protected readonly tab = signal(this.data.cover.type === 'color' ? 1 : this.data.cover.type === 'image' ? 2 : 0);
  protected readonly gradient = signal(this.data.cover.type === 'gradient' && this.data.cover.value ? this.data.cover.value : GRADIENTS[0].key);
  protected readonly color = signal(this.data.cover.type === 'color' && this.data.cover.value ? this.data.cover.value : COLORS[0]);
  protected readonly offset = signal(0.5);
  protected readonly hasImage = signal(false);
  protected readonly busy = signal(false);

  private bitmap: ImageBitmap | null = null;
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('preview');

  protected previewBackground(): string {
    if (this.tab() === 0) return coverBackground({ type: 'gradient', value: this.gradient() }) ?? '';
    if (this.tab() === 1) return this.color();
    return 'var(--mat-sys-surface-container-high)';
  }

  constructor() {
    effect(() => {
      const offset = this.offset();
      const canvas = this.canvas()?.nativeElement;
      if (canvas && this.bitmap && this.hasImage()) render(canvas, this.bitmap, offset);
    });
  }

  protected onColor(e: Event): void {
    this.color.set((e.target as HTMLInputElement).value);
  }

  protected async onFile(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.notify.error('Please choose a JPEG, PNG or WebP image.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      this.notify.error('That image is very large. Choose one under 25 MB.');
      return;
    }
    try {
      this.bitmap?.close();
      this.bitmap = await createImageBitmap(file);
      this.hasImage.set(true);
      this.offset.set(0.5);
    } catch {
      this.notify.error('Could not read that image.');
    }
  }

  protected remove(): void {
    this.ref.close({ type: 'none' });
  }

  protected async apply(): Promise<void> {
    if (this.tab() === 0) return this.ref.close({ type: 'gradient', value: this.gradient() });
    if (this.tab() === 1) return this.ref.close({ type: 'color', value: this.color() });

    const canvas = this.canvas()?.nativeElement;
    if (!canvas || !this.bitmap) return;
    this.busy.set(true);
    try {
      this.ref.close({ type: 'image', blob: await toBlob(canvas) });
    } catch {
      this.notify.error('Could not process that image.');
      this.busy.set(false);
    }
  }
}
