import {
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NZ_MODAL_DATA, NzModalModule, NzModalRef } from "ng-zorro-antd/modal";
import { NzSegmentedModule } from "ng-zorro-antd/segmented";
import { NzTagModule } from "ng-zorro-antd/tag";
import { Notify } from "../core/notify.service";
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
  coverColor?: string;
  fields?: ShareField[];
  url?: string;
}

@Component({
  selector: "app-share-dialog",
  imports: [
    FormsModule,
    NzModalModule,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
  ],
  template: `
    <div *nzModalTitle class="flex items-center gap-2">
      <div
        class="w-8 h-8 rounded-lg bg-(--app-primary-container) text-(--app-primary) flex items-center justify-center text-base flex-none"
      >
        <nz-icon nzType="share-alt" />
      </div>
      <div>
        <h3 class="text-base font-bold text-(--app-text) leading-tight m-0">
          Share {{ data.type === "record" ? "Record" : "Tracker" }}
        </h3>
        <p class="text-xs text-(--app-text-muted) m-0">
          Export or share as formatted text, image card, PDF, or link
        </p>
      </div>
    </div>

    <!-- Format Selector Pills -->
    <div
      class="flex p-1 rounded-xl bg-(--app-surface-container) border border-(--app-outline-variant) gap-1"
      role="tablist"
    >
      @for (fmt of formats; track fmt.id) {
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="activeFormat() === fmt.id"
          (click)="activeFormat.set(fmt.id)"
          class="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none"
          [class.bg-(--app-surface)]="activeFormat() === fmt.id"
          [class.text-(--app-primary)]="activeFormat() === fmt.id"
          [class.shadow-2xs]="activeFormat() === fmt.id"
          [class.text-(--app-text-muted)]="activeFormat() !== fmt.id"
        >
          <nz-icon [nzType]="fmt.icon" class="text-sm" />
          <span>{{ fmt.label }}</span>
        </button>
      }
    </div>

    <!-- FORMAT 1: TEXT / MARKDOWN PREVIEW -->
    @if (activeFormat() === "text") {
      <div class="flex flex-col gap-2.5">
        <div class="flex items-center justify-between">
          <span
            class="text-xs font-semibold text-(--app-text-muted) uppercase tracking-wider"
          >
            Text Preview (Markdown / Plaintext)
          </span>
          <button
            nz-button
            nzType="text"
            nzSize="small"
            (click)="copyText()"
            class="flex items-center gap-1 text-(--app-primary)!"
          >
            <nz-icon [nzType]="copied() ? 'check' : 'copy'" />
            <span>{{ copied() ? "Copied!" : "Copy text" }}</span>
          </button>
        </div>

        <div
          class="p-3.5 rounded-xl border border-(--app-outline-variant) bg-(--app-surface-container-high) text-(--app-text) font-mono text-xs whitespace-pre-wrap leading-relaxed select-all max-h-64 overflow-y-auto"
        >
          {{ formattedText() }}
        </div>
      </div>
    }

    <!-- FORMAT 2: IMAGE CARD PREVIEW -->
    @if (activeFormat() === "image") {
      <div class="flex flex-col gap-2.5">
        <div class="flex items-center justify-between">
          <span
            class="text-xs font-semibold text-(--app-text-muted) uppercase tracking-wider"
          >
            Visual Card Preview
          </span>
          <span class="text-xs text-(--app-text-muted)"
            >High Resolution PNG</span
          >
        </div>

        <!-- Image container -->
        <div
          class="relative rounded-2xl border border-(--app-outline-variant) bg-(--app-surface-container) p-3 flex justify-center items-center overflow-hidden max-h-72"
        >
          @if (generatingImage()) {
            <div
              class="py-12 flex flex-col items-center gap-2 text-xs text-(--app-text-muted)"
            >
              <nz-icon nzType="loading" class="text-xl text-(--app-primary)" />
              <span>Rendering high-res card...</span>
            </div>
          } @else if (cardImageUrl()) {
            <img
              [src]="cardImageUrl()"
              alt="Shared card preview"
              class="max-w-full max-h-64 rounded-xl shadow-md object-contain border border-(--app-outline-variant)"
            />
          }
        </div>
      </div>
    }

    <!-- FORMAT 3: PDF / PRINT DOCUMENT -->
    @if (activeFormat() === "pdf") {
      <div class="flex flex-col gap-2.5">
        <div class="flex items-center justify-between">
          <span
            class="text-xs font-semibold text-(--app-text-muted) uppercase tracking-wider"
          >
            Printable PDF Document
          </span>
          <span class="text-xs text-(--app-text-muted)"
            >Print / Save as PDF</span
          >
        </div>

        <!-- Print Preview Card -->
        <div
          class="p-4 sm:p-6 rounded-2xl border border-(--app-outline-variant) bg-(--app-surface) shadow-2xs flex flex-col gap-3.5 max-h-64 overflow-y-auto"
        >
          <div
            class="flex items-center gap-3 border-b border-(--app-outline-variant) pb-3"
          >
            <span class="text-2xl">{{ data.icon || "📋" }}</span>
            <div>
              <h4 class="text-base font-bold text-(--app-text) m-0">
                {{ data.title }}
              </h4>
              @if (data.subtitle) {
                <p class="text-xs text-(--app-text-muted) m-0">
                  {{ data.subtitle }}
                </p>
              }
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            @for (f of data.fields || []; track f.label) {
              <div class="p-2 rounded-lg bg-(--app-surface-container)">
                <span
                  class="block text-[11px] font-semibold text-(--app-text-muted) uppercase tracking-wider"
                >
                  {{ f.label }}
                </span>
                <span
                  class="block text-xs font-medium text-(--app-text) mt-0.5"
                >
                  {{ f.value }}
                </span>
              </div>
            }
          </div>

          <div
            class="text-[10px] text-(--app-text-muted) text-right pt-2 border-t border-(--app-outline-variant)"
          >
            Personal Tracker · {{ currentDateStr }}
          </div>
        </div>
      </div>
    }

    <!-- FORMAT 4: LINK -->
    @if (activeFormat() === "link") {
      <div class="flex flex-col gap-2.5">
        <span
          class="text-xs font-semibold text-(--app-text-muted) uppercase tracking-wider"
        >
          Shareable Link
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
    }

    <!-- Hidden canvas for rendering image cards -->
    <canvas #canvas class="hidden"></canvas>

    <!-- Modal Footer Actions -->
    <div *nzModalFooter class="flex items-center justify-between gap-2">
      <button nz-button nzType="default" (click)="close()">Close</button>

      <div class="flex items-center gap-2">
        @if (activeFormat() === "text") {
          <button nz-button nzType="default" (click)="copyText()">
            <nz-icon [nzType]="copied() ? 'check' : 'copy'" />
            <span>Copy Text</span>
          </button>
          @if (canShare()) {
            <button nz-button nzType="primary" (click)="shareNativeText()">
              <nz-icon nzType="share-alt" />
              <span>Share Text</span>
            </button>
          }
        }

        @if (activeFormat() === "image") {
          <button nz-button nzType="default" (click)="copyImage()">
            <nz-icon nzType="copy" />
            <span>Copy Image</span>
          </button>
          <button nz-button nzType="default" (click)="downloadImage()">
            <nz-icon nzType="download" />
            <span>Download PNG</span>
          </button>
          @if (canShare()) {
            <button nz-button nzType="primary" (click)="shareNativeImage()">
              <nz-icon nzType="share-alt" />
              <span>Share Image</span>
            </button>
          }
        }

        @if (activeFormat() === "pdf") {
          <button nz-button nzType="primary" (click)="printDocument()">
            <nz-icon nzType="printer" />
            <span>Print / Save as PDF</span>
          </button>
        }

        @if (activeFormat() === "link") {
          <button nz-button nzType="default" (click)="copyLink()">
            <nz-icon [nzType]="copied() ? 'check' : 'copy'" />
            <span>Copy Link</span>
          </button>
          @if (canShare()) {
            <button nz-button nzType="primary" (click)="shareNativeLink()">
              <nz-icon nzType="share-alt" />
              <span>Share Link</span>
            </button>
          }
        }
      </div>
    </div>
  `,
})
export class ShareDialog implements OnInit {
  protected readonly data = inject<ShareDialogData>(NZ_MODAL_DATA);
  private readonly modalRef = inject(NzModalRef);
  private readonly notify = inject(Notify);
  private readonly webShare = inject(WebShareService);

