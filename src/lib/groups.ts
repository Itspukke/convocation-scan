export const AUXILIARY_GROUPS = [
  "Sound Team",
  "Media",
  "Ushers",
  "Medical Unit",
  "Security",
  "Hospitality",
  "Musicians",
] as const;

export type AuxiliaryGroup = (typeof AUXILIARY_GROUPS)[number];

export const ADMIN_PASSWORD = "convocation2026";
