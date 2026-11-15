import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NzAvatarModule } from "ng-zorro-antd/avatar";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzRadioModule } from "ng-zorro-antd/radio";
import { AuthService } from "../../core/auth.service";
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
    NzAvatarModule,
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
          Customize your workspace appearance and manage your account.
        </p>
      </header>

      <!-- Account Profile Section -->
      @if (auth.user(); as u) {
        <section
          class="
            mb-6
            rounded-2xl
            border border-(--app-outline)
            bg-(--app-surface)
            p-5
            sm:p-6
            shadow-xs
          "
          aria-labelledby="account-h"
        >
          <div class="flex items-center justify-between gap-4 flex-wrap">
            <div class="flex items-center gap-4">
              <nz-avatar
                [nzText]="initials()"
                class="size-12! text-base! font-bold! bg-(--app-primary)! text-white!"
              />
              <div>
                <h2 id="account-h" class="text-base font-bold text-(--app-text) m-0">
                  {{ u.displayName || "User" }}
                </h2>
                <p class="text-xs sm:text-sm text-(--app-text-muted) m-0 mt-0.5">
                  {{ u.email }}
                </p>
              </div>
            </div>

            <button
              nz-button
              nzType="default"
              nzDanger
              (click)="auth.logout()"
              class="rounded-lg! flex items-center gap-2"
            >
              <nz-icon nzType="logout" />
              <span>Sign out</span>
            </button>
          </div>
        </section>
      }

      <!-- Official Themes -->
      <section
        class="
          mb-6
          rounded-2xl
          border border-(--app-outline)
          bg-(--app-surface)
          p-5
          sm:p-6
          shadow-xs
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
            "
          >
            Interface Theme
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
            Choose your preferred light or dark mode theme style.
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
              <div class="flex items-center gap-2">
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
          mb-6
          rounded-2xl
          border border-(--app-outline)
          bg-(--app-surface)
          p-5
          sm:p-6
          shadow-xs
        "
        aria-labelledby="color-h"
      >
        <div class="mb-4">
          <h2 id="color-h" class="m-0 text-base font-semibold leading-6 text-(--app-text)">
            Accent Palette
          </h2>

          <p
            class="m-0 mt-1 text-xs leading-5 text-(--app-text-muted) sm:text-sm"
          >
            Select an accent color for active buttons, badges, links and highlights.
          </p>
        </div>

        <div
          class="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
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
                gap-3
                rounded-xl
                border
                border-(--app-outline)
                bg-(--app-surface)
                px-3.5
                py-2.5
                text-left
                text-(--app-text)
                transition-all
                duration-150
                hover:border-(--app-primary)
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
                  size-6
                  shrink-0
                "
                aria-hidden="true"
              >
                <span
                  class="
                    absolute
                    left-0
                    top-0
                    size-4.5
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
                    size-4.5
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
                    text-base
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
  protected readonly auth = inject(AuthService);
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

  protected initials(): string {
    const name = this.auth.user()?.displayName?.trim();
    if (!name) return "?";
    const parts = name.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}
