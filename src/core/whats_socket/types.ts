import type { makeWASocket, WAMessage } from "baileys";
/**
 * # Baileys Socket
 *
 * Main primitive type from BAILEYS WhatsApp library.
 *
 * @example
 * ```typescript
 * const client: BaileysWASocket = undefined;
 * ```
 */
export type BaileysWASocket = ReturnType<typeof makeWASocket>;

/**
 * # Logger Mode
 *
 * Represents the logger mode for WhatsSocket.
 * They are based on the 'pino' library/dependency logger levels. Just extracted them here for convenience.
 *
 * @example
 * ```typescript
 * const mode: WhatsSocketLoggerMode = "silent";
 * ```
 */
export type WhatsSocketLoggerMode = "debug" | "error" | "fatal" | "info" | "silent" | "trace" | "warn" | "recommended";

/**
 * # Custom Logger Mode
 *
 * @example
 * ```typescript
 * const mode: CustomWhatsSocketLoggerMode = "recommended";
 * ```
 */
export type CustomWhatsSocketLoggerMode = "recommended";

/**
 * # WhatsApp Message
 *
 * Message type alias for WAMessage.
 *
 * @example
 * ```typescript
 * const msg: WhatsappMessage = undefined;
 * ```
 */
export type WhatsappMessage = WAMessage;
