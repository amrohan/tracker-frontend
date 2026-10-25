import {
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from "@angular/core";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { NZ_MODAL_DATA, NzModalRef } from "ng-zorro-antd/modal";
import { NzTabsModule } from "ng-zorro-antd/tabs";
import { COLOR_THEMES } from "../core/color-themes";
import { Notify } from "../core/notify.service";
import { ThemeService } from "../core/theme.service";
import { WebShareService } from "../core/web-share.service";

export interface ShareField {
  label: string;
  value: string;
}

export interface ShareDialogData {
  type: "record" | "collection";
  title: string;
  subtitle?: string;
  icon?: string;
  /** @deprecated Colors now come from the user's theme. */
  coverColor?: string;
  fields?: ShareField[];
  url?: string;
}

type ShareFormat = "text" | "image" | "pdf" | "link";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const EMOJI_FONT =
  "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";

// ─── Color helpers ────────────────────────────────────────────────────────────

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  let h = hex.replace("#", "").trim();
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: RGB): string {
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.round(Math.max(0, Math.min(255, v)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/** Mixes `a` with `b`; `t` is the share of `a` (0–1). */
function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex([
    ca[0] * t + cb[0] * (1 - t),
    ca[1] * t + cb[1] * (1 - t),
    ca[2] * t + cb[2] * (1 - t),
  ]);
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

interface Palette {
  dark: boolean;
  primary: string;
  /** Primary adjusted so small text stays readable on `surface`. */
  accentText: string;
  /** Soft primary wash for icon tiles. */
  tint: string;
  backdrop: string;
  surface: string;
  text: string;
  muted: string;
  line: string;
  border: string;
}

function buildPalette(primary: string, dark: boolean): Palette {
  const surface = dark ? "#1f1f1f" : "#ffffff";
  const lum = luminance(primary);
  let accentText = primary;
  if (!dark && lum > 0.3) accentText = mix(primary, "#000000", 0.6);
  if (dark && lum < 0.12) accentText = mix(primary, "#ffffff", 0.65);

  return {
    dark,
    primary,
    accentText,
    tint: mix(primary, surface, dark ? 0.22 : 0.12),
    backdrop: dark
      ? mix(primary, "#101010", 0.08)
      : mix(primary, "#f6f6f6", 0.07),
    surface,
    text: dark ? "#f2f2f2" : "#141414",
    muted: "#8a8a8a",
    line: dark ? "#303030" : "#eeeeee",
    border: dark ? "#2c2c2c" : "#e6e6e6",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: "app-share-dialog",
  imports: [NzButtonModule, NzIconModule, NzInputModule, NzTabsModule],
  template: `
    <!-- Header -->
    <div class="flex items-center gap-2.5 mb-3 pr-8">
      <div
        class="w-8 h-8 rounded-lg bg-(--app-primary-container) text-(--app-primary) flex items-center justify-center text-base flex-none"
      >
        <nz-icon nzType="share-alt" />
      </div>
      <div class="min-w-0">
        <h3 class="text-base font-bold text-(--app-text) leading-tight m-0">
          Share {{ kindLabel }}
        </h3>
        <p class="text-xs text-(--app-text-muted) m-0">
          Export as text, image, PDF, or link
        </p>
      </div>
    </div>

    <nz-tabs
      [nzSelectedIndex]="tabIndex()"
      (nzSelectedIndexChange)="tabIndex.set($event)"
      nzSize="small"
    >
      <!-- TEXT -->
      <nz-tab [nzTitle]="textTitle">
        <ng-template #textTitle>
          <nz-icon nzType="file-text" /> Text
        </ng-template>

        <div class="flex flex-col gap-2.5 pt-2">
          <div class="flex items-center justify-between">
            <span
              class="text-xs font-semibold text-(--app-text-muted) uppercase tracking-wider"
            >
              Preview
            </span>
            <button
              nz-button
              nzType="text"
              nzSize="small"
              (click)="copyText()"
              class="text-(--app-primary)!"
            >
              <nz-icon [nzType]="copied() ? 'check' : 'copy'" />
              <span>{{ copied() ? "Copied" : "Copy" }}</span>
            </button>
          </div>

          <div
            class="p-4 rounded-xl border border-(--app-outline-variant) bg-(--app-surface-container) text-(--app-text) text-[13px] whitespace-pre-wrap leading-relaxed select-all max-h-64 overflow-y-auto"
          >
            {{ formattedText() }}
          </div>
        </div>
      </nz-tab>

      <!-- IMAGE -->
      <nz-tab [nzTitle]="imageTitle">
        <ng-template #imageTitle>
          <nz-icon nzType="file-image" /> Image
        </ng-template>

        <div class="flex flex-col gap-2.5 pt-2">
          <div class="flex items-center justify-between">
            <span
              class="text-xs font-semibold text-(--app-text-muted) uppercase tracking-wider"
            >
              Card preview
            </span>
            <span class="text-xs text-(--app-text-muted)">PNG · 2x</span>
          </div>

          <div
            class="rounded-xl border border-(--app-outline-variant) bg-(--app-surface-container) flex justify-center items-center overflow-hidden min-h-40"
          >
            @if (generatingImage()) {
              <div
                class="py-12 flex flex-col items-center gap-2 text-xs text-(--app-text-muted)"
              >
                <nz-icon
                  nzType="loading"
                  class="text-xl text-(--app-primary)"
                />
                <span>Rendering…</span>
              </div>
            } @else if (cardImageUrl()) {
              <img
                [src]="cardImageUrl()"
                alt="Share card preview"
                class="block w-full max-h-96 object-contain"
              />
            } @else {
              <span class="text-xs text-(--app-text-muted)">
                Could not render the card.
              </span>
            }
          </div>
        </div>
      </nz-tab>

      <!-- PDF -->
      <nz-tab [nzTitle]="pdfTitle">
        <ng-template #pdfTitle> <nz-icon nzType="file-pdf" /> PDF </ng-template>

        <div class="flex flex-col gap-2.5 pt-2">
          <div class="flex items-center justify-between">
            <span
              class="text-xs font-semibold text-(--app-text-muted) uppercase tracking-wider"
            >
              Print preview
            </span>
            <span class="text-xs text-(--app-text-muted)"
              >Print or save as PDF</span
            >
          </div>

          <!-- Paper is always white, like the printed page -->
          <div
            class="rounded-lg overflow-hidden max-h-80 overflow-y-auto border"
            style="background: #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06);"
            [style.border-color]="paper().border"
          >
            <div class="h-1" [style.background]="paper().primary"></div>

            <div class="px-6 pt-6 pb-4 flex flex-col gap-6">
              <div class="flex items-start gap-3.5">
                <div
                  class="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-none"
                  [style.background]="paper().tint"
                >
                  {{ data.icon || "📋" }}
                </div>
                <div class="min-w-0">
                  <div
                    class="text-[10px] font-bold uppercase tracking-[0.14em]"
                    [style.color]="paper().accentText"
                  >
                    {{ kindLabel }}
                  </div>
                  <h4
                    class="text-lg font-bold leading-snug mt-0.5"
                    [style.color]="paper().text"
                  >
                    {{ data.title }}
                  </h4>
                  @if (data.subtitle) {
                    <p
                      class="text-[13px] m-0 mt-0.5"
                      [style.color]="paper().muted"
                    >
                      {{ data.subtitle }}
                    </p>
                  }
                </div>
              </div>

              @if (data.fields?.length) {
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  @for (f of data.fields; track f.label) {
                    <div
                      class="py-3 border-t"
                      [style.border-color]="paper().line"
                    >
                      <div
                        class="text-[10px] font-semibold uppercase tracking-[0.1em]"
                        [style.color]="paper().muted"
                      >
                        {{ f.label }}
                      </div>
                      <div
                        class="text-[13px] font-semibold mt-1 break-words"
                        [style.color]="paper().text"
                      >
                        {{ f.value }}
                      </div>
                    </div>
                  }
                </div>
              }

              <div
                class="flex items-center justify-between text-[10px] pt-3 border-t"
                [style.border-color]="paper().line"
                [style.color]="paper().muted"
              >
                <span>Personal Tracker</span>
                <span>{{ currentDateStr }}</span>
              </div>
            </div>
          </div>
        </div>
      </nz-tab>

      <!-- LINK -->
      <nz-tab [nzTitle]="linkTitle">
        <ng-template #linkTitle> <nz-icon nzType="link" /> Link </ng-template>

        <div class="flex flex-col gap-2.5 pt-2">
          <span
            class="text-xs font-semibold text-(--app-text-muted) uppercase tracking-wider"
          >
            Shareable link
          </span>
          <div class="flex gap-2">
            <input
              nz-input
              readonly
              [value]="shareUrl()"
              class="rounded-lg! font-mono text-xs"
              (click)="$any($event.target).select()"
            />
            <button nz-button nzType="primary" (click)="copyLink()">
              <nz-icon [nzType]="copied() ? 'check' : 'copy'" />
              <span>{{ copied() ? "Copied" : "Copy" }}</span>
            </button>
          </div>
        </div>
      </nz-tab>
    </nz-tabs>

    <!-- Footer -->
    <div
      class="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-(--app-outline-variant)"
    >
      <button nz-button nzType="default" (click)="close()">Close</button>

      <div class="flex flex-wrap items-center justify-end gap-2">
        @switch (activeFormat()) {
          @case ("text") {
            <button nz-button nzType="default" (click)="copyText()">
              <nz-icon [nzType]="copied() ? 'check' : 'copy'" />
              <span>Copy text</span>
            </button>
            @if (canShare()) {
              <button nz-button nzType="primary" (click)="shareNativeText()">
                <nz-icon nzType="share-alt" />
                <span>Share</span>
              </button>
            }
          }
          @case ("image") {
            <button
              nz-button
              nzType="default"
              [disabled]="!cardImageUrl()"
              (click)="copyImage()"
            >
              <nz-icon nzType="copy" />
              <span>Copy</span>
            </button>
            <button
              nz-button
              nzType="default"
              [disabled]="!cardImageUrl()"
              (click)="downloadImage()"
            >
              <nz-icon nzType="download" />
              <span>Download</span>
            </button>
            @if (canShare()) {
              <button
                nz-button
                nzType="primary"
                [disabled]="!cardImageUrl()"
                (click)="shareNativeImage()"
              >
                <nz-icon nzType="share-alt" />
                <span>Share</span>
              </button>
            }
          }
          @case ("pdf") {
            <button nz-button nzType="primary" (click)="printDocument()">
              <nz-icon nzType="printer" />
              <span>Print / Save as PDF</span>
            </button>
          }
          @case ("link") {
            <button nz-button nzType="default" (click)="copyLink()">
              <nz-icon [nzType]="copied() ? 'check' : 'copy'" />
              <span>Copy link</span>
            </button>
            @if (canShare()) {
              <button nz-button nzType="primary" (click)="shareNativeLink()">
                <nz-icon nzType="share-alt" />
                <span>Share</span>
              </button>
            }
          }
        }
      </div>
    </div>
  `,
})
export class ShareDialog implements OnDestroy {
  protected readonly data = inject<ShareDialogData>(NZ_MODAL_DATA);
  private readonly modalRef = inject(NzModalRef);
  private readonly notify = inject(Notify);
  private readonly webShare = inject(WebShareService);
  private readonly theme = inject(ThemeService);

  private static readonly FORMATS: ShareFormat[] = [
    "text",
    "image",
    "pdf",
    "link",
  ];

  readonly tabIndex = signal(0);
  readonly activeFormat = computed<ShareFormat>(
    () => ShareDialog.FORMATS[this.tabIndex()] ?? "text",
  );

  readonly copied = signal(false);
  readonly cardImageUrl = signal<string | null>(null);
  readonly generatingImage = signal(true);
  private imageBlob: Blob | null = null;
  private renderToken = 0;

  readonly kindLabel = this.data.type === "record" ? "Record" : "Tracker";

  readonly currentDateStr = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date());

  readonly canShare = computed(() => this.webShare.canShare());

  readonly shareUrl = computed(
    () =>
      this.data.url ||
      (typeof window !== "undefined" ? window.location.href : ""),
  );

  // ─── Theme-driven palettes ──────────────────────────────────────────────────

  private readonly primary = computed(
    () =>
      (
        COLOR_THEMES.find((t) => t.key === this.theme.colorTheme()) ??
        COLOR_THEMES[0]
      ).primary,
  );

  /** Image card follows the app's light/dark mode. */
  private readonly cardPalette = computed(() =>
    buildPalette(this.primary(), this.theme.mode() === "dark"),
  );

  /** Print/PDF is always light, since it's paper. */
  readonly paper = computed(() => buildPalette(this.primary(), false));

  readonly formattedText = computed(() => {
    const d = this.data;
    const lines: string[] = [];
    lines.push(d.icon ? `${d.icon} ${d.title}` : d.title);
    if (d.subtitle) lines.push(d.subtitle);

    if (d.fields?.length) {
      lines.push("");
      for (const f of d.fields) lines.push(`${f.label}: ${f.value}`);
    }

    if (d.url) {
      lines.push("");
      lines.push(d.url);
    }

    lines.push("");
    lines.push(`Shared from Personal Tracker · ${this.currentDateStr}`);
    return lines.join("\n");
  });

  constructor() {
    // Re-render the card whenever the user's color theme or light/dark mode changes
    effect(() => {
      const palette = this.cardPalette();
      untracked(() => void this.generateCardImage(palette));
    });
  }

  ngOnDestroy(): void {
    const url = this.cardImageUrl();
    if (url) URL.revokeObjectURL(url);
  }

  close(): void {
    this.modalRef.close();
  }

  // ─── Copy / share ───────────────────────────────────────────────────────────

  async copyText(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.formattedText());
      this.triggerCopied();
      this.notify.success("Text copied to clipboard.");
    } catch {
      this.notify.error("Failed to copy text.");
    }
  }

  async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.shareUrl());
      this.triggerCopied();
      this.notify.success("Link copied to clipboard.");
    } catch {
      this.notify.error("Failed to copy link.");
    }
  }

  private triggerCopied(): void {
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  async shareNativeText(): Promise<void> {
    await this.webShare.share({
      title: this.data.title,
      text: this.formattedText(),
      url: this.data.url,
    });
  }

  async shareNativeLink(): Promise<void> {
    await this.webShare.share({
      title: this.data.title,
      text: this.data.subtitle,
      url: this.shareUrl(),
    });
  }

  // ─── Image card ─────────────────────────────────────────────────────────────

  private async generateCardImage(p: Palette): Promise<void> {
    const token = ++this.renderToken;
    this.generatingImage.set(true);

    try {
      try {
        await document.fonts?.ready;
      } catch {
        /* ignore */
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const setSpacing = (v: string) => {
        if ("letterSpacing" in ctx) {
          (ctx as unknown as { letterSpacing: string }).letterSpacing = v;
        }
      };

      const fields = this.data.fields ?? [];

      // ── Layout constants ──
      const scale = 2;
      const W = 760;
      const pad = 32;
      const cardW = W - pad * 2;
      const inner = 36;
      const tile = 56;
      const colGap = 28;
      const rowGap = 22;
      const textX = inner + tile + 18;
      const textW = cardW - textX - inner;
      const colW = (cardW - inner * 2 - colGap) / 2;

      // ── Measure ──
      ctx.font = `700 26px ${FONT}`;
      const titleLines = this.wrapText(ctx, this.data.title, textW, 2);
      ctx.font = `400 14px ${FONT}`;
      const subLines = this.data.subtitle
        ? this.wrapText(ctx, this.data.subtitle, textW, 2)
        : [];

      const y0 = 48;
      const eyebrowY = y0 + 12;
      const titleY = eyebrowY + 34;
      const lastTitleY = titleY + (titleLines.length - 1) * 32;
      const subY = lastTitleY + 26;
      const textBottom =
        (subLines.length ? subY + (subLines.length - 1) * 20 : lastTitleY) + 6;
      const headerBottom = Math.max(y0 + tile, textBottom) + 30;

      ctx.font = `600 16px ${FONT}`;
      const valueLines = fields.map((f) =>
        this.wrapText(ctx, f.value, colW, 3),
      );
      const cellH = valueLines.map((l) => 34 + (l.length - 1) * 22 + 8);
      const rowHeights: number[] = [];
      for (let i = 0; i < fields.length; i += 2) {
        rowHeights.push(Math.max(cellH[i], cellH[i + 1] ?? 0));
      }
      const gridH = rowHeights.length
        ? rowHeights.reduce((a, b) => a + b, 0) +
          (rowHeights.length - 1) * rowGap
        : 0;

      const gridTop = headerBottom + 28;
      const gridBottom = fields.length ? gridTop + gridH : headerBottom - 12;
      const footerLineY = gridBottom + 30;
      const cardH = footerLineY + 56;
      const H = cardH + pad * 2;

      // ── Draw ──
      canvas.width = W * scale;
      canvas.height = H * scale;
      ctx.scale(scale, scale);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";

      // Backdrop, tinted slightly by the theme color
      ctx.fillStyle = p.backdrop;
      ctx.fillRect(0, 0, W, H);

      const cx = pad;
      const cy = pad;

      // Card + shadow
      ctx.save();
      ctx.shadowColor = p.dark ? "rgba(0,0,0,0.45)" : "rgba(20,20,20,0.08)";
      ctx.shadowBlur = 32;
      ctx.shadowOffsetY = 10;
      ctx.fillStyle = p.surface;
      this.roundRect(ctx, cx, cy, cardW, cardH, 22);
      ctx.fill();
      ctx.restore();

      // Accent bar (clipped to card shape)
      ctx.save();
      this.roundRect(ctx, cx, cy, cardW, cardH, 22);
      ctx.clip();
      ctx.fillStyle = p.primary;
      ctx.fillRect(cx, cy, cardW, 5);
      ctx.restore();

      // Hairline border
      ctx.strokeStyle = p.border;
      ctx.lineWidth = 1;
      this.roundRect(ctx, cx + 0.5, cy + 0.5, cardW - 1, cardH - 1, 22);
      ctx.stroke();

      // Icon tile
      const tileX = cx + inner;
      const tileY = cy + y0;
      ctx.fillStyle = p.tint;
      this.roundRect(ctx, tileX, tileY, tile, tile, 16);
      ctx.fill();

      ctx.font = `28px ${EMOJI_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = p.text;
      ctx.fillText(
        this.data.icon || "📋",
        tileX + tile / 2,
        tileY + tile / 2 + 2,
      );
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";

      // Eyebrow
      ctx.fillStyle = p.accentText;
      ctx.font = `700 11px ${FONT}`;
      setSpacing("1.6px");
      ctx.fillText(this.kindLabel.toUpperCase(), cx + textX, cy + eyebrowY);
      setSpacing("0px");

      // Title
      ctx.fillStyle = p.text;
      ctx.font = `700 26px ${FONT}`;
      titleLines.forEach((line, i) =>
        ctx.fillText(line, cx + textX, cy + titleY + i * 32),
      );

      // Subtitle
      if (subLines.length) {
        ctx.fillStyle = p.muted;
        ctx.font = `400 14px ${FONT}`;
        subLines.forEach((line, i) =>
          ctx.fillText(line, cx + textX, cy + subY + i * 20),
        );
      }

      // Fields
      if (fields.length) {
        // Divider under header
        ctx.strokeStyle = p.line;
        ctx.beginPath();
        ctx.moveTo(cx + inner, cy + headerBottom);
        ctx.lineTo(cx + cardW - inner, cy + headerBottom);
        ctx.stroke();

        let rowY = cy + gridTop;
        rowHeights.forEach((rh, r) => {
          for (let c = 0; c < 2; c++) {
            const idx = r * 2 + c;
            if (idx >= fields.length) break;
            const x = cx + inner + c * (colW + colGap);

            ctx.fillStyle = p.muted;
            ctx.font = `700 10.5px ${FONT}`;
            setSpacing("1px");
            ctx.fillText(fields[idx].label.toUpperCase(), x, rowY + 10);
            setSpacing("0px");

            ctx.fillStyle = p.text;
            ctx.font = `600 16px ${FONT}`;
            valueLines[idx].forEach((line, li) =>
              ctx.fillText(line, x, rowY + 34 + li * 22),
            );
          }
          rowY += rh + rowGap;
        });
      }

      // Footer
      const fy = cy + footerLineY;
      ctx.strokeStyle = p.line;
      ctx.beginPath();
      ctx.moveTo(cx + inner, fy);
      ctx.lineTo(cx + cardW - inner, fy);
      ctx.stroke();

      ctx.fillStyle = p.muted;
      ctx.font = `500 12px ${FONT}`;
      ctx.fillText("Shared from Personal Tracker", cx + inner, fy + 32);
      ctx.textAlign = "right";
      ctx.fillText(this.currentDateStr, cx + cardW - inner, fy + 32);
      ctx.textAlign = "left";

      // Export
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (token !== this.renderToken) return; // a newer render superseded this one

      if (blob) {
        const old = this.cardImageUrl();
        if (old) URL.revokeObjectURL(old);
        this.imageBlob = blob;
        this.cardImageUrl.set(URL.createObjectURL(blob));
      }
    } catch {
      if (token === this.renderToken) {
        this.notify.error("Failed to render image card.");
      }
    } finally {
      if (token === this.renderToken) this.generatingImage.set(false);
    }
  }

  /** Word-wraps to maxWidth, truncating with an ellipsis after maxLines. */
  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    maxLines: number,
  ): string[] {
    const words = String(text ?? "")
      .split(/\s+/)
      .filter(Boolean);
    const lines: string[] = [];
    let line = "";

    for (let word of words) {
      // Split words wider than a whole line
      while (ctx.measureText(word).width > maxWidth && word.length > 1) {
        let cut = word.length;
        while (
          cut > 1 &&
          ctx.measureText(word.slice(0, cut)).width > maxWidth
        ) {
          cut--;
        }
        if (line) {
          lines.push(line);
          line = "";
        }
        lines.push(word.slice(0, cut));
        word = word.slice(cut);
      }

      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    if (!lines.length) return [""];

    if (lines.length > maxLines) {
      const kept = lines.slice(0, maxLines);
      let last = kept[maxLines - 1];
      while (last.length > 1 && ctx.measureText(last + "…").width > maxWidth) {
        last = last.slice(0, -1);
      }
      kept[maxLines - 1] = last.trimEnd() + "…";
      return kept;
    }
    return lines;
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  downloadImage(): void {
    const url = this.cardImageUrl();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${this.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-card.png`;
    a.click();
    this.notify.success("Image downloaded.");
  }

  async copyImage(): Promise<void> {
    if (!this.imageBlob) {
      this.notify.error("Image card not ready yet.");
      return;
    }
    try {
      if (typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": this.imageBlob }),
        ]);
        this.notify.success("Image copied to clipboard.");
      } else {
        this.downloadImage();
      }
    } catch {
      this.downloadImage();
    }
  }

  async shareNativeImage(): Promise<void> {
    if (!this.imageBlob) return;
    const file = new File(
      [this.imageBlob],
      `${this.data.title.replace(/[^a-zA-Z0-9]+/g, "-")}.png`,
      { type: "image/png" },
    );
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ title: this.data.title, files: [file] });
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          this.downloadImage();
        }
      }
    } else {
      this.downloadImage();
    }
  }

  // ─── Print / PDF ────────────────────────────────────────────────────────────

  private esc(value: string): string {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  printDocument(): void {
    const p = this.paper();
    const d = this.data;

    const fieldsHtml = (d.fields ?? [])
      .map(
        (f) => `
        <div class="field">
          <div class="label">${this.esc(f.label)}</div>
          <div class="value">${this.esc(f.value)}</div>
        </div>`,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${this.esc(d.title)}</title>
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      body {
        font-family: ${FONT};
        color: ${p.text};
        background: #fff;
      }
      .bar { height: 6px; background: ${p.primary}; }
      .page { padding: 18mm 18mm 14mm; }

      .head { display: flex; align-items: flex-start; gap: 18px; }
      .tile {
        width: 56px; height: 56px; flex: none;
        border-radius: 16px; background: ${p.tint};
        display: flex; align-items: center; justify-content: center;
        font-size: 28px;
      }
      .eyebrow {
        font-size: 10.5px; font-weight: 700; letter-spacing: 0.16em;
        text-transform: uppercase; color: ${p.accentText};
      }
      .title { font-size: 28px; font-weight: 700; line-height: 1.2; margin: 6px 0 0; color: ${p.text}; }
      .subtitle { font-size: 14px; color: ${p.muted}; margin: 6px 0 0; }

      .grid {
        display: grid; grid-template-columns: 1fr 1fr;
        column-gap: 36px; margin-top: 36px;
      }
      .field { padding: 14px 0 16px; border-top: 1px solid ${p.line}; break-inside: avoid; }
      .label {
        font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
        text-transform: uppercase; color: ${p.muted};
      }
      .value {
        font-size: 15px; font-weight: 600; margin-top: 6px;
        line-height: 1.45; word-break: break-word; color: ${p.text};
      }

      .footer {
        margin-top: 40px; padding-top: 14px; border-top: 1px solid ${p.line};
        display: flex; justify-content: space-between;
        font-size: 11px; color: ${p.muted};
      }
    </style>
  </head>
  <body>
    <div class="bar"></div>
    <div class="page">
      <div class="head">
        <div class="tile">${this.esc(d.icon || "📋")}</div>
        <div>
          <div class="eyebrow">${this.esc(this.kindLabel)}</div>
          <h1 class="title">${this.esc(d.title)}</h1>
          ${d.subtitle ? `<p class="subtitle">${this.esc(d.subtitle)}</p>` : ""}
        </div>
      </div>
      ${fieldsHtml ? `<div class="grid">${fieldsHtml}</div>` : ""}
      <div class="footer">
        <span>Personal Tracker</span>
        <span>${this.esc(this.currentDateStr)}</span>
      </div>
    </div>
  </body>
</html>`;

    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "0",
      height: "0",
      border: "none",
    });
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = win?.document;
    if (!win || !doc) {
      iframe.remove();
      this.notify.error("Could not open print view.");
      return;
    }

    const cleanup = () => iframe.remove();
    win.onafterprint = cleanup;
    setTimeout(cleanup, 60_000); // safety net

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      win.focus();
      win.print();
    }, 250);
  }
}
