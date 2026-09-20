import { Service, effect, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';
const KEY = 'pt-theme';

@Service()
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.read());

  constructor() {
    effect(() => {
      const mode = this.mode();
      // Material 3 tokens use light-dark(), so this single property switches the whole UI.
      document.documentElement.style.colorScheme = mode === 'system' ? 'light dark' : mode;
      try { localStorage.setItem(KEY, mode); } catch { /* storage may be blocked */ }
    });
  }

  private read(): ThemeMode {
    try {
      const v = localStorage.getItem(KEY);
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch {
      return 'system';
    }
  }
}
