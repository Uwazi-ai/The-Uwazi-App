/** Palette, fonts and sizing shared by every scene. */
export const PALETTE = {
  sky: 0x3d8fd1,
  green: 0x3e7b3a,
  greenDark: 0x2f6b30,
  greenLight: 0x4c8c3c,
  asphalt: 0x3b3f45,
  gold: 0xffc531,
  orange: 0xff7a1a,
  blue: 0x1e88e5,
  teal: 0x00a3a3,
  sand: 0xc99a55,
  charcoal: 0x1f2a33,
  black: 0x111111,
  white: 0xffffff,
  cream: 0xfff6dc,
  red: 0xd9453d,
  purple: 0x7b4fbf,
} as const;

export const HEX = {
  sky: "#3D8FD1", green: "#3E7B3A", greenDark: "#2F6B30", greenLight: "#4C8C3C", asphalt: "#3B3F45",
  gold: "#FFC531", orange: "#FF7A1A", blue: "#1E88E5", teal: "#00A3A3", sand: "#C99A55",
  charcoal: "#1F2A33", black: "#111111", white: "#FFFFFF", cream: "#FFF6DC", red: "#D9453D", purple: "#7B4FBF",
} as const;

export const FONT_DISPLAY = '"Lilita One", "Arial Rounded MT Bold", "Nunito", sans-serif';
export const FONT_BODY = '"Nunito", "Avenir Next", "Helvetica Neue", sans-serif';

/** Minimum touch target in CSS pixels. */
export const TOUCH_MIN = 96;
/** Master volume cap so nothing is ever loud. */
export const VOLUME_CAP = 0.5;
/** Cape colours unlocked per rank index. */
export const CAPE_UNLOCKS = ["#1F2A33", "#1E88E5", "#FF7A1A", "#FFC531"] as const;
export const COLOR_NAMES: Record<string, string> = {
  "#FF7A1A": "orange", "#1E88E5": "blue", "#FFC531": "gold", "#00A3A3": "teal", "#4C8C3C": "green", "#7B4FBF": "purple", "#D9453D": "red", "#FFFFFF": "white",
};
