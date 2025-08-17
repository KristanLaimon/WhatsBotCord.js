import { makeWASocket } from 'baileys';
export type BaileysWASocket = ReturnType<typeof makeWASocket>;

/**
 * Represents the logger mode for WhatsSocket.
 * They are based on the 'pino' library/dependency logger levels. Just extracted them here for convenience.
 */
export type WhatsSocketLoggerMode = "debug" | "error" | "fatal" | "info" | "silent" | "trace" | "warn";