import type { WhatsSocket_Submodule_Receiver } from "../../../core/whats_socket/internals/WhatsSocket.receiver.js";
import type { WhatsSocket_Submodule_SugarSender } from "../../../core/whats_socket/internals/WhatsSocket.sugarsenders.js";
import type { IWhatsSocket } from "../../whats_socket/IWhatsSocket.js";
import type { ChatContext } from "./ChatContext.js";
import type { CommandArgs } from "./CommandsSearcher.types.js";

/**
 * Represents a bot command.
 *
 * Each command has a unique `name`, optional aliases, a description,
 * and a `run` method which contains the logic to execute when the command
 * is invoked.
 */
export interface ICommand {
  /** Unique name of the command (used to trigger it) */
  name: string;

  /** Optional alternative names for the command */
  aliases?: string[];

  /** Short description explaining what the command does */
  description: string;

  /**
   * Executes the command.
   * @param rawMsgApi - (Low-Level API for sending and receiving methods)
   *                Direct usage of bot's whatsapp socket, you need to provide
   *                your own whatsapp chatID and params are more explicit.
   *                *Use it if you need finer control of how msgs are sent*
   * @param ctx - (High-Level API sbstraction for sending and receiving methods)
   *               The chat session this command is being executed in.
   *               Provides helper methods to send messages, react, ask questions, etc
   *               and strictly bound to this command chat.
   *               *Recommended, you would use this almost all the time, but if you
   *               need to send messages across chats, use rawMsgApi instead or create
   *               another ChatSession object on your own.
   * @param args - Arguments passed to the command when invoked.
   */
  run(ctx: ChatContext, rawMsgApi: RawMsgAPI, args: CommandArgs): Promise<void>;
}

/**
 * Low-level WhatsApp socket API.
 *
 * Provides direct access to the underlying send/receive submodules.
 *
 * ⚡ Use this when you need finer control over message flow:
 * - Sending across different chats without creating a new `ChatContext`.
 * - Using advanced/raw socket features that `ChatContext` does not expose.
 *
 * For most command logic, prefer using the `ChatContext` (high-level API).
 * `RawMsgAPI` is usually a fallback for edge cases or cross-chat operations.
 */
export type RawMsgAPI = {
  /**
   * Outgoing message sender submodule.
   *
   * Provides low-level methods to send messages, media, reactions, etc.
   * Requires explicit chat IDs and parameters.
   */
  Send: WhatsSocket_Submodule_SugarSender;

  /**
   * Incoming message receiver submodule.
   *
   * Provides low-level access to incoming message events and raw data.
   */
  Receive: WhatsSocket_Submodule_Receiver;

  InternalSocket: IWhatsSocket;
};
