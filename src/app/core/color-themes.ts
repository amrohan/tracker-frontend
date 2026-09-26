export interface ColorTheme {
  key: string;
  label: string;
  /** approximate colors for the picker's preview dot; the real palette is compiled in styles.scss */
  primary: string;
  tertiary: string;
}

export const COLOR_THEMES: ColorTheme[] = [
  { key: "ocean", label: "Ocean", primary: "#00696c", tertiary: "#8a5100" },
  { key: "sky", label: "Sky", primary: "#00639c", tertiary: "#94003e" },
  { key: "grape", label: "Grape", primary: "#7649a3", tertiary: "#4b6600" },
  { key: "berry", label: "Berry", primary: "#93326e", tertiary: "#006e29" },
  { key: "forest", label: "Forest", primary: "#3b6939", tertiary: "#8b3a7b" },
  { key: "sunset", label: "Sunset", primary: "#8a5100", tertiary: "#00639c" },
  { key: "blossom", label: "Blossom", primary: "#b3264d", tertiary: "#3b6939" },
  { key: "indigo", label: "Indigo", primary: "#375e9a", tertiary: "#6d5e00" },
  { key: "ember", label: "Ember", primary: "#a3372c", tertiary: "#00696c" },
];

export const DEFAULT_COLOR_THEME = COLOR_THEMES[0].key;
