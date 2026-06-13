import type { WhatsappPresenceState } from "../types.js";

/**
 * # Presence Submodule Interface
 *
 * Defines the public contract for managing presence and chat activity within the bot.
 * Allows developers to safely toggle online/offline states and simulate typing/recording.
 */
export interface IWhatsSocket_Submodule_Presence {
  /**
   * # Set Global Presence State
   *
   * Updates the global presence state of the bot.
   *
   * @param state The state to set: "online" or "offline".
   * @returns `true` if the state was updated successfully, `false` otherwise.
   *
   * @example
   * ```typescript
   * await bot.Presence.SetGlobalPresenceState("online");
   * ```
   */
  SetGlobalPresenceState(state: WhatsappPresenceState): Promise<boolean>;

  /**
   * # Start Typing
   *
   * Sets the chat activity to "typing".
   *
   * @param jid The JID of the chat.
   * @returns `true` if the activity was updated successfully, `false` otherwise.
   *
   * @example
   * ```typescript
   * await bot.Presence.StartTyping(message.chatId);
   * ```
   */
  StartTyping(jid: string): Promise<boolean>;

  /**
   * # Stop Typing
   *
   * Resets the chat activity from "typing" to "idle".
   *
   * @param jid The JID of the chat.
   * @returns `true` if the activity was updated successfully, `false` otherwise.
   *
   * @example
   * ```typescript
   * await bot.Presence.StopTyping(message.chatId);
   * ```
   */
  StopTyping(jid: string): Promise<boolean>;

  /**
   * # Start Recording
   *
   * Sets the chat activity to "recording".
   *
   * @param jid The JID of the chat.
   * @returns `true` if the activity was updated successfully, `false` otherwise.
   *
   * @example
   * ```typescript
   * await bot.Presence.StartRecording(message.chatId);
   * ```
   */
  StartRecording(jid: string): Promise<boolean>;

  /**
   * # Stop Recording
   *
   * Resets the chat activity from "recording" to "idle".
   *
   * @param jid The JID of the chat.
   * @returns `true` if the activity was updated successfully, `false` otherwise.
   *
   * @example
   * ```typescript
   * await bot.Presence.StopRecording(message.chatId);
   * ```
   */
  StopRecording(jid: string): Promise<boolean>;

  /**
   * # With Typing
   *
   * Wraps an action with a typing state. Automatically starts typing, executes the action,
   * and then stops typing.
   *
   * @param jid The JID of the chat.
   * @param action The async action to execute while typing.
   * @returns The result of the action.
   *
   * @example
   * ```typescript
   * await bot.Presence.WithTyping(message.chatId, async () => {
   *   await bot.SendText(message.chatId, "Hello!");
   * });
   * ```
   */
  WithTyping<T>(jid: string, action: () => Promise<T>): Promise<T>;

  /**
   * # With Recording
   *
   * Wraps an action with a recording state. Automatically starts recording, executes the action,
   * and then stops recording.
   *
   * @param jid The JID of the chat.
   * @param action The async action to execute while recording.
   * @returns The result of the action.
   *
   * @example
   * ```typescript
   * await bot.Presence.WithRecording(message.chatId, async () => {
   *   await bot.SendAudio(message.chatId, audioBuffer);
   * });
   * ```
   */
  WithRecording<T>(jid: string, action: () => Promise<T>): Promise<T>;
}
