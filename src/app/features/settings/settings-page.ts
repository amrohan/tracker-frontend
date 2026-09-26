import { Component, inject } from "@angular/core";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatIconModule } from "@angular/material/icon";
import { COLOR_THEMES } from "../../core/color-themes";
import { ThemeMode, ThemeService } from "../../core/theme.service";

@Component({
  selector: "app-settings-page",
  imports: [MatButtonToggleModule, MatIconModule],
  template: `
    <div class="page-narrow">
      <h1>Settings</h1>
      <p class="lead muted">
        Choose how Tracker looks. Changes apply immediately and are remembered
        on this device.
      </p>

      <section class="card" aria-labelledby="appearance-h">
        <h2 id="appearance-h">Appearance</h2>
        <p class="hint">Light, dark, or match your device.</p>
        <mat-button-toggle-group
          class="modes"
          [value]="theme.mode()"
          (change)="theme.mode.set($event.value)"
          aria-label="Appearance"
        >
          @for (m of modes; track m.value) {
            <mat-button-toggle [value]="m.value">
              <mat-icon>{{ m.icon }}</mat-icon>
              <span>{{ m.label }}</span>
            </mat-button-toggle>
          }
        </mat-button-toggle-group>
      </section>

      <section class="card" aria-labelledby="color-h">
        <h2 id="color-h">Color theme</h2>
        <p class="hint">
          Pick an accent palette for buttons, links and highlights.
        </p>

        <div class="swatches" role="radiogroup" aria-labelledby="color-h">
          @for (t of colorThemes; track t.key) {
            <button
              type="button"
              class="swatch"
              role="radio"
              [attr.aria-checked]="theme.colorTheme() === t.key"
              [class.on]="theme.colorTheme() === t.key"
              (click)="theme.colorTheme.set(t.key)"
            >
              <span class="dots" aria-hidden="true">
                <span class="dot" [style.background]="t.primary"></span>
                <span class="dot dot-2" [style.background]="t.tertiary"></span>
              </span>
              <span class="name">{{ t.label }}</span>
              <!-- @if (theme.colorTheme() === t.key) {
                <mat-icon class="check" aria-hidden="true"
                  >check_circle</mat-icon
                >
              } -->
            </button>
          }
        </div>
      </section>
    </div>
  `,
  styles: `
    h1 {
      font-size: clamp(1.6rem, 1.2rem + 1.8vw, 2.2rem);
      letter-spacing: -0.02em;
    }
    .lead {
      margin: 6px 0 24px;
      font-size: 1rem;
      line-height: 1.5;
    }

    .card {
      background: var(--mat-sys-surface-container-low);
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 20px;
      padding: clamp(16px, 3vw, 24px);
      margin-bottom: 20px;
    }
    h2 {
      font-size: 1.15rem;
      margin: 0 0 4px;
    }
    .hint {
      margin: 0 0 16px;
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .modes {
      width: 100%;
    }
    .modes mat-button-toggle {
      flex: 1;
    }
    .modes ::ng-deep .mat-button-toggle-label-content {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
      padding: 4px 0;
    }

    .swatches {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }
    .swatch {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1.5px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
      font: inherit;
      font-size: 0.9375rem;
      cursor: pointer;
      text-align: left;
    }
    .swatch:hover {
      background: var(--mat-sys-surface-container-high);
    }
    .swatch.on {
      border-color: var(--mat-sys-primary);
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }

    .dots {
      position: relative;
      width: 28px;
      height: 28px;
      flex: none;
    }
    .dot {
      position: absolute;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      top: 0;
      left: 0;
      box-shadow: 0 0 0 2px var(--mat-sys-surface);
    }
    .dot-2 {
      top: 8px;
      left: 8px;
    }
    .swatch.on .dot {
      box-shadow: 0 0 0 2px var(--mat-sys-primary-container);
    }

    .name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .check {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--mat-sys-primary);
      flex: none;
    }

    @media (max-width: 480px) {
      .modes ::ng-deep .mat-button-toggle-label-content span:not(mat-icon) {
        display: none;
      }
    }
  `,
})
export class SettingsPage {
  protected readonly theme = inject(ThemeService);
  protected readonly colorThemes = COLOR_THEMES;
  protected readonly modes: {
    value: ThemeMode;
    label: string;
    icon: string;
  }[] = [
    { value: "light", label: "Light", icon: "light_mode" },
    { value: "dark", label: "Dark", icon: "dark_mode" },
    { value: "system", label: "System", icon: "brightness_auto" },
  ];
}
