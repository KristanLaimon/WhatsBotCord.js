import type { WhatsSocketSugarSender_Submodule } from 'src/core/whats_socket/internals/WhatsSocket.sugarsenders';
import type { ChatSession } from './ChatSession';
import type { CommandArgs } from './CommandsSearcher.types';
import type { WhatsSocketReceiver_SubModule } from 'src/core/whats_socket/internals/WhatsSocket.receiver';

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
   * @param chat - (High-Level API sbstraction for sending and receiving methods)
   *               The chat session this command is being executed in.
   *               Provides helper methods to send messages, react, ask questions, etc
   *               and strictly bound to this command chat.
   *               *Recommended, you would use this almost all the time, but if you
   *               need to send messages across chats, use rawMsgApi instead or create
   *               another ChatSession object on your own.
   * @param args - Arguments passed to the command when invoked.
   * @returns A Promise resolving to `true` if the command executed successfully,
   *          or `false` otherwise.
   */
  run(rawMsgApi: RawMsgAPI, chat: ChatSession, args: CommandArgs): Promise<boolean>
}

type RawMsgAPI = {
  Send: WhatsSocketSugarSender_Submodule;
  Receive: WhatsSocketReceiver_SubModule;
}