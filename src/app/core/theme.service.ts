import { Injectable, computed, effect, signal } from "@angular/core";
import { COLOR_THEMES, DEFAULT_COLOR_THEME } from "./color-themes";

export type NzThemeType = "default" | "dark" | "compact" | "aliyun" | "system";

const NZ_THEME_KEY = "pt-nz-theme";
const COLOR_KEY = "pt-color-theme";

@Injectable({ providedIn: "root" })
export class ThemeService {
  readonly nzTheme = signal<NzThemeType>(this.readNzTheme());
  readonly colorTheme = signal<string>(this.readColorTheme());

  private readonly osPrefersDark = signal(this.readOsPrefersDark());

  readonly mode = computed<"light" | "dark">(() =>
    this.effectiveTheme() === "dark" ? "dark" : "light",
  );

  private readonly effectiveTheme = computed<
    "default" | "dark" | "compact" | "aliyun"
  >(() => {
    const selected = this.nzTheme();
    if (selected !== "system") return selected;
    return this.osPrefersDark() ? "dark" : "default";
  });

  constructor() {
    effect(() => {
      const theme = this.effectiveTheme();

      const link = document.getElementById(
        "ng-zorro-theme",
      ) as HTMLLinkElement | null;
      if (link) link.href = `assets/themes/${theme}.css`;

      document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.style.colorScheme =
        theme === "dark" ? "dark" : "light";

      try {
        localStorage.setItem(NZ_THEME_KEY, this.nzTheme());
      } catch {
        /* storage may be blocked */
      }
    });

    effect(() => {
      const key = this.colorTheme();
      const themeObj =
        COLOR_THEMES.find((t) => t.key === key) ?? COLOR_THEMES[0];

      // Single source of truth. Hover/active/container shades are derived from this with
      // color-mix() in styles.scss, so they can never drift out of sync with each other the
      // way the old hand-set --ant-primary-color-hover/-active (both equal to the base) did.
      document.documentElement.style.setProperty(
        "--ant-primary-color",
        themeObj.primary,
      );
      document.documentElement.style.setProperty(
        "--app-primary",
        themeObj.primary,
      );

      try {
        localStorage.setItem(COLOR_KEY, key);
      } catch {
        /* storage may be blocked */
      }
    });

    if (typeof window !== "undefined" && window.matchMedia) {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", (e) => {
          this.osPrefersDark.set(e.matches); // a genuinely new value, so the effect actually reruns
        });
    }
  }

  private readNzTheme(): NzThemeType {
    try {
      const v = localStorage.getItem(NZ_THEME_KEY);
      if (
        v === "default" ||
        v === "dark" ||
        v === "compact" ||
        v === "aliyun" ||
        v === "system"
      )
        return v;
      // one-time migration from the old pre-ng-zorro key, read once and never written to again
      return localStorage.getItem("pt-theme") === "dark" ? "dark" : "default";
    } catch {
      return "default";
    }
  }

  private readColorTheme(): string {
    try {
      return localStorage.getItem(COLOR_KEY) || DEFAULT_COLOR_THEME;
    } catch {
      return DEFAULT_COLOR_THEME;
    }
  }

  private readOsPrefersDark(): boolean {
    try {
      return (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    } catch {
      return false;
    }
  }
}
