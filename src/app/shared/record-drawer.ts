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
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";

let nextId = 0;

@Component({
  selector: "app-record-drawer",
  imports: [CdkTrapFocus, NzButtonModule, NzIconModule],
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
        <!-- Header -->
        <header class="header">
          <div class="titles">
            @if (eyebrow()) {
              <p class="eyebrow">
                @if (eyebrowIcon()) {
                  <span class="eyebrow-icon" aria-hidden="true">
                    {{ eyebrowIcon() }}
                  </span>
                }
                <span>{{ eyebrow() }}</span>
              </p>
            }

            <h2 [id]="titleId">
              {{ heading() }}
            </h2>
          </div>

          <button
            nz-button
            nzType="text"
            nzShape="circle"
            type="button"
            aria-label="Close drawer"
            class="close-button"
            [disabled]="busy()"
            (click)="requestClose()"
          >
            <nz-icon nzType="close" />
          </button>
        </header>

        <!-- Scrollable content -->
        <main class="body">
          <ng-content />
        </main>

        <!-- Always pinned to bottom -->
        @if (footer()) {
          <footer class="footer">
            <ng-content select="[drawerFooter]" />
          </footer>
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
      background: rgba(0, 0, 0, 0.45);
      animation: fade-in 160ms ease-out;
    }

    .panel {
      --drawer-padding-x: 24px;
      --drawer-background: var(--app-surface);

      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      width: min(560px, 100%);
      height: 100%;
      min-height: 0;
      background: var(--drawer-background);
      border-left: 1px solid var(--app-outline-variant);
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
      outline: none;
      overflow: hidden;
      animation: slide-in 220ms cubic-bezier(0.2, 0, 0, 1);
    }

    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      min-width: 0;
      min-height: 72px;
      padding: 16px var(--drawer-padding-x);
      border-bottom: 1px solid var(--app-outline-variant);
    }

    .titles {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 3px;
    }

    .eyebrow {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0;
      font-size: 0.8125rem;
      line-height: 1.25;
      font-weight: 600;
      color: var(--app-text-muted);
    }

    .eyebrow-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      line-height: 1;
    }

    h2 {
      margin: 0;
      font-size: 1.375rem;
      line-height: 1.3;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--app-text);
      overflow-wrap: anywhere;
    }

    .close-button {
      flex: 0 0 auto;
      font-size: 16px;
      color: var(--app-text-muted);
    }
    .close-button:hover {
      color: var(--app-text);
    }

    .body {
      min-width: 0;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 24px var(--drawer-padding-x);
      overscroll-behavior: contain;
      scrollbar-gutter: stable;
    }

    .footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      min-width: 0;
      min-height: 68px;
      padding: 12px var(--drawer-padding-x);
      padding-bottom: calc(12px + env(safe-area-inset-bottom));
      border-top: 1px solid var(--app-outline-variant);
      background: var(--drawer-background);
      position: relative;
      z-index: 1;
    }

    @media (max-width: 640px) {
      .backdrop {
        align-items: flex-end;
        justify-content: stretch;
      }

      .panel {
        --drawer-padding-x: 16px;
        width: 100%;
        height: auto;
        max-height: 92dvh;
        grid-template-rows: auto minmax(0, 1fr) auto;
        border: 0;
        border-top: 1px solid var(--app-outline-variant);
        border-radius: 20px 20px 0 0;
        animation: rise-in 220ms cubic-bezier(0.2, 0, 0, 1);
      }

      .header {
        min-height: 64px;
        padding-top: 12px;
        padding-bottom: 12px;
      }

      .body {
        padding-top: 20px;
        padding-bottom: 20px;
      }

      .footer {
        min-height: 64px;
      }
    }

    @keyframes fade-in {
      from {
        opacity: 0;
      }
    }

    @keyframes slide-in {
      from {
        transform: translateX(100%);
      }
    }

    @keyframes rise-in {
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
  readonly busy = input(false);
  readonly closeOnBackdrop = input(true);
  readonly footer = input(false);
  readonly closed = output<void>();

  protected readonly titleId = `record-drawer-title-${nextId++}`;
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>("panel");

  constructor() {
    const previousActiveElement = document.activeElement as HTMLElement | null;

    afterNextRender(() => {
      this.panel().nativeElement.focus();
    });

    inject(DestroyRef).onDestroy(() => {
      previousActiveElement?.focus();
    });
  }

  protected requestClose(): void {
    if (!this.busy()) {
      this.closed.emit();
    }
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget && this.closeOnBackdrop()) {
      this.requestClose();
    }
  }
}
