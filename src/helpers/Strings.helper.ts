/**
 * Normalizes a literal string by trimming unnecessary whitespace.
 *
 * - Removes leading and trailing whitespace from the entire string.
 * - Splits the string into lines and trims each line individually.
 * - Preserves empty lines (they are kept as `""`, not removed).
 * - Rejoins the lines with `"\n"` so the line structure is preserved.
 *
 * @example
 * Str_NormalizeLiteralString("   hello   ")
 * // => "hello"
 *
 * @example
 * Str_NormalizeLiteralString("  line1 \n   line2   \n\n   ")
 * // => "line1\nline2\n"
 *
 * @param str The input string to normalize. If `null` or `undefined`, returns an empty string.
 * @returns The normalized string with consistent whitespace handling.
 */
export function Str_NormalizeLiteralString(str: string): string {
  if (!str) return "";
  return str.trim().split("\n").map((line) => line.trim() || line).join("\n");
}
