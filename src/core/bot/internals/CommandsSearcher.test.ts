import { test, it, describe, mock as fn, expect } from "bun:test";
import CommandsSearcher, { CommandType } from "./CommandsSearcher";
import type { ICommand, RawMsgAPI } from "./IBotCommand";
import type { WhatsSocketReceiver_SubModule } from "src/core/whats_socket/internals/WhatsSocket.receiver";
import type { WhatsSocketSugarSender_Submodule } from "src/core/whats_socket/internals/WhatsSocket.sugarsenders";
import type { ChatSession } from "./ChatSession";
import type { CommandArgs } from "./CommandsSearcher.types";

/**
 * CommandSearcher suite testing
 * Things to check on this class:
 * 1. Getting NormalCommands Prop
 * 2. Getting TagCommands Prop
 * 
 * a. Adding a command
 * b. Check if a command exists (either tag or normal command)
 * c. Check the type of a command (if it even exists ofc)
 * d. Getting an existing command obj
 * e. Getting an existing tag obj
 * f. Getting (either tag or normal command) by alias (if they had)
 */

class CommandIdeal implements ICommand {
  name: string = "commandmock";
  aliases?: string[] = ["mocky"];
  description: string = "An ideal command object with all properties health";
  async run(_rawMsgApi: RawMsgAPI, _chat: ChatSession, _args: CommandArgs): Promise<boolean> {
    return true;
  }
}

class CommandMinimum implements ICommand {
  name: string = "commandminimal";
  aliases?: string[];
  description: string = "An ideal command object with all properties health";
  async run(_rawMsgApi: RawMsgAPI, _chat: ChatSession, _args: CommandArgs): Promise<boolean> {
    return true;
  }
}

class CommandDesnormalized implements ICommand {
  name: string = "DesNorMaLizEdCoMaNd";
  aliases?: string[] = ["DesnOrmaLizy", "nOtConsIsTentAlIa✅"];
  description: string = "An ideal command object with all properties health";
  async run(_rawMsgApi: RawMsgAPI, _chat: ChatSession, _args: CommandArgs): Promise<boolean> {
    return true;
  }
}

test("AddingCommand_ShouldStoreItAndBeSearchable", () => {
  const searcher = new CommandsSearcher();
  expect(searcher.NormalCommands).toBeDefined();
  expect(searcher.TagCommands).toBeDefined();

  expect(searcher.NormalCommands).toHaveLength(0);
  expect(searcher.TagCommands).toHaveLength(0);
  searcher.AddCommand(new CommandIdeal(), CommandType.Normal);
  expect(searcher.NormalCommands).toHaveLength(1);
  expect(searcher.TagCommands).toHaveLength(0);
});


