import type { ChatSession } from './ChatSession';
import type { CommandArgs } from './CommandsSearcher.args.types';

export interface ICommand {
  name: string;
  aliases?: string[];
  description: string;

  run(chat: ChatSession, args: CommandArgs/**chat: ISpecificChat, args: BotCommandArgs*/): Promise<boolean>
}


