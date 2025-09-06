import { expect, spyOn, test } from "bun:test";
import {
  MockGroupTxtMsg_CHATID as GroupMsg_CHATID,
  MockGroupTxtMsg_SENDERID as GroupMsg_SENDERID,
  MockGroupTxtMsg as GroupTxtMsg,
  MockIndividualTxtMsg_CHATID as IndividualMsg_CHATID,
  MockIndividualTxtMsg as IndividualTxtMsg,
} from "../../mocks/MockIndividualGroup";
import { MsgType, SenderType } from "../../Msg.types";
import { WhatsSocket_Submodule_Receiver } from "../whats_socket/internals/WhatsSocket.receiver";
import { WhatsSocket_Submodule_SugarSender } from "../whats_socket/internals/WhatsSocket.sugarsenders";
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
 *      [X] Can run a normal command
 *      [X] CAn run a tag command
 *      [X] Can differentiate tags and commands (if having a tag with same name like a command)
 *      [X] Can run a command with their ALIAS ONLY
 *      [X] Commands receives correct arguments from the bot
 *          [] For incoming quoted msg, should send argument successfully to command
 *      [] When running only @ or ! (common prefixes) shouldn't do anything
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
const CommandIdealName = "ideal";
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
  const bot = new Bot({ ownWhatsSocketImplementation: mockSocket, commandPrefix: "!", loggerMode: "recommended", enableCommandSafeNet: false });
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

//All command testing related can be found in CommandSearcher.test.ts
test("Commands_WhenAddingNewCommands_ShouldAddThemToInternalCommandSubmodule", () => {
  const { bot } = generateToolkit();

  bot.Commands.Add(idealCommand, CommandType.Normal);
  bot.Commands.Add(minimalCommand, CommandType.Tag);
  bot.Commands.Add(desnormalizedCommand, CommandType.Normal);

  expect(bot.Commands.NormalCommands).toHaveLength(2);
  expect(bot.Commands.TagCommands).toHaveLength(1);
});

test("Running_WhenRunningSimple_NORMALCOMMAND_FROMGROUP_ShouldSuccessfully", async () => {
  const { bot, socket } = generateToolkit();
  const command: ICommand = {
    name: "hello",
    description: "mock hello description",
    aliases: [],
    async run(chat, api, args) {
      expect(chat).toBeDefined();

      expect(api).toBeDefined();
      expect(api.Receive).toBeInstanceOf(WhatsSocket_Submodule_Receiver);
      expect(api.Send).toBeInstanceOf(WhatsSocket_Submodule_SugarSender);

      expect(args).toBeDefined();
      expect(args.args).toEqual(["arg1", "arg2", "arg3", "arg4", "..."]);
      expect(args.chatId).toBe(GroupMsg_CHATID);
      expect(args.msgType).toBe(MsgType.Text);
      expect(args.originalRawMsg).toMatchObject(GroupTxtMsg);
      expect(args.quotedMsg).toBe(null);
      expect(args.senderType).toBe(SenderType.Group);
      expect(args.userId).toBe(GroupMsg_SENDERID);

      console.log(" ==== I'm code running inside a normal command! FROM GROUP ====");
    },
  };
  bot.Commands.Add(command, CommandType.Normal);
  bot.Start();
  const commandRunSpy = spyOn(command, "run");
  await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "!hello arg1 arg2 arg3 arg4 ..." });
  expect(commandRunSpy).toHaveBeenCalledTimes(1);
});

test("Running_WhenRunningSimple_TAGCOMMAND_FROMGROUP_ShouldBeSuccessfully", async () => {
  const { bot, socket } = generateToolkit();
  const command: ICommand = {
    name: "hellotag",
    description: "mock hello tag description",
    aliases: [],
    async run(chat, api, args) {
      expect(chat).toBeDefined();

      expect(api).toBeDefined();
      expect(api.Receive).toBeInstanceOf(WhatsSocket_Submodule_Receiver);
      expect(api.Send).toBeInstanceOf(WhatsSocket_Submodule_SugarSender);

      expect(args).toBeDefined();
      expect(args.args).toEqual(["arg1", "arg2", "arg3", "arg4", "..."]);
      expect(args.chatId).toBe(GroupMsg_CHATID);
      expect(args.msgType).toBe(MsgType.Text);
      expect(args.originalRawMsg).toMatchObject(GroupTxtMsg);
      expect(args.quotedMsg).toBe(null);
      expect(args.senderType).toBe(SenderType.Group);
      expect(args.userId).toBe(GroupMsg_SENDERID);

      console.log(" ==== I'm code running inside a tag command! FROM GROUP ====");
    },
  };
  bot.Commands.Add(command, CommandType.Tag);
  bot.Start();
  const commandRunSpy = spyOn(command, "run");
  await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "@hellotag arg1 arg2 arg3 arg4 ..." });
  expect(commandRunSpy).toHaveBeenCalledTimes(1);
});

