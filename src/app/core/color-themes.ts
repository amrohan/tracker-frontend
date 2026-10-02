export interface ColorTheme {
  key: string;
  label: string;
  /** Primary accent color used for Ant Design / NG-ZORRO buttons, active states, and highlights */
  primary: string;
  tertiary: string;
}

export const COLOR_THEMES: ColorTheme[] = [
  { key: "sky", label: "Daybreak Blue", primary: "#1890ff", tertiary: "#722ed1" },
  { key: "ocean", label: "Cyan", primary: "#13c2c2", tertiary: "#fa8c16" },
  { key: "grape", label: "Purple", primary: "#722ed1", tertiary: "#52c41a" },
  { key: "berry", label: "Magenta", primary: "#eb2f96", tertiary: "#13c2c2" },
  { key: "forest", label: "Green", primary: "#52c41a", tertiary: "#eb2f96" },
  { key: "sunset", label: "Orange", primary: "#fa8c16", tertiary: "#1890ff" },
  { key: "blossom", label: "Red", primary: "#f5222d", tertiary: "#52c41a" },
  { key: "indigo", label: "Geek Blue", primary: "#2f54eb", tertiary: "#faad14" },
  { key: "ember", label: "Gold", primary: "#faad14", tertiary: "#1890ff" },
];

export const DEFAULT_COLOR_THEME = "sky";
