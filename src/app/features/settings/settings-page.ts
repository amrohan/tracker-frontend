import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzRadioModule } from "ng-zorro-antd/radio";
import { COLOR_THEMES } from "../../core/color-themes";
import { NzThemeType, ThemeService } from "../../core/theme.service";

@Component({
  selector: "app-settings-page",
  imports: [FormsModule, NzRadioModule, NzIconModule, NzCardModule, NzButtonModule],
  template: `
    <div class="page-narrow">
      <h1>Settings</h1>
      <p class="lead muted">
        Choose how Tracker looks. Changes apply immediately and are remembered on this device.
      </p>

      <section class="card" aria-labelledby="appearance-h">
        <h2 id="appearance-h">Official Themes</h2>
        <p class="hint">
          Choose from NG-ZORRO's officially supported design themes.
        </p>

        <nz-radio-group
          class="theme-group"
          [ngModel]="theme.nzTheme()"
          (ngModelChange)="theme.nzTheme.set($event)"
          nzButtonStyle="solid"
        >
          @for (m of officialThemes; track m.type) {
            <label nz-radio-button [nzValue]="m.type" class="theme-btn">
              <nz-icon [nzType]="m.icon" />
              <span>{{ m.label }}</span>
            </label>
          }
        </nz-radio-group>
      </section>

      <section class="card" aria-labelledby="color-h">
        <h2 id="color-h">Accent Color</h2>
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
              @if (theme.colorTheme() === t.key) {
                <nz-icon nzType="check-circle" nzTheme="fill" class="check" />
              }
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
      background: var(--app-surface-container-low);
      border: 1px solid var(--app-outline-variant);
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
      color: var(--app-text-muted);
    }

    .theme-group {
      display: flex;
      flex-wrap: wrap;
      width: 100%;
      gap: 8px;
    }
    .theme-btn {
      flex: 1 1 140px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 42px;
      border-radius: 8px !important;
      font-weight: 500;
      text-align: center;
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
      border: 1.5px solid var(--app-outline-variant);
      background: var(--app-surface);
      color: var(--app-text);
      font: inherit;
      font-size: 0.9375rem;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
    }
    .swatch:hover {
      background: var(--app-surface-container-high);
      border-color: var(--app-outline);
    }
    .swatch.on {
      border-color: var(--app-primary);
      background: var(--app-primary-container);
      color: var(--app-text);
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
      box-shadow: 0 0 0 2px var(--app-surface);
    }
    .dot-2 {
      top: 8px;
      left: 8px;
    }
    .swatch.on .dot {
      box-shadow: 0 0 0 2px var(--app-primary-container);
    }

    .name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .check {
      font-size: 18px;
      color: var(--app-primary);
      flex: none;
    }

    @media (max-width: 480px) {
      .theme-btn {
        flex: 1 1 100%;
      }
    }
  `,
})
export class SettingsPage {
  protected readonly theme = inject(ThemeService);
  protected readonly colorThemes = COLOR_THEMES;

  protected readonly officialThemes: {
    type: NzThemeType;
    label: string;
    icon: string;
  }[] = [
    { type: "default", label: "Default (Light)", icon: "bulb" },
    { type: "dark", label: "Dark", icon: "bulb" },
    { type: "compact", label: "Compact", icon: "table" },
    { type: "aliyun", label: "Aliyun", icon: "cloud" },
    { type: "system", label: "System", icon: "setting" },
  ];
}
