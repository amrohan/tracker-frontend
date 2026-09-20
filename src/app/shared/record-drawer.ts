import { CdkTrapFocus } from "@angular/cdk/a11y";
import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  viewChild,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";

let nextId = 0;

/**
 * Slide-over panel (right on desktop, bottom sheet on phones).
 * Default slot = body. An element with the `drawerFooter` attribute = pinned footer (shown when [footer] is true).
 */
@Component({
  selector: "app-record-drawer",
  imports: [CdkTrapFocus, MatButtonModule, MatIconModule],
  template: `
    <div class="backdrop" (click)="onBackdrop($event)">
      <section
        #panel
        class="panel"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        cdkTrapFocus
        [attr.aria-labelledby]="titleId"
        (keydown.escape)="requestClose()"
      >
        <header class="header">
          <div class="titles">
            @if (eyebrow()) {
              <p class="eyebrow">
                @if (eyebrowIcon()) {
                  <span aria-hidden="true">{{ eyebrowIcon() }}</span>
                }
                {{ eyebrow() }}
              </p>
            }
            <h2 [id]="titleId">{{ heading() }}</h2>
          </div>
          <button
            mat-icon-button
            type="button"
            aria-label="Close"
            [disabled]="busy()"
            (click)="requestClose()"
          >
            <mat-icon>close</mat-icon>
          </button>
        </header>

        <div class="body"><ng-content /></div>

        @if (footer()) {
          <footer class="footer"><ng-content select="[drawerFooter]" /></footer>
        }
      </section>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 900;
      display: flex;
      justify-content: flex-end;
      background: color-mix(in srgb, #000 42%, transparent);
      animation: fade 0.16s ease-out;
    }

    .panel {
      --drawer-pad: 24px;
      --drawer-bg: var(--mat-sys-surface);
      display: flex;
      flex-direction: column;
      width: min(560px, 100%);
      height: 100%;
      background: var(--drawer-bg);
      border-left: 1px solid var(--mat-sys-outline-variant);
      box-shadow: var(--mat-sys-level4);
      outline: none;
      animation: slide 0.22s cubic-bezier(0.2, 0, 0, 1);
    }

    .header {
      flex: none;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px var(--drawer-pad) 14px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .titles {
      flex: 1;
      min-width: 0;
    }
    .eyebrow {
      margin: 0 0 4px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--mat-sys-on-surface-variant);
    }
    h2 {
      margin: 0;
      font-size: 1.375rem;
      line-height: 1.25;
      letter-spacing: -0.01em;
      overflow-wrap: anywhere;
    }

    .body {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: var(--drawer-pad);
    }

    .footer {
      flex: none;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px var(--drawer-pad) calc(12px + env(safe-area-inset-bottom));
      border-top: 1px solid var(--mat-sys-outline-variant);
      background: var(--drawer-bg);
    }

    @media (max-width: 640px) {
      .backdrop {
        align-items: flex-end;
      }
      .panel {
        --drawer-pad: 16px;
        width: 100%;
        height: auto;
        max-height: 92dvh;
        border-left: 0;
        border-top: 1px solid var(--mat-sys-outline-variant);
        border-radius: 20px 20px 0 0;
        animation: rise 0.22s cubic-bezier(0.2, 0, 0, 1);
      }
    }

    @keyframes fade {
      from {
        opacity: 0;
      }
    }
    @keyframes slide {
      from {
        transform: translateX(100%);
      }
    }
    @keyframes rise {
      from {
        transform: translateY(100%);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .backdrop,
      .panel {
        animation: none;
      }
    }
  `,
})
export class RecordDrawer {
  readonly heading = input.required<string>();
  readonly eyebrow = input("");
  readonly eyebrowIcon = input("");
  /** While true (saving) the drawer cannot be closed. */
  readonly busy = input(false);
  /** Forms turn this off so a stray click never discards typed data. */
  readonly closeOnBackdrop = input(true);
  readonly footer = input(false);
  readonly closed = output<void>();

  protected readonly titleId = `record-drawer-title-${nextId++}`;
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>("panel");

  constructor() {
    const previous = document.activeElement as HTMLElement | null;
    afterNextRender(() => this.panel().nativeElement.focus());
    inject(DestroyRef).onDestroy(() => previous?.focus?.());
  }

  protected requestClose(): void {
    if (!this.busy()) this.closed.emit();
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget && this.closeOnBackdrop()) {
      this.requestClose();
    }
  }
}
