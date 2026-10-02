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
  imports: [
    FormsModule,
    NzRadioModule,
    NzIconModule,
    NzCardModule,
    NzButtonModule,
  ],
  template: `
    <div class="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <!-- Page Header -->
      <header class="mb-6 sm:mb-8">
        <h1
          class="
            m-0
            text-[clamp(1.6rem,1.2rem+1.8vw,2.2rem)]
            font-bold
            leading-tight
            tracking-[-0.02em]
            text-(--app-text)
          "
        >
          Settings
        </h1>

        <p
          class="
            m-0 mt-1.5
            max-w-2xl
            text-sm
            leading-6
            text-(--app-text-muted)
            sm:text-base
          "
        >
          Choose how Tracker looks. Changes apply immediately and are remembered
          on this device.
        </p>
      </header>

      <!-- Official Themes -->
      <section
        class="
          mb-5
          rounded-2xl
          border border-(--app-outline-variant)
          bg-(--app-surface-container-low)
          p-4
          sm:p-5
          md:p-6
        "
        aria-labelledby="appearance-h"
      >
        <div class="mb-4">
          <h2
            id="appearance-h"
            class="
              m-0
              text-base
              font-semibold
              leading-6
              text-(--app-text)
              sm:text-lg
            "
          >
            Official Themes
          </h2>

          <p
            class="
              m-0 mt-1
              text-xs
              leading-5
              text-(--app-text-muted)
              sm:text-sm
            "
          >
            Choose from NG-ZORRO's officially supported design themes.
          </p>
        </div>

        <nz-radio-group
          class="flex! w-full! flex-wrap! gap-2!"
          [ngModel]="theme.nzTheme()"
          (ngModelChange)="theme.nzTheme.set($event)"
          nzButtonStyle="solid"
        >
          @for (m of officialThemes; track m.type) {
            <label nz-radio-button [nzValue]="m.type">
              <div class="flex gap-2">
                <nz-icon [nzType]="m.icon" />
                <span>{{ m.label }}</span>
              </div>
            </label>
          }
        </nz-radio-group>
      </section>

      <!-- Accent Color -->
      <section
        class="
          mb-5
          rounded-2xl
          border border-(--app-outline-variant)
          bg-(--app-surface-container-low)
          p-4
          sm:p-5
          md:p-6
        "
        aria-labelledby="color-h"
      >
        <div class="mb-4">
          <h2 id="color-h">Accent Color</h2>

          <p
            class="m-0 mt-1 text-xs leading-5 text-(--app-text-muted) sm:text-sm"
          >
            Pick an accent palette for buttons, links and highlights.
          </p>
        </div>

        <div
          class="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 "
          role="radiogroup"
          aria-labelledby="color-h"
        >
          @for (t of colorThemes; track t.key) {
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="theme.colorTheme() === t.key"
              (click)="theme.colorTheme.set(t.key)"
              class="
                group
                relative
                flex
                min-h-13.5
                w-full
                min-w-0
                items-center
                gap-2.5
                rounded-[14px]
                border-[1.5px]
                border-(--app-outline-variant)
                bg-(--app-surface)
                px-3.5
                py-3
                text-left
                text-(--app-text)
                transition-all
                duration-150
                hover:border-(--app-outline)
                hover:bg-(--app-surface-container-high)
                focus:outline-none
                focus:ring-2
                focus:ring-(--app-primary)
                focus:ring-offset-1
                aria-checked:border-(--app-primary)
                aria-checked:bg-(--app-primary-container)
              "
            >
              <!-- Color dots -->
              <span
                class="
                  relative
                  size-7
                  shrink-0
                "
                aria-hidden="true"
              >
                <span
                  class="
                    absolute
                    left-0
                    top-0
                    size-5
                    rounded-full
                    shadow-[0_0_0_2px_var(--app-surface)]
                  "
                  [style.background]="t.primary"
                ></span>

                <span
                  class="
                    absolute
                    left-2
                    top-2
                    size-5
                    rounded-full
                    shadow-[0_0_0_2px_var(--app-surface)]
                  "
                  [style.background]="t.tertiary"
                ></span>
              </span>

              <!-- Name -->
              <span
                class="
                  min-w-0
                  flex-1
                  truncate
                  text-sm
                  font-medium
                "
              >
                {{ t.label }}
              </span>

              <!-- Selected -->
              @if (theme.colorTheme() === t.key) {
                <nz-icon
                  nzType="check-circle"
                  nzTheme="fill"
                  class="
                    shrink-0
                    text-lg
                    text-(--app-primary)!
                  "
                />
              }
            </button>
          }
        </div>
      </section>
    </div>
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
    {
      type: "default",
      label: "Default (Light)",
      icon: "bulb",
    },
    {
      type: "dark",
      label: "Dark",
      icon: "bulb",
    },
    {
      type: "compact",
      label: "Compact",
      icon: "table",
    },
    {
      type: "aliyun",
      label: "Aliyun",
      icon: "cloud",
    },
    {
      type: "system",
      label: "System",
      icon: "setting",
    },
  ];
}