test("Running_WhenRunningSimple_NORMALCOMMAND_FROMINDIVIDUAL_ShouldSuccessfully", async () => {
  const { bot, socket } = generateToolkit();
  const command: ICommand = {
    name: "hello",
    description: "mock hello description",
    aliases: [],
    async run(chat, api, args) {
      expect(chat).toBeDefined();

      expect(api).toBeDefined();
      expect(api.Receive).toBeInstanceOf(WhatsSocket_Submodule_Receiver);
      expect(api.Send).toBeInstanceOf(WhatsSocket_Submodule_SugarSender);

      expect(args).toBeDefined();
      expect(args.args).toEqual(["arg1", "arg2", "arg3", "arg4", "..."]);
      expect(args.chatId).toBe(IndividualMsg_CHATID);
      expect(args.msgType).toBe(MsgType.Text);
      expect(args.originalRawMsg).toMatchObject(IndividualTxtMsg);
      expect(args.quotedMsg).toBe(null);

      //Comes from private msg
      expect(args.senderType).toBe(SenderType.Individual);
      expect(args.userId).toBe(null);

      console.log(" ==== I'm code running inside a normal command! FROM INDIVIDUAL ====");
    },
  };
  bot.Commands.Add(command, CommandType.Normal);
  bot.Start();
  const commandRunSpy = spyOn(command, "run");
  await socket.MockSendMsgAsync(IndividualTxtMsg, { replaceTextWith: "!hello arg1 arg2 arg3 arg4 ..." });
  expect(commandRunSpy).toHaveBeenCalledTimes(1);
});

test("Running_WhenRunningSimple_TAGCOMMAND_FROMINDIVIDUAL_ShouldBeSuccessfully", async () => {
  const { bot, socket } = generateToolkit();
  const command: ICommand = {
    name: "hellotag",
    description: "mock hello tag description",
    aliases: [],
    async run(chat, api, args) {
      expect(chat).toBeDefined();

      expect(api).toBeDefined();
      expect(api.Receive).toBeInstanceOf(WhatsSocket_Submodule_Receiver);
      expect(api.Send).toBeInstanceOf(WhatsSocket_Submodule_SugarSender);

      expect(args).toBeDefined();
      expect(args.args).toEqual(["arg1", "arg2", "arg3", "arg4", "..."]);
      expect(args.chatId).toBe(IndividualMsg_CHATID);
      expect(args.msgType).toBe(MsgType.Text);
      expect(args.originalRawMsg).toMatchObject(IndividualTxtMsg);
      expect(args.quotedMsg).toBe(null);

      //Comes from private msg
      expect(args.senderType).toBe(SenderType.Individual);
      expect(args.userId).toBe(null);

      console.log(" ==== I'm code running inside a tag command! FROM INDIVIDUAL ====");
    },
  };
  bot.Commands.Add(command, CommandType.Tag);
  bot.Start();
  const commandRunSpy = spyOn(command, "run");
  await socket.MockSendMsgAsync(IndividualTxtMsg, { replaceTextWith: "@hellotag arg1 arg2 arg3 arg4 ..." });
  expect(commandRunSpy).toHaveBeenCalledTimes(1);
});

test("Running_MsgTagWithCommandNormal_ShouldNotReceiveIt", async () => {
  const { bot, socket } = generateToolkit();
  const command: ICommand = {
    name: "mycommand_normal",
    description: "mock mycommand_normal description",
    async run(_ctx, _rawMsgApi, _args) {
      throw new Error("This command MUST NOT be executed!");
    },
  };
  bot.Commands.Add(command, CommandType.Normal);
  const commandRunSpy = spyOn(command, "run");
  await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "@mycommand_normal hello world" });
  expect(commandRunSpy).toHaveBeenCalledTimes(0);
});

test("Running_MsgNormalCommandWithTag_ShouldNotReceiveIt", async () => {
  const { bot, socket } = generateToolkit();
  const command: ICommand = {
    name: "mycommand_tag",
    description: "mock mycommand_tag description",
    async run(_ctx, _rawMsgApi, _args) {
      throw new Error("This command MUST NOT be executed!");
    },
  };
  bot.Commands.Add(command, CommandType.Tag);
  const commandRunSpy = spyOn(command, "run");
  await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "!mycommand_normal hello world" });
  expect(commandRunSpy).toHaveBeenCalledTimes(0);
});

test("Running_WhenHavingTwoDifferentTypeCommandsWithSameName_ShouldRecognizeThemAsDifferent", async () => {
  const { bot, socket } = generateToolkit();

  let normalCommandCalled: boolean = false;
  const commandNormal: ICommand = {
    name: "samecommand",
    description: "mock samecomand description",
    async run(_ctx, _rawMsgApi, _args) {
      normalCommandCalled = true;
    },
  };
  let tagCommandCalled: boolean = false;
  const commandTag: ICommand = {
    name: "samecommand",
    description: "mock samecomand description",
    async run(_ctx, _rawMsgApi, _args) {
      tagCommandCalled = true;
    },
  };

  bot.Commands.Add(commandNormal, CommandType.Normal);
  bot.Commands.Add(commandTag, CommandType.Tag);
  const normalCommandRunSpy = spyOn(commandNormal, "run");
  const tagCommandRunSpy = spyOn(commandTag, "run");

  await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "!samecommand" });

  expect(normalCommandRunSpy).toHaveBeenCalledTimes(1);
  expect(normalCommandCalled).toBe(true);

  expect(tagCommandRunSpy).toHaveBeenCalledTimes(0);
  expect(tagCommandCalled).toBe(false);

  await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "@samecommand" });

  expect(normalCommandRunSpy).toHaveBeenCalledTimes(1);
  expect(normalCommandCalled).toBe(true);

  expect(tagCommandRunSpy).toHaveBeenCalledTimes(1);
  expect(tagCommandCalled).toBe(true);
});

// test("");

//TODO: Verify command names can't have " " spaces, only 1 word long
