import type { AnyMessageContent, GroupMetadata, MiscMessageGenerationOptions, WAMessage, WAMessageUpdate } from "baileys";
import type Delegate from "../../libs/Delegate";
import type { MsgType, SenderType } from "../../Msg.types";
import type { WhatsSocket_Submodule_Receiver } from "./internals/WhatsSocket.receiver";
import type { WhatsSocket_Submodule_SugarSender } from "./internals/WhatsSocket.sugarsenders";

interface IWhatsSocket_SendingMsgsOnly_Module {
  /**
   * Send a message to a specific chat ID with content and optionally with other options.
   *
   * _*This is the function you must use to send messages generally.*_
   *
   * _Do not use SendRaw() from this class unless you know what are you doing._
   *
   * This Send() function uses a queue to normalize the quantity of messages to send, to prevent
   * overflow of messages in case this socket has been spammed with msgs from someone.
   *
   * SendRaw() doesn't protect you from that, it's the direct interface to most 'low level'
   * interaction with the socket.
   * @param chatId_JID Whatsapp chat id of the user you want to send the message to (e.g: "1234567890@c.us")
   * @param content The content of the message. It can be a string, a buffer, an object, or a function that returns a string or buffer.
   * @param options A collection of options that can be used to customize the message. Check the type definition of MiscMessageGenerationOptions for more information.
   */
  _SendSafe(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<WAMessage | null>;

  /**
   * Sends a message to a specific chat ID with content and optionally with other options.
   *
   * _Do not use this unless you know what are you doing._
   *
   * This is the direct interface to most 'low level' interaction with the socket.
   * It doesn't protect you from flooding the socket with messages and causing a ban.
   *
   * Use Send() from this class instead, unless you really need to send messages directly
   * to the socket without any kind of protection.
   *
   * @param chatId_JID Whatsapp chat id of the user you want to send the message to (e.g: "1234567890@c.us")
   * @param content The content of the message. It can be a string, a buffer, an object, or a function that returns a string or buffer.
   * @param options A collection of options that can be used to customize the message. Check the type definition of MiscMessageGenerationOptions for more information.
   */
  _SendRaw(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<WAMessage | null>;
}

export interface IMsgServiceSocketMinimum extends IWhatsSocket_SendingMsgsOnly_Module {
  //Only Send*() related functions
}

/**
 * Event-only module of the WhatsSocket.
 *
 * Provides delegates (C#-like event emitters) for subscribing to lifecycle,
 * message, and group-related events.
 *
 * ## Example: subscribing to a message event
 * ```ts
 * socket.onMessageUpsert.Subscribe((senderId, chatId, msg, msgType, senderType) => {
 *   console.log(`New message in ${chatId}:`, msgType, msg);
 * });
 * ```
 *
 * ## Example: unsubscribing
 * ```ts
 * const handler = (group) => console.log("Entered group:", group.subject);
 * socket.onGroupEnter.Subscribe(handler);
 *
 * // Later...
 * socket.onGroupEnter.Unsubscribe(handler);
 * ```
 */
export interface IWhatsSocket_EventsOnly_Module {
  // ================= Lifecycle Events =================

  /**
   * Triggered when the socket restarts (e.g., after a reconnection).
   *
   * Example:
   * ```ts
   * socket.onRestart.Subscribe(async () => {
   *   console.log("Socket restarted. Re-initializing state...");
   * });
   * ```
   */
  onRestart: Delegate<() => Promise<void>>;

  // ================= Message Events =================

  /**
   * Triggered after a message is successfully sent.
   * Useful for verifying delivery or logging outgoing messages.
   *
   * Example:
   * ```ts
   * socket.onSentMessage.Subscribe((chatId, rawContent, misc) => {
   *   console.log(`Sent a message to ${chatId}`, rawContent, misc);
   * });
   * ```
   */
  onSentMessage: Delegate<(chatId: string, rawContentMsg: AnyMessageContent, optionalMisc?: MiscMessageGenerationOptions) => void>;

  /**
   * Triggered when a new raw message arrives.
   *
   * Example:
   * ```ts
   * socket.onMessageUpsert.Subscribe((senderId, chatId, rawMsg, type, senderType) => {
   *   console.log(`[${chatId}] ${senderId}:`, rawMsg);
   * });
   * ```
   */
  onIncomingMsg: Delegate<(senderId: string | null, chatId: string, rawMsg: WAMessage, msgType: MsgType, senderType: SenderType) => void>;

  /**
   * Triggered when an already sent message receives an update
   * (e.g., delivery receipts, edits, or reactions).
   *
   * Example:
   * ```ts
   * socket.onMessageUpdate.Subscribe((senderId, chatId, update, type) => {
   *   console.log(`Message update in ${chatId}:`, update);
   * });
   * ```
   */
  onUpdateMsg: Delegate<(senderId: string | null, chatId: string, rawMsgUpdate: WAMessageUpdate, msgType: MsgType, senderType: SenderType) => void>;

  // ================= Group Events =================

  /**
   * Triggered when the bot enters a group.
   *
   * Example:
   * ```ts
   * socket.onGroupEnter.Subscribe((groupInfo) => {
   *   console.log("Joined group:", groupInfo.subject);
   * });
   * ```
   */
  onGroupEnter: Delegate<(groupInfo: GroupMetadata) => void>;

  /**
   * Triggered when a group’s metadata changes
   * (e.g., subject, description, settings).
   *
   * Example:
   * ```ts
   * socket.onGroupUpdate.Subscribe((update) => {
   *   console.log("Group updated:", update);
   * });
   * ```
   */
  onGroupUpdate: Delegate<(groupInfo: Partial<GroupMetadata>) => void>;

  /**
   * Triggered once on startup with metadata for all groups
   * the bot is currently a member of.
   *
   * Example:
   * ```ts
   * socket.onStartupAllGroupsIn.Subscribe((groups) => {
   *   console.log("Bot is in groups:", groups.map(g => g.subject));
   * });
   * ```
   */
  onStartupAllGroupsIn: Delegate<(allGroupsIn: GroupMetadata[]) => void>;
}

/**
 * Public interface for the WhatsSocket class.
 *
 * Defines the contract for interacting with the WhatsApp socket client.
 *
 * Responsibilities:
 * - Provides modules for sending messages and receiving events.
 * - Manages connection lifecycle (start, shutdown).
 * - Exposes utility methods for chat and group operations.
 */
export interface IWhatsSocket extends IWhatsSocket_SendingMsgsOnly_Module, IWhatsSocket_EventsOnly_Module {
  /**
   * The JID (WhatsApp ID) of the connected account (e.g., "123456789@s.whatsapp.net").
   */
  ownJID: string;

  /**
   * High-level "sugar" sender module for dispatching all types of messages.
   *
   * Supported types: text, images, videos, polls, documents, etc.
   *
   * Prefer this module over raw sending methods since it handles
   * formatting, throttling, and common WhatsApp-specific quirks.
   */
  Send: WhatsSocket_Submodule_SugarSender;

  /**
   * Receive module for handling incoming messages and events.
   *
   * Normally you won’t call this directly—commands and event listeners
   * should be wired to it under the hood. Use it when you need fine-grained
   * control over incoming raw events.
   */
  Receive: WhatsSocket_Submodule_Receiver;

  /**
   * Establishes the socket connection and starts the client.
   * Must be called before using `Send` or `Receive`.
   */
  Start(): Promise<void>;

  /**
   * Gracefully shuts down the socket connection, cleaning up resources
   * and ensuring the client disconnects properly.
   */
  Shutdown(): Promise<void>;

  /**
   * Retrieves the metadata of a group chat.
   *
   * @param chatId - The chat ID of the group (e.g., "1234567890@g.us").
   * @returns A promise resolving to the group’s metadata object.
   * @throws If the provided chatId does not represent a group.
   *
   * Typical metadata includes:
   * - Group subject (name)
   * - Participant list
   * - Admin information
   * - Group settings
   */
  GetGroupMetadata(chatId: string): Promise<GroupMetadata>;
}
