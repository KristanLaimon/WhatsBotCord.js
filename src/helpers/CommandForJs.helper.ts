import type { CommandArgs } from "../core/bot/internals/CommandsSearcher.types.js";
import type { IChatContext } from "../core/bot/internals/IChatContext.js";
import type { AdditionalAPI, ICommand } from "../core/bot/internals/ICommand.js";

export type CommandParams = {
  aliases?: string[];
};

/**
 * A simple function to create your commands for JS Developers.
 * Gives you intelissense when creating your commands without needing
 * JsDocs or typescript
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