  private readonly canvasRef =
    viewChild<ElementRef<HTMLCanvasElement>>("canvas");

  readonly activeFormat = signal<"text" | "image" | "pdf" | "link">("text");
  readonly copied = signal(false);
  readonly cardImageUrl = signal<string | null>(null);
  readonly generatingImage = signal(false);
  private imageBlob: Blob | null = null;

  readonly formats = [
    { id: "text", label: "Text", icon: "file-text" },
    { id: "image", label: "Image Card", icon: "file-image" },
    { id: "pdf", label: "PDF / Print", icon: "file-pdf" },
    { id: "link", label: "Link", icon: "link" },
  ] as const;

  readonly currentDateStr = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date());

  readonly canShare = computed(() => this.webShare.canShare());

  readonly shareUrl = computed(() => {
    return (
      this.data.url ||
      (typeof window !== "undefined" ? window.location.href : "")
    );
  });

  readonly formattedText = computed(() => {
    const d = this.data;
    const lines: string[] = [];
    lines.push(`📌 ${d.title}`);
    if (d.subtitle) {
      lines.push(`📁 Tracker: ${d.subtitle}`);
    }
    lines.push("─".repeat(32));

    if (d.fields && d.fields.length > 0) {
      for (const f of d.fields) {
        lines.push(`• ${f.label}: ${f.value}`);
      }
      lines.push("─".repeat(32));
    }

    if (d.url) {
      lines.push(`🔗 ${d.url}`);
    }
    lines.push(`Shared via Personal Tracker · ${this.currentDateStr}`);
    return lines.join("\n");
  });

  async ngOnInit(): Promise<void> {
    // Generate the card image once initialized
    setTimeout(() => this.generateCardImage(), 50);
  }

  close(): void {
    this.modalRef.close();
  }

  async copyText(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.formattedText());
      this.triggerCopied();
      this.notify.success("Formatted text copied to clipboard!");
    } catch {
      this.notify.error("Failed to copy text.");
    }
  }

  async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.shareUrl());
      this.triggerCopied();
      this.notify.success("Link copied to clipboard!");
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

  /** Renders the visual card into HTML5 Canvas */
  private async generateCardImage(): Promise<void> {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    this.generatingImage.set(true);
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const scale = 2; // retina sharp
      const width = 640;
      const fields = this.data.fields || [];

      // Calculate required height based on number of fields
      const fieldRows = Math.ceil(fields.length / 2);
      const height = Math.max(380, 240 + fieldRows * 64);

      canvas.width = width * scale;
      canvas.height = height * scale;
      ctx.scale(scale, scale);

      // Card background
      ctx.fillStyle = "#ffffff";
      this.roundRect(ctx, 0, 0, width, height, 20);
      ctx.fill();

      // Top decorative banner
      const grad = ctx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, "#0e7c86");
      grad.addColorStop(1, "#369ca7");
      ctx.fillStyle = grad;
      this.roundRect(ctx, 0, 0, width, 80, [20, 20, 0, 0]);
      ctx.fill();

      // Top brand badge
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font =
        "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("PERSONAL TRACKER", 24, 28);

      // Icon badge
      const icon = this.data.icon || "📋";
      ctx.fillStyle = "#ffffff";
      this.roundRect(ctx, 24, 46, 56, 56, 14);
      ctx.fill();
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = "28px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(icon, 52, 74);

      // Reset text align
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";

      // Title & Subtitle
      ctx.fillStyle = "#111827";
      ctx.font =
        "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(this.data.title, 96, 78);

      if (this.data.subtitle) {
        ctx.fillStyle = "#6b7280";
        ctx.font =
          "13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillText(this.data.subtitle, 96, 96);
      }

      // Fields grid (2 columns)
      const startY = 130;
      const colW = (width - 48 - 16) / 2;

      fields.forEach((f, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = 24 + col * (colW + 16);
        const y = startY + row * 60;

        // Field box
        ctx.fillStyle = "#f9fafb";
        this.roundRect(ctx, x, y, colW, 50, 10);
        ctx.fill();
        ctx.strokeStyle = "#f3f4f6";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Field label
        ctx.fillStyle = "#6b7280";
        ctx.font =
          "bold 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillText(f.label.toUpperCase(), x + 12, y + 18);

        // Field value
        ctx.fillStyle = "#1f2937";
        ctx.font =
          "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        const valText =
          f.value.length > 28 ? f.value.slice(0, 27) + "…" : f.value;
        ctx.fillText(valText, x + 12, y + 36);
      });

      // Footer divider
      const footerY = height - 32;
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(24, footerY - 12);
      ctx.lineTo(width - 24, footerY - 12);
      ctx.stroke();

      // Footer branding
      ctx.fillStyle = "#9ca3af";
      ctx.font =
        "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("Generated from Personal Tracker", 24, footerY + 4);
      ctx.textAlign = "right";
      ctx.fillText(this.currentDateStr, width - 24, footerY + 4);

      // Convert to blob and data URL
      canvas.toBlob((blob) => {
        if (blob) {
          this.imageBlob = blob;
          this.cardImageUrl.set(URL.createObjectURL(blob));
        }
      }, "image/png");
    } finally {
      this.generatingImage.set(false);
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radii: number | number[],
  ): void {
    if (typeof radii === "number") {
      radii = [radii, radii, radii, radii];
    }
    const [tl, tr, br, bl] = radii;
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl);
    ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
  }

  downloadImage(): void {
    if (!this.cardImageUrl()) return;
    const a = document.createElement("a");
    a.href = this.cardImageUrl()!;
    a.download = `${this.data.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-card.png`;
    a.click();
    this.notify.success("Image downloaded successfully!");
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
        this.notify.success("Image card copied to clipboard!");
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
      `${this.data.title.replace(/[^a-zA-Z0-9]/g, "-")}.png`,
      { type: "image/png" },
    );
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: this.data.title,
          files: [file],
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          this.downloadImage();
        }
      }
    } else {
      this.downloadImage();
    }
  }

  printDocument(): void {
    const fieldsHtml = (this.data.fields || [])
      .map(
        (f) => `
        <div class="field-item">
          <div class="field-label">${f.label}</div>
          <div class="field-value">${f.value}</div>
        </div>
      `,
      )
      .join("");

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${this.data.title} — Personal Tracker</title>
          <style>
            @page { margin: 15mm; size: auto; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #111827;
              margin: 0;
              padding: 24px;
            }
            .header {
              display: flex;
              align-items: center;
              gap: 16px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e5e7eb;
              margin-bottom: 24px;
            }
            .icon { font-size: 36px; }
            .title { font-size: 22px; font-weight: bold; margin: 0; }
            .subtitle { font-size: 14px; color: #6b7280; margin: 4px 0 0 0; }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 16px;
              margin-bottom: 32px;
            }
            .field-item {
              padding: 12px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              background: #f9fafb;
            }
            .field-label {
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
              color: #6b7280;
              margin-bottom: 4px;
            }
            .field-value {
              font-size: 14px;
              font-weight: 600;
              color: #111827;
              word-break: break-word;
            }
            .footer {
              border-top: 1px solid #e5e7eb;
              padding-top: 12px;
              font-size: 11px;
              color: #9ca3af;
              display: flex;
              justify-content: space-between;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="icon">${this.data.icon || "📋"}</div>
            <div>
              <h1 class="title">${this.data.title}</h1>
              ${this.data.subtitle ? `<p class="subtitle">${this.data.subtitle}</p>` : ""}
            </div>
          </div>
          <div class="grid">${fieldsHtml}</div>
          <div class="footer">
            <span>Printed from Personal Tracker</span>
            <span>${this.currentDateStr}</span>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printHtml);
      doc.close();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 5000);
    }
  }
}
