import type Bot from "../bot/bot.js";
import type { WhatsbotcordPlugin } from "../bot/bot.js";
import type { ICommand } from "../bot/internals/ICommand.js";

/**
 * Keeps track of a user executing a command.
 * One record per (chatId + participant + command).
 *
 * `timer` is used to auto-expire the entry after a configured timeout.
 */
type ActiveUserLog = {
  chatId: string;
  command: ICommand;
  participantId_LID: string | null;
  participantId_PN: string | null;
  timer: Timer;
};

/**
 * Configuration options for the "OneCommandPerUserAtATime" plugin.
 */
export type OfficialPlugin_OneCommandPerUserAtATime_Config = {
  /**
   * Number of seconds to keep a user locked before auto-forgetting them.
   * Prevents keep users stucked with commands from time ago in case of error inside bot.
   */
  timeoutSecondsToForgetThem: number;

  /**
   * Called when a user tries to execute a new command while one is still active.
   *
   * @param ctxInfo - Contextual info such as pushName of the sender.
   * @param executingCommand - The command that is already running.
   * @param actualCommand - The new command being attempted.
   * @returns A string to send back to the user (e.g. "Wait until X finishes").
   */
  msgToSend: (ctxInfo: { pushName?: string | null }, executingCommand: ICommand, actualCommand: ICommand) => string;
};

//TODO: Needs testing
/**
 * Plugin: Ensures that only **one command per user** can be active at the same time.
 *
 * - If a user tries to run a command while another one is still active, they get a configurable message.
 * - Active commands are automatically forgotten after a timeout (`timeoutSecondsToForgetThem`).
 * - Cleans up records when a command finishes (`onCommandFoundAfterItsExecution`).
 *
 * @param config - Timeout settings and message generator.
 * @returns A WhatsbotcordPlugin object to register into the bot.
 */
export default function OfficialPlugin_OneCommandPerUserAtATime(config: OfficialPlugin_OneCommandPerUserAtATime_Config): WhatsbotcordPlugin {
  const activeUsers: ActiveUserLog[] = [];

  /** Check if a given user already has an active command */
  function findActiveIndex(user: ActiveUserLog): number {
    return activeUsers.findIndex(
      (a) =>
        a.chatId === user.chatId &&
        a.participantId_LID === user.participantId_LID &&
        a.participantId_PN === user.participantId_PN &&
        a.command.name === user.command.name
    );
  }

  /** Build the normalized log object from context + command */
  function makeLog(ctx: any, cmd: ICommand): ActiveUserLog {
    const toReturn: ActiveUserLog = {
      chatId: ctx.FixedChatId,
      command: cmd,
      participantId_LID: ctx.FixedParticipantLID,
      participantId_PN: ctx.FixedParticipantPN,
      timer: {} as any,
    };

    const timerToUse = setTimeout(() => {
      const found = findActiveIndex(toReturn);
      if (found === -1) {
        throw new Error("[FATAL ERROR]: This shouldn't happen at ALL!, doesn't have sense");
      }
    }, config.timeoutSecondsToForgetThem * 1000);

    toReturn.timer = timerToUse;

    return toReturn;
  }

  return {
    plugin: (bot: Bot) => {
      bot.Events.onCommandFound.Subscribe((ctx, command): boolean | undefined => {
        const log = makeLog(ctx, command);
        const index = findActiveIndex(log);

        if (index !== -1) {
          const lastCommandInfo = activeUsers.at(index)!;
          if (!ctx.FixedInitialMsg) {
            throw new Error(
              "[FATAL ERROR]: This should never happen. If it does, report it as an issue on github repo please. " +
                "https://github.com/KristanLaimon/WhatsBotCord.js"
            );
          }
          ctx.SendText(config.msgToSend({ pushName: ctx.FixedInitialMsg.pushName }, lastCommandInfo.command, command));
          clearTimeout(log.timer);
          return false; // reject execution
        }

        activeUsers.push(log);
        return true; // allow execution
      });

      bot.Events.onCommandFoundAfterItsExecution.Subscribe((ctx, executedCommand) => {
        const log = makeLog(ctx, executedCommand);
        const index = findActiveIndex(log);
        if (index !== -1) {
          clearTimeout(activeUsers[index]!.timer);
          activeUsers.splice(index, 1);
        }
      });
    },
  };
}
