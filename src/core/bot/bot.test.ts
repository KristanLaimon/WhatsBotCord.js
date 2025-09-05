import { expect, test } from "bun:test";
import WhatsSocketMock from "../whats_socket/mocks/WhatsSocket.mock";
import Bot from "./bot";
import type { ChatContext } from "./internals/ChatContext";
import { CommandType } from "./internals/CommandsSearcher";
import type { CommandArgs } from "./internals/CommandsSearcher.types";
import type { ICommand, RawMsgAPI } from "./internals/IBotCommand";
//TODO: Make test suite
/**
 * Bot.ts Suite testing
 * 1. [X] Can be instantiable
 * 2. [X] Are all options setted by default (non-undefined internal options check)
 * 3. [X] Can register commands (normal and tags) without strange behavior
      3.0.1 [X] IF TWO COMMANDS duplicate of same type, error as well
 *    3.1. [X] What happens if 2 commands have the same name? (should throw error unless, they're from different type (tag != normal))
 *    3.2. [X] What happens if 2 commands have same alias? (should throw error) (not if differnet type)
 * 
 * 6. [] Can run commands and tags
 *      [] Can differentiate tags and commands (if having a tag with same name like a command)
 *      [] Can run a command with their ALIAS ONLY
 *      [] Commands receives correct arguments from the bot
 *          [] For incoming quoted msg, should send argument successfully to command
 * 7. [] Unexpected exception: Should not break bot and console.log error instead serialized as json text
 * 8. [] Expected Error "Command rejection": Should not break and console log like info
 * 9. [] Expected Error "command not rejection" (by timeout): Should console.log gracefully
 * 10. [] Middlware system add correctly new middlewares
 *        [] If all middleware are success, should continue with internal command processing
 *        [] If middleware chain stopped, should NOT continue with internal command processing
 *  */

/**
 * Out of scope but: (WhatsSocket improve suite testing)
 * 1. [] Test if all whatssocket EVENTS works as expected (needs manual testing... ofc)
 *        (Already know it works by the whole +100 tests that uses it!)
 *        TESTEABLE     [X] onIncomingMsg: Delegate<(senderId: string | null, chatId: string, rawMsg: WhatsappMessage, msgType: MsgType, senderType: SenderType) => void>; *        [] onUpdateMsg: Delegate<(senderId: string | null, chatId: string, rawMsgUpdate: WhatsappMessage, msgType: MsgType, senderType: SenderType) => void>;
 *        TESTEABLE     [] onSentMessage: Delegate<(chatId: string, rawContentMsg: AnyMessageContent, optionalMisc?: MiscMessageGenerationOptions) => void>;
 *        TESTEABLE     [] onRestart: Delegate<() => Promise<void>>;
 *        MANUAL TEST   [] onGroupEnter: Delegate<(groupInfo: GroupMetadata) => void>;
 *        MANUAL TEST[] onGroupUpdate: Delegate<(groupInfo: Partial<GroupMetadata>) => void>;
 *        TESTEABLE [] onStartupAllGroupsIn: Delegate<(allGroupsIn: GroupMetadata[]) => void>;
 */
//============= MOCK DATA ================
const CommandIdealName = "commandMock";
const CommandIdealAliases: string[] = ["mocky"];
class CommandIdeal implements ICommand {
  name: string = CommandIdealName;
  aliases?: string[] = CommandIdealAliases;
  description: string = "An ideal command object with all properties health";
  async run(_ctx: ChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {}
}

const CommandMinimumName = "commandminimal";
class CommandMinimum implements ICommand {
  name: string = CommandMinimumName;
  aliases?: string[];
  description: string = "An ideal command object with all properties health";
  async run(_ctx: ChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {}
}

const CommandDesnormalizedName = "DesNorMaLizEdCoMaNd";
const CommandDesnormalizedAliases: string[] = ["DesnOrmaLizy", "nOtConsIsTentAlIa✅"];
class CommandDesnormalized implements ICommand {
  name: string = CommandDesnormalizedName;
  aliases?: string[] = CommandDesnormalizedAliases;
  description: string = "An ideal command object with all properties health";
  async run(_ctx: ChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {}
}

const generateToolkit = () => {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 1, maxQueueLimit: 10 });
  const bot = new Bot({ ownWhatsSocketImplementation: mockSocket, commandPrefix: "!", loggerMode: "recommended" });
  return { socket: mockSocket, bot };
};
const idealCommand = new CommandIdeal();
const minimalCommand = new CommandMinimum();
const desnormalizedCommand = new CommandDesnormalized();

//================== TESTS =================

test("Creation_WhenInstatiatingSimple_ShouldNotThrow", () => {
  expect(() => {
    generateToolkit();
  }).not.toThrow();
});

test("Creation_WhenInstatiatingWithoutBotParams_ShouldSetAllConfig_NotUndefinedConfig", () => {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 1, maxQueueLimit: 10 });
  const bot = new Bot({ /**Dependency injection:*/ ownWhatsSocketImplementation: mockSocket /**No params really*/ });
  expect(bot.Settings).toBeDefined();
  for (const prop of Object.values(bot.Settings)) {
    expect(prop).toBeDefined();
  }
});

test("Commands_WhenAddingNewCommands_ShouldAddThemToInternalCommandSubmodule", () => {
  const { bot } = generateToolkit();

  bot.Commands.Add(idealCommand, CommandType.Normal);
  bot.Commands.Add(minimalCommand, CommandType.Tag);
  bot.Commands.Add(desnormalizedCommand, CommandType.Normal);

  expect(bot.Commands.NormalCommands).toHaveLength(2);
  expect(bot.Commands.TagCommands).toHaveLength(1);
});

// test("Commands_WhenAddingDuplicatedCommandsOfSameType_ShouldThrowError", () => {
//   const { bot } = generateToolkit();

//   bot.Commands.Add(idealCommand, CommandType.Normal);
//   expect(() => {
//     bot.Commands.Add(idealCommand, CommandType.Normal);
//   }).toThrow();

//   bot.Commands.Add(minimalCommand, CommandType.Tag);
//   expect(() => {
//     bot.Commands.Add(minimalCommand, CommandType.Tag);
//   }).toThrow();

//   bot.Commands.Add(desnormalizedCommand, CommandType.Normal);
//   expect(() => {
//     bot.Commands.Add(desnormalizedCommand, CommandType.Normal);
//   }).toThrow();
// });
