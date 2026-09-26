import { Service, effect, signal } from "@angular/core";
import { DEFAULT_COLOR_THEME } from "./color-themes";

export type ThemeMode = "light" | "dark" | "system";

const MODE_KEY = "pt-theme";
const COLOR_KEY = "pt-color-theme";

@Service()
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.readMode());
  readonly colorTheme = signal<string>(this.readColorTheme());

  constructor() {
    effect(() => {
      const mode = this.mode();
      // Material 3 tokens use light-dark(), so this single property switches the whole UI.
      document.documentElement.style.colorScheme =
        mode === "system" ? "light dark" : mode;
      try {
        localStorage.setItem(MODE_KEY, mode);
      } catch {
        /* storage may be blocked */
      }
    });

    effect(() => {
      const key = this.colorTheme();
      document.documentElement.setAttribute("data-color-theme", key);
      try {
        localStorage.setItem(COLOR_KEY, key);
      } catch {
        /* storage may be blocked */
      }
    });
  }

  private readMode(): ThemeMode {
    try {
      const v = localStorage.getItem(MODE_KEY);
      return v === "light" || v === "dark" ? v : "system";
    } catch {
      return "system";
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
