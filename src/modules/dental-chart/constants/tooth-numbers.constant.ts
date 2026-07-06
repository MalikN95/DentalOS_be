// FDI two-digit notation: quadrants 1-4, positions 1-8
// => 11-18, 21-28, 31-38, 41-48
const QUADRANT_BASES = [10, 20, 30, 40] as const;

export const VALID_TOOTH_NUMBERS: readonly number[] = QUADRANT_BASES.flatMap(
  (base) => Array.from({ length: 8 }, (_, index) => base + index + 1),
);
