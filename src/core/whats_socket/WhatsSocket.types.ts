import type { AnyMessageContent, MiscMessageGenerationOptions, WAMessage, GroupMetadata } from "baileys";

/**
 * Represents a minimal abstraction of a WhatsApp socket adapter.
 *
 * This interface defines only the essential methods and properties
 * needed for sending messages, receiving events, and interacting with
 * group metadata, without depending on a full Baileys implementation.
 *
 * It is intended to be used in:
 * - Unit tests with mock sockets
 * - Simplified adapters that wrap a real or mock WhatsApp connection
 */
export interface IWhatsSocketServiceAdapter {
  /**
   * Basic information about the current user/bot.
   */
  user?: { id: string };

  /**
   * Sends a message to a specific chat.
   *
   * @param jid - The chat ID to send the message to.
   * @param content - The message content (text, media, etc.).
   * @returns A promise resolving to the full WAMessage object representing
   *          the sent message.
   */
  sendMessage(jid: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<WAMessage | undefined>;

  /**
   * Retrieves metadata for a given group chat.
   *
   * @param chatId - The ID of the group chat.
   * @returns A promise resolving to the group's metadata, including
   *          id, subject, creation timestamp, and creator.
   */
  groupMetadata(chatId: string): Promise<GroupMetadata>;

  /**
   * Fetches metadata for all groups the bot/user is participating in.
   *
   * @returns A promise resolving to an array of GroupMetadata objects.
   */
  groupFetchAllParticipating(): Promise<{ [key: string]: GroupMetadata }>;

  /**
   * Event system for subscribing to or emitting socket events.
   */
  ev: {
    /**
     * Subscribes a callback to a specific event.
     *
     * @param eventName - The name of the event to listen for.
     * @param callback - The function to call when the event occurs.
     */
    on(eventName: string, callback: (...args: any[]) => void): void;

    /**
     * Emits an event to all subscribed callbacks.
     *
     * @param eventName - The name of the event to emit.
     * @param args - Arguments to pass to the subscribed callbacks.
     * @returns `true` if at least one subscriber was called, `false` otherwise.
     */
    emit(eventName: string, ...args: any[]): boolean;
  };

  /**
   * WebSocket-related operations.
   */
  ws: {
    /**
     * Closes the underlying WebSocket connection.
     *
     * @returns A promise that resolves once the socket is closed, or void for implementations
     * that close synchronously (e.g., the real Baileys socket).
     */
    close(): Promise<void> | void;
  };
}
