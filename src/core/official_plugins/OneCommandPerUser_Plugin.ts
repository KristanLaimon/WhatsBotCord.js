import type Bot from "../bot/bot.js";
import type { WhatsbotcordPlugin } from "../bot/bot.js";
import type { ICommand } from "../bot/internals/ICommand.js";

/**
 * Keeps track of a user executing a command.
 * One record per (chatId + participantId).
 *
 * `timer` is used to auto-expire the entry after a configured timeout.
 */
type ActiveUserLog = {
  chatId: string;
  command: ICommand;
  participantId_LID: string | null;
  timer: NodeJS.Timeout;
};

export type OfficialPlugin_OneCommandPerUserAtATime_ContextInfo = { pushName?: string | null };
/**
 * Configuration options for the "OneCommandPerUserAtATime" plugin.
 */
export type OfficialPlugin_OneCommandPerUserAtATime_Config = {
  /**
   * Number of seconds to keep a user locked before their command lock expires.
   * This prevents users from getting stuck if a command fails without cleanup.
   * @default 180 (3 minutes)
   */
  timeoutSecondsToForgetThem?: number;

  /**
   * Called when a user tries to execute a new command while one is still active.
   *
   * @param ctxInfo - Contextual info such as pushName of the sender.
   * @param executingCommand - The command that is already running.
   * @param newCommand - The new command being attempted.
   * @returns A string to send back to the user (e.g., "Please wait until your current command finishes.").
   */
  msgToSend: (ctxInfo: OfficialPlugin_OneCommandPerUserAtATime_ContextInfo, executingCommand: ICommand, newCommand: ICommand) => string;
};

/**
 * Plugin: Ensures that only **one command per user** can be active at a time.
 *
 * - If a user tries to run a command while another is still active, they get a configurable message and the new command is blocked.
 * - Active commands are automatically forgotten after a timeout to prevent permanent locks.
 * - The lock is cleared instantly when a command finishes execution.
 *
 * @param config - Timeout settings and message generator.
 * @returns A WhatsbotcordPlugin object to register with the bot.
 */
export default function OfficialPlugin_OneCommandPerUserAtATime(config: OfficialPlugin_OneCommandPerUserAtATime_Config): WhatsbotcordPlugin {
  const activeUsers: ActiveUserLog[] = [];
  const timeoutSeconds = config.timeoutSecondsToForgetThem ?? 180;

  return {
    plugin: (bot: Bot) => {
      // The middleware now handles the check BEFORE a command runs.
      bot.Use_OnCommandFound(async (bot, senderId_LID, _senderId_PN, chatId, rawMsg, _msgType, _senderType, commandFound, next) => {
        const existingLog = activeUsers.find((u) => u.chatId === chatId && u.participantId_LID === senderId_LID);

        // If a log exists, the user is busy. Block the new command.
        if (existingLog) {
          const message = config.msgToSend({ pushName: rawMsg.pushName }, existingLog.command, commandFound);
          await bot.SendMsg.Text(chatId, message, { quoted: rawMsg });
          return; // By not calling next(), we stop execution.
        }

        // User is not busy. Add a log and allow the command to run.
        const newLog: ActiveUserLog = {
          chatId,
          participantId_LID: senderId_LID,
          command: commandFound,
          timer: setTimeout(() => {
            // Failsafe: auto-remove the log after a timeout.
            const index = activeUsers.findIndex((u) => u === newLog);
            if (index !== -1) {
              activeUsers.splice(index, 1);
            }
          }, timeoutSeconds * 1000),
        };

        activeUsers.push(newLog);
        await next(); // Proceed to execute the command.
      });

      // The event is still the best place to handle cleanup AFTER a command runs.
      bot.Events.onCommandFoundAfterItsExecution.Subscribe((ctx, _executedCommand) => {
        const index = activeUsers.findIndex((u) => u.chatId === ctx.FixedChatId && u.participantId_LID === ctx.FixedParticipantLID);

        if (index !== -1) {
          const log = activeUsers[index]!;
          clearTimeout(log.timer); // Clear the failsafe timer.
          activeUsers.splice(index, 1); // Remove the user from the active list.
        }
      });
    },
  };
}
