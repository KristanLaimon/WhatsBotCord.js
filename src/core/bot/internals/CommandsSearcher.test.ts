import { expect, test } from "bun:test";
import type { ChatContext } from "./ChatContext";
import CommandsSearcher, { CommandType } from "./CommandsSearcher";
import type { CommandArgs } from "./CommandsSearcher.types";
import type { IBotCommand, RawMsgAPI } from "./IBotCommand";

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

/**
 * .
 */
const CommandIdealName = "commandMock";
const CommandIdealAliases: string[] = ["mocky"];
class CommandIdeal implements IBotCommand {
  name: string = CommandIdealName;
  aliases?: string[] = CommandIdealAliases;
  description: string = "An ideal command object with all properties health";
  async run(_ctx: ChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {}
}

const CommandMinimumName = "commandminimal";
class CommandMinimum implements IBotCommand {
  name: string = CommandMinimumName;
  aliases?: string[];
  description: string = "An ideal command object with all properties health";
  async run(_ctx: ChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {}
}

const CommandDesnormalizedName = "DesNorMaLizEdCoMaNd";
const CommandDesnormalizedAliases: string[] = ["DesnOrmaLizy", "nOtConsIsTentAlIa✅"];
class CommandDesnormalized implements IBotCommand {
  name: string = CommandDesnormalizedName;
  aliases?: string[] = CommandDesnormalizedAliases;
  description: string = "An ideal command object with all properties health";
  async run(_ctx: ChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {}
}

test("AddingCommand_ShouldStoreItAndBeSearchable", () => {
  const searcher = new CommandsSearcher();
  expect(searcher.NormalCommands).toBeDefined();
  expect(searcher.TagCommands).toBeDefined();

  expect(searcher.NormalCommands).toHaveLength(0);
  expect(searcher.TagCommands).toHaveLength(0);
  searcher.Add(new CommandIdeal(), CommandType.Normal);
  searcher.Add(new CommandMinimum(), CommandType.Normal);
  searcher.Add(new CommandDesnormalized(), CommandType.Tag);
  expect(searcher.NormalCommands).toHaveLength(2);
  expect(searcher.TagCommands).toHaveLength(1);
});

test("Adding_WhenAddingDuplicatesCommands_ShouldOverrideWithLastAdded", () => {
  const searcher = new CommandsSearcher();

  const firstToAdd = new CommandIdeal();
  firstToAdd.description = "First Command";
  const secondToAdd = new CommandIdeal();
  secondToAdd.description = "Second Command Overwrite";

  searcher.Add(firstToAdd, CommandType.Normal);
  expect(searcher.NormalCommands).toHaveLength(1);
  expect(searcher.NormalCommands[0]!.commandObj.description).toBe("First Command");
  searcher.Add(secondToAdd, CommandType.Normal);
  expect(searcher.NormalCommands).toHaveLength(1);
  expect(searcher.NormalCommands.at(0)!.commandObj.description).toBe("Second Command Overwrite");
});

test("Exists_WhenNoCommands_ShouldReturnFalse", (): void => {
  const searcher = new CommandsSearcher();
  const exists: boolean = searcher.Exists(CommandIdealName);
  expect(exists).toBe(false);
});

test("Exists_WhenNormalCommandPresent_ShouldReturnTrue", (): void => {
  const searcher = new CommandsSearcher();
  searcher.Add(new CommandIdeal(), CommandType.Normal);
  const existsIdeal: boolean = searcher.Exists(CommandIdealName);
  expect(existsIdeal).toBe(true);

  searcher.Add(new CommandMinimum(), CommandType.Normal);
  const existsMinimum: boolean = searcher.Exists(CommandMinimumName);
  expect(existsMinimum).toBe(true);

  searcher.Add(new CommandDesnormalized(), CommandType.Normal);

  //Should find it. Command-system is (should) NOT (be) case-sensitive
  const existsDesnormalized: boolean = searcher.Exists(CommandDesnormalizedName);
  const existsDesnormalizedButLowerCased: boolean = searcher.Exists(CommandDesnormalizedName.toLowerCase());
  const existsDesnormalizedButUpperCased: boolean = searcher.Exists(CommandDesnormalizedName.toUpperCase());

  expect(existsDesnormalized).toBe(true);
  expect(existsDesnormalizedButLowerCased).toBe(true);
  expect(existsDesnormalizedButUpperCased).toBe(true);

  expect(searcher.NormalCommands).toHaveLength(3);
  expect(searcher.TagCommands).toHaveLength(0);
});

test("Exists_WhenTagCommandPresent_ShouldReturnTrue", (): void => {
  const searcher = new CommandsSearcher();
  searcher.Add(new CommandIdeal(), CommandType.Tag);
  expect(searcher.Exists(CommandIdealName)).toBe(true);
  searcher.Add(new CommandMinimum(), CommandType.Tag);
  expect(searcher.Exists(CommandMinimumName)).toBe(true);

  //Must be case insensitive as well for tags
  searcher.Add(new CommandDesnormalized(), CommandType.Tag);
  expect(searcher.Exists(CommandDesnormalizedName)).toBe(true);
  expect(searcher.Exists(CommandDesnormalizedName.toLowerCase())).toBe(true);
  expect(searcher.Exists(CommandDesnormalizedName.toUpperCase())).toBe(true);
});

test("GetType_WithMixedCommandsAdded_ShouldRecognizeEachType", (): void => {
  const searcher = new CommandsSearcher();
  searcher.Add(new CommandIdeal(), CommandType.Normal);
  searcher.Add(new CommandMinimum(), CommandType.Tag);
  searcher.Add(new CommandDesnormalized(), CommandType.Normal);

  expect(searcher.GetTypeOf(CommandIdealName)).toBe(CommandType.Normal);
  expect(searcher.GetTypeOf(CommandMinimumName)).toBe(CommandType.Tag);
  expect(searcher.GetTypeOf(CommandDesnormalizedName)).toBe(CommandType.Normal);
  expect(searcher.GetTypeOf("non_existing_command")).toBe(null);

  expect(searcher.NormalCommands).toHaveLength(2);
  expect(searcher.TagCommands).toHaveLength(1);
});

test("GetCommand_WithMixedCommandsAdded_ShouldFetchCorrectCommand", (): void => {
  const searcher = new CommandsSearcher();
  const idealCommand = new CommandIdeal();
  const minimalTagCommand = new CommandMinimum();
  searcher.Add(idealCommand, CommandType.Normal);
  searcher.Add(minimalTagCommand, CommandType.Tag);

  expect(searcher.GetCommand(CommandIdealName)).toMatchObject(idealCommand);
  expect(searcher.GetTag(CommandIdealName)).toBe(null);

  expect(searcher.GetCommand(CommandMinimumName)).toBe(null);
  expect(searcher.GetTag(CommandMinimumName)).toMatchObject(minimalTagCommand);
});

test("GetWhateverWithAlias_WithMixedCommands_ShouldFetchOnlyCommandWithAlias", (): void => {
  const searcher = new CommandsSearcher();
  const idealNormalCommand = new CommandIdeal();
  searcher.Add(idealNormalCommand, CommandType.Normal);

  const found = searcher.GetWhateverWithAlias(CommandIdealAliases.at(0)!, CommandType.Normal);
  expect(found).toBeDefined();
  expect(found).toMatchObject(idealNormalCommand);

  const desnormalizedTagCommand: IBotCommand = new CommandDesnormalized();
  searcher.Add(desnormalizedTagCommand, CommandType.Tag);
  const found2 = searcher.GetWhateverWithAlias(CommandDesnormalizedAliases.at(0)!, CommandType.Tag);
  expect(found2).toBeDefined();
  expect(found2).toMatchObject(desnormalizedTagCommand);

  let notFound = searcher.GetWhateverWithAlias("not-existing-alias", CommandType.Normal);
  expect(notFound).toBe(null);
  notFound = searcher.GetWhateverWithAlias("not-existing-alias", CommandType.Tag);
});
