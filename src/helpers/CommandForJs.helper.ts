import type { CommandArgs } from "../core/bot/internals/CommandsSearcher.types.js";
import type { IChatContext } from "../core/bot/internals/IChatContext.js";
import type { AdditionalAPI, ICommand } from "../core/bot/internals/ICommand.js";

/**
 * # Command Parameters
 *
 * Optional parameters to define additional properties for a newly created command, such as aliases.
 *
 * @example
 * ```typescript
 * const params: CommandParams = { aliases: ["ping", "p"] };
 * ```
 */
export type CommandParams = {
  aliases?: string[];
};

/**
 * # Create Command Helper
 *
 * A simple function to create commands primarily for JS developers.
 * Gives you intellisense when creating your commands without needing
 * manual typings inline.
 *
 * @param commandName - The main trigger string for the command.
 * @param run - The execution function where the logic is defined.
 * @param params - Optional parameters like aliases.
 * @returns A structured `ICommand` ready to be registered in the bot.
 *
 * @example
 * ```typescript
 * const pingCommand = CreateCommand("ping", async (ctx) => {
 *   await ctx.Reply("pong");
 * });
 * ```
 */
export default function CreateCommand(
  commandName: string,
  run: (ctx: IChatContext, api: AdditionalAPI, args: CommandArgs) => Promise<void>,
  params?: CommandParams
): ICommand {
  return {
    name: commandName,
    run: run,
    aliases: params?.aliases,
  };
}
