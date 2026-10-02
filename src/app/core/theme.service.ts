import { Injectable, effect, signal } from "@angular/core";
import { COLOR_THEMES, DEFAULT_COLOR_THEME } from "./color-themes";

export type NzThemeType = "default" | "dark" | "compact" | "aliyun" | "system";
export type ThemeMode = "light" | "dark" | "system";

const NZ_THEME_KEY = "pt-nz-theme";
const MODE_KEY = "pt-theme";
const COLOR_KEY = "pt-color-theme";

@Injectable({ providedIn: "root" })
export class ThemeService {
  readonly nzTheme = signal<NzThemeType>(this.readNzTheme());
  readonly mode = signal<ThemeMode>(this.readMode());
  readonly colorTheme = signal<string>(this.readColorTheme());

  constructor() {
    // Keep nzTheme and mode in sync for backward compatibility
    effect(() => {
      const currentMode = this.mode();
      const currentNz = this.nzTheme();
      if (currentMode === "dark" && currentNz !== "dark") {
        this.nzTheme.set("dark");
      } else if (currentMode === "light" && currentNz === "dark") {
        this.nzTheme.set("default");
      }
    });

    effect(() => {
      const selected = this.nzTheme();
      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;

      const effectiveTheme: "default" | "dark" | "compact" | "aliyun" =
        selected === "system" ? (prefersDark ? "dark" : "default") : selected;

      // Update the official NG-ZORRO theme link
      const link = document.getElementById(
        "ng-zorro-theme",
      ) as HTMLLinkElement | null;
      if (link) {
        link.href = `assets/themes/${effectiveTheme}.css`;
      }

      document.documentElement.setAttribute("data-theme", effectiveTheme);
      document.documentElement.style.colorScheme =
        effectiveTheme === "dark" ? "dark" : "light";

      try {
        localStorage.setItem(NZ_THEME_KEY, selected);
        localStorage.setItem(
          MODE_KEY,
          effectiveTheme === "dark" ? "dark" : "light",
        );
      } catch {
        /* storage may be blocked */
      }
    });

    effect(() => {
      const key = this.colorTheme();
      const themeObj =
        COLOR_THEMES.find((t) => t.key === key) ?? COLOR_THEMES[0];
      document.documentElement.setAttribute("data-color-theme", key);
      document.documentElement.style.setProperty(
        "--ant-primary-color",
        themeObj.primary,
      );
      document.documentElement.style.setProperty(
        "--ant-primary-color-hover",
        themeObj.primary,
      );
      document.documentElement.style.setProperty(
        "--ant-primary-color-active",
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

    // Listen for OS theme changes if in system mode
    if (typeof window !== "undefined" && window.matchMedia) {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", () => {
          if (this.nzTheme() === "system") {
            // Trigger effect re-run
            this.nzTheme.set("system");
          }
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
      ) {
        return v;
      }
      const legacyMode = localStorage.getItem(MODE_KEY);
      if (legacyMode === "dark") return "dark";
      if (legacyMode === "light") return "default";
      return "default";
    } catch {
      return "default";
    }
  }

  private readMode(): ThemeMode {
    try {
      const v = localStorage.getItem(MODE_KEY);
      return v === "light" || v === "dark" ? v : "light";
    } catch {
      return "light";
    }
  }

  private readColorTheme(): string {
    try {
      return localStorage.getItem(COLOR_KEY) || DEFAULT_COLOR_THEME;
    } catch {
      return DEFAULT_COLOR_THEME;
    }
  }
}
