import type { IWhatsSocket } from "../../whats_socket/IWhatsSocket.js";
import { BotMinimalInfo } from "../bot.js";
import type Myself_Submodule_Status from "./ChatContext.myself.status.js";
import type { CommandArgs } from "./CommandsSearcher.types.js";
import type { IChatContext } from "./IChatContext.js";

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

  /**
   * Executes the command.
   * @param api - (Low-Level API for sending and receiving methods)
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
  run(ctx: IChatContext, api: AdditionalAPI, args: CommandArgs): Promise<void>;
}

/**
 * Low-level utilities and direct socket access.
 *
 * Exposes internal submodules and helpers that extend beyond what
 * `ChatContext` provides. This API is intended for **advanced use cases**
 * where commands require broader control or functionality.
 *
 * ⚡ Typical scenarios where `AdditionalAPI` is useful:
 * - Sending messages to arbitrary chats without constructing a `ChatContext`.
 * - Publishing statuses/stories via the `Myself.Status` submodule.
 * - Leveraging raw socket features (`InternalSocket`) not surfaced through `ChatContext`.
 *
 * 🚫 For most command implementations, prefer using `ChatContext`
 * (the higher-level abstraction). Only fall back to `AdditionalAPI`
 * when you need cross-chat operations, raw access, or bot-wide state control.
 */
export type AdditionalAPI = {
  /**
   * Submodule for managing the bot’s own account features.
   */
  readonly Myself: {
    readonly Status: Myself_Submodule_Status;
    readonly Bot: BotMinimalInfo;
  };

  /**
   * Direct access to the underlying WhatsApp socket implementation.
   *
   * ⚠️ Use with caution: bypassing `ChatContext` means you are
   * responsible for handling errors, message formatting, and safe sending.
   */
  readonly InternalSocket: IWhatsSocket;
};
