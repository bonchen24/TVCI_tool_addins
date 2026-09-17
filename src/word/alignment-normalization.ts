import type { SupportedAlignment } from "../rules/models";

export function normalizeWordAlignment(value: string): SupportedAlignment {
  switch (value) {
    case "Centered": return "Centered";
    case "Right": return "Right";
    case "Justified": return "Justified";
    default: return "Left";
  }
}
