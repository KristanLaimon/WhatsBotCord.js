import { expect, mock as fn, spyOn, test } from "bun:test";
import { type WhatsappMessage, MsgHelpers } from "../..";
import { skipLongTests } from "../../Envs.js";
import {
  MockGroupTxtMsg_CHATID as GroupMsg_CHATID,
  MockGroupTxtMsg_SENDERID as GroupMsg_SENDERID,
  MockGroupTxtMsg as GroupTxtMsg,
  MockIndividualTxtMsg_CHATID as IndividualMsg_CHATID,
  MockIndividualTxtMsg as IndividualTxtMsg,
  MockGroupTxtMsg,
  MockGroupTxtMsg_CHATID,
  MockGroupTxtMsg_SENDERID,
} from "../../mocks/MockIndividualGroup.mock.js";
import { MockQuotedMsg_Group, MockQuotedMsg_Individual } from "../../mocks/MockQuotedMsgs.mock.js";
import { MsgType, SenderType } from "../../Msg.types.js";
import {
  type WhatsSocketReceiverError,
  WhatsSocket_Submodule_Receiver,
  WhatsSocketReceiverHelper_isReceiverError,
  WhatsSocketReceiverMsgError,
} from "../whats_socket/internals/WhatsSocket.receiver.js";
import { WhatsSocket_Submodule_SugarSender } from "../whats_socket/internals/WhatsSocket.sugarsenders.js";
import WhatsSocketMock from "../whats_socket/mocks/WhatsSocket.mock.js";
import Bot, { type WhatsbotcordMiddlewareFunct } from "./bot.js";
import type { ChatContext } from "./internals/ChatContext.js";
import { CommandType } from "./internals/CommandsSearcher.js";
import type { CommandArgs } from "./internals/CommandsSearcher.types.js";
import type { AdditionalAPI, ICommand } from "./internals/ICommand.js";

/** WOW = All finished!
 * Bot.ts Suite testing
 * 1. [X] Can be instantiable
 * 2. [X] Are all options setted by default (non-undefined internal options check)
 * 3. [X] Can register commands (normal and tags) without strange behavior
      3.0.1 [X] IF TWO COMMANDS duplicate of same type, error as well
 *    3.1. [X] What happens if 2 commands have the same name? (should throw error unless, they're from different type (tag != normal))
 *    3.2. [X] What happens if 2 commands have same alias? (should throw error) (not if differnet type)
 * 
 * 6. [X] Can run commands and tags
 *      [X] Can run a normal command
 *      [X] CAn run a tag command
 *      [X] Can differentiate tags and commands (if having a tag with same name like a command)
 *      [X] Can run a command with their ALIAS ONLY
 *      [X] Commands receives correct arguments from the bot
 *          [X] For incoming quoted msg, should send argument successfully to command
 *      [X] When running only @ or ! (common prefixes) shouldn't do anything
 * 7. [X] Unexpected exception: Should not break bot and console.log error instead serialized as json text
 * 8. [X] Expected Error "Command rejection": Should not break and console log like info
 * 9. [X] Expected Error "command not rejection" (by timeout): Shouldn't console anything, and return null on waitMsg who triggered it
 * 10. [X] Middlware system add correctly new middlewares
 *        [X] If all middleware are success, should continue with internal command processing
 *        [X] If middleware chain stopped, should NOT continue with internal command processing
 *  */

//============= MOCK DATA ================
const CommandIdealName = "ideal";
const CommandIdealAliases: string[] = ["mocky"];
class CommandIdeal implements ICommand {
  name: string = CommandIdealName;
  aliases?: string[] = CommandIdealAliases;
  description: string = "An ideal command object with all properties health";
  async run(_ctx: ChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {}
}

const CommandMinimumName = "commandminimal";
class CommandMinimum implements ICommand {
  name: string = CommandMinimumName;
  aliases?: string[];
  description: string = "An ideal command object with all properties health";
  async run(_ctx: ChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {}
}

const CommandDesnormalizedName = "DesNorMaLizEdCoMaNd";
const CommandDesnormalizedAliases: string[] = ["DesnOrmaLizy", "nOtConsIsTentAlIa✅"];
class CommandDesnormalized implements ICommand {
  name: string = CommandDesnormalizedName;
  aliases?: string[] = CommandDesnormalizedAliases;
  description: string = "An ideal command object with all properties health";
  async run(_ctx: ChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {}
}

/**
 * Internal toolkit (dependeny injection creator) for easy mock creation in this bot.test.ts file
 * @returns all mock items needed for each test
 */
const toolkit = () => {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 1, maxQueueLimit: 10 });
  const bot = new Bot({ ownWhatsSocketImplementation_Internal: mockSocket, commandPrefix: "!", loggerMode: "recommended", enableCommandSafeNet: false });
  return { socket: mockSocket, bot };
};

const idealCommand = new CommandIdeal();
const minimalCommand = new CommandMinimum();
const desnormalizedCommand = new CommandDesnormalized();

class VerySimpleCommand implements ICommand {
  name: string = "simple";
  aliases?: string[] | undefined = ["s"];
  description: string = "Simple command description";
  async run(_ctx: ChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {}
}

// ========================== CREATION ============================
test("Creation_WhenInstatiatingSimple_ShouldNotThrow", () => {
  expect(() => {
    toolkit();
  }).not.toThrow();
});

test("Creation_WhenInstatiatingWithoutBotParams_ShouldSetAllConfig_NotUndefinedConfig", () => {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 1, maxQueueLimit: 10 });
  const bot = new Bot({ /**Dependency injection:*/ ownWhatsSocketImplementation_Internal: mockSocket /**No params really*/ });
  expect(bot.Settings).toBeDefined();
  for (const prop of Object.values(bot.Settings)) {
    expect(prop).toBeDefined();
  }
});

// ========================== COMMANDS ============================

//All command testing related can be found in CommandSearcher.test.ts
test("Commands_WhenAddingNewCommands_ShouldAddThemToInternalCommandSubmodule", () => {
  const { bot } = toolkit();

  bot.Commands.Add(idealCommand, CommandType.Normal);
  bot.Commands.Add(minimalCommand, CommandType.Tag);
  bot.Commands.Add(desnormalizedCommand, CommandType.Normal);

  expect(bot.Commands.NormalCommands).toHaveLength(2);
  expect(bot.Commands.TagCommands).toHaveLength(1);
});

// ========================= RUNNING ============================

test("Running_WhenRunningSimple_NORMALCOMMAND_FROMGROUP_ShouldSuccessfully", async () => {
  const { bot, socket } = toolkit();
  const command: ICommand = {
    name: "hello",
    aliases: [],
    async run(chat, api, args) {
      expect(chat).toBeDefined();

      expect(api).toBeDefined();
      expect(api.InternalSocket.Receive).toBeInstanceOf(WhatsSocket_Submodule_Receiver);
      expect(api.InternalSocket.Send).toBeInstanceOf(WhatsSocket_Submodule_SugarSender);

      expect(args).toBeDefined();
      expect(args.args).toEqual(["arg1", "arg2", "arg3", "arg4", "..."]);
      expect(args.chatId).toBe(GroupMsg_CHATID);
      expect(args.msgType).toBe(MsgType.Text);
      expect(args.originalRawMsg).toMatchObject(GroupTxtMsg);
      expect(args.quotedMsgInfo).toBe(null);
      expect(args.senderType).toBe(SenderType.Group);
      expect(args.participantIdLID).toBe(GroupMsg_SENDERID);

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
  const { bot, socket } = toolkit();
  const command: ICommand = {
    name: "hellotag",
    aliases: [],
    async run(chat, api, args) {
      expect(chat).toBeDefined();

      expect(api).toBeDefined();
      expect(api.InternalSocket.Receive).toBeInstanceOf(WhatsSocket_Submodule_Receiver);
      expect(api.InternalSocket.Send).toBeInstanceOf(WhatsSocket_Submodule_SugarSender);

      expect(args).toBeDefined();
      expect(args.args).toEqual(["arg1", "arg2", "arg3", "arg4", "..."]);
      expect(args.chatId).toBe(GroupMsg_CHATID);
      expect(args.msgType).toBe(MsgType.Text);
      expect(args.originalRawMsg).toMatchObject(GroupTxtMsg);
      expect(args.quotedMsgInfo).toBe(null);
      expect(args.senderType).toBe(SenderType.Group);
      expect(args.participantIdLID).toBe(GroupMsg_SENDERID);

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
  const { bot, socket } = toolkit();
  const command: ICommand = {
    name: "hello",
    aliases: [],
    async run(chat, api, args) {
      expect(chat).toBeDefined();

      expect(api).toBeDefined();
      expect(api.InternalSocket.Receive).toBeInstanceOf(WhatsSocket_Submodule_Receiver);
      expect(api.InternalSocket.Send).toBeInstanceOf(WhatsSocket_Submodule_SugarSender);

      expect(args).toBeDefined();
      expect(args.args).toEqual(["arg1", "arg2", "arg3", "arg4", "..."]);
      expect(args.chatId).toBe(IndividualMsg_CHATID);
      expect(args.msgType).toBe(MsgType.Text);
      expect(args.originalRawMsg).toMatchObject(IndividualTxtMsg);
      expect(args.quotedMsgInfo).toBe(null);

      //Comes from private msg
      expect(args.senderType).toBe(SenderType.Individual);
      expect(args.participantIdLID).toBe(null);

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
  const { bot, socket } = toolkit();
  const command: ICommand = {
    name: "hellotag",
    aliases: [],
    async run(chat, api, args) {
      expect(chat).toBeDefined();

      expect(api).toBeDefined();
      expect(api.InternalSocket.Receive).toBeInstanceOf(WhatsSocket_Submodule_Receiver);
      expect(api.InternalSocket.Send).toBeInstanceOf(WhatsSocket_Submodule_SugarSender);

      expect(args).toBeDefined();
      expect(args.args).toEqual(["arg1", "arg2", "arg3", "arg4", "..."]);
      expect(args.chatId).toBe(IndividualMsg_CHATID);
      expect(args.msgType).toBe(MsgType.Text);
      expect(args.originalRawMsg).toMatchObject(IndividualTxtMsg);
      expect(args.quotedMsgInfo).toBe(null);

      //Comes from private msg
      expect(args.senderType).toBe(SenderType.Individual);
      expect(args.participantIdLID).toBe(null);

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
  const { bot, socket } = toolkit();
  const command: ICommand = {
    name: "mycommand_normal",
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
  const { bot, socket } = toolkit();
  const command: ICommand = {
    name: "mycommand_tag",
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
  const { bot, socket } = toolkit();

  let normalCommandCalled: boolean = false;
  const commandNormal: ICommand = {
    name: "samecommand",
    async run(_ctx, _rawMsgApi, _args) {
      normalCommandCalled = true;
    },
  };
  let tagCommandCalled: boolean = false;
  const commandTag: ICommand = {
    name: "samecommand",
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

test("Running_WhenReceivingCommandFromQuotedMsg_FROMGROUP_ShouldRecognizeQuotedMsg", async () => {
  const { bot, socket } = toolkit();
  const com: ICommand = {
    name: "replyto",
    async run(_ctx, _rawMsgApi, args) {
      expect(args.quotedMsgInfo).toBeDefined();

      expect(args.quotedMsgInfo?.type).toBe(MsgType.Text);
      // expect(args.quotedMsgInfo?.userIdItComesFrom).toBe("111222333444555@lid");
      const txt = MsgHelpers.QuotedMsg_GetText(args.quotedMsgInfo!.msg);
      expect(txt).toBe("!ping");
      console.log(args.quotedMsgInfo?.msg.extendedTextMessage?.text ?? "___");
    },
  };
  bot.Commands.Add(com, CommandType.Normal);
  const runSpy = spyOn(com, "run");
  await socket.MockSendMsgAsync(MockQuotedMsg_Group, { replaceTextWith: "!replyto" });
  expect(runSpy).toHaveBeenCalledTimes(1);
});

test("Running_WhenReceivingCommandFromQuotedMsg_FROMINDIVIDUAL_ShouldRecognizeQuotedMsg", async () => {
  const { bot, socket } = toolkit();
  const com: ICommand = {
    name: "replyto",
    async run(_ctx, _rawMsgApi, args) {
      expect(args.quotedMsgInfo).toBeDefined();

      expect(args.quotedMsgInfo?.type).toBe(MsgType.Text);
      // expect(args.quotedMsgInfo?.userIdItComesFrom).toBe(MockQuotedMsg_Individual_CHATID);
      const txt = MsgHelpers.QuotedMsg_GetText(args.quotedMsgInfo!.msg);
      expect(txt).toBe("!ping");
      console.log(args.quotedMsgInfo?.msg.extendedTextMessage?.text ?? "___");
    },
  };
  bot.Commands.Add(com, CommandType.Normal);
  const runSpy = spyOn(com, "run");
  await socket.MockSendMsgAsync(MockQuotedMsg_Individual, { replaceTextWith: "!replyto" });
  expect(runSpy).toHaveBeenCalledTimes(1);
});

test("Running_WhenReceivingOnlyPrefixMsg_FROMGROUP_NORMALCOMMAND_ShouldIgnoreItAndNotExecuteAnyCommand", async () => {
  const { bot, socket } = toolkit();
  const com: ICommand = {
    name: "commy",
    async run(_ctx, _rawMsgApi, _args) {},
  };
  //This works as well with tags, same logic
  bot.Commands.Add(com, CommandType.Normal);
  const runSpy = spyOn(com, "run");
  //Taking into account initial bot config with "!" inside generateToolKit logic.
  await socket.MockSendMsgAsync(MockQuotedMsg_Group, { replaceTextWith: "" });
  expect(runSpy).not.toHaveBeenCalled();
  await socket.MockSendMsgAsync(MockQuotedMsg_Group, { replaceTextWith: "@" });
  expect(runSpy).not.toHaveBeenCalled();
  await socket.MockSendMsgAsync(MockQuotedMsg_Group, { replaceTextWith: "!" });
  expect(runSpy).not.toHaveBeenCalled();
  await socket.MockSendMsgAsync(MockQuotedMsg_Group, { replaceTextWith: "!badcommand" });
  expect(runSpy).not.toHaveBeenCalled();
  await socket.MockSendMsgAsync(MockQuotedMsg_Group, { replaceTextWith: "!commy" });
  expect(runSpy).toHaveBeenCalledTimes(1);
});

test("Running_WhenReceivingOnlyPrefixMsg_FROMGROUP_TAGCOMMAND_ShouldIgnoreItAndNotExecuteAnyCommand", async () => {
  const { bot, socket } = toolkit();
  const com: ICommand = {
    name: "commy",
    async run(_ctx, _rawMsgApi, _args) {},
  };
  //This works as well with tags, same logic
  bot.Commands.Add(com, CommandType.Tag);
  const runSpy = spyOn(com, "run");
  //Taking into account initial bot config with "!" inside generateToolKit logic.
  await socket.MockSendMsgAsync(MockQuotedMsg_Group, { replaceTextWith: "" });
  expect(runSpy).not.toHaveBeenCalled();
  await socket.MockSendMsgAsync(MockQuotedMsg_Group, { replaceTextWith: "@" });
  expect(runSpy).not.toHaveBeenCalled();
  await socket.MockSendMsgAsync(MockQuotedMsg_Group, { replaceTextWith: "!" });
  expect(runSpy).not.toHaveBeenCalled();
  await socket.MockSendMsgAsync(MockQuotedMsg_Group, { replaceTextWith: "@badcommand" });
  expect(runSpy).not.toHaveBeenCalled();
  await socket.MockSendMsgAsync(MockQuotedMsg_Group, { replaceTextWith: "@commy" });
  expect(runSpy).toHaveBeenCalledTimes(1);
});

// ======================= ERRORS HANDLING =============================

test("ErrorsHandling_WhenExecutingCommandAndGottenUnexpectedError_ShouldRespectSafeNetOptionAndConsoleLogItJsonSerialized", async () => {
  const { bot, socket } = toolkit();
  const com = new VerySimpleCommand();
  com.run = async function (): Promise<void> {
    throw new Error("Mocking unexpected error");
  };
  // =====
  bot.Settings.enableCommandSafeNet = false;
  // =====
  bot.Commands.Add(com, CommandType.Normal);
  const consoleLogSpy = spyOn(console, "log");
  expect(async () => {
    await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: `!${com.name}` });
  }).toThrow();
  expect(consoleLogSpy).toHaveBeenCalledTimes(1);
  expect(consoleLogSpy).toHaveBeenLastCalledWith(`[COMMAND EXECUTION ERROR]: Error when trying to execute '${com.name.toLowerCase()}'\n\n`, expect.anything());

  // =====
  bot.Settings.enableCommandSafeNet = true;
  // =====
  expect(async () => {
    await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: `!${com.name}` });
  }).not.toThrow();
  expect(consoleLogSpy).toHaveBeenCalledTimes(2);
  expect(consoleLogSpy).toHaveBeenLastCalledWith(`[COMMAND EXECUTION ERROR]: Error when trying to execute '${com.name.toLowerCase()}'\n\n`, expect.anything());
  consoleLogSpy.mockReset();
  consoleLogSpy.mockRestore();
});

test.skipIf(false)(
  "ErrorsHandling_WhenExecutingCommandAndGottenExpected_WhenRejectingByCancelKewWords_ShouldRespectSafeNetOptionAndThrowAccordingToIt",
  async () => {
    //1. Setting up

    const { bot, socket } = toolkit();

    //1.1 Setting up mock comand
    const com = new VerySimpleCommand();
    com.run = async function (ctx): Promise<void> {
      //Simulates it waits for user a txt msg, but user will send "cancel"
      await ctx.WaitMsg(MsgType.Text, { timeoutSeconds: 2, cancelKeywords: ["cancel"] });
    };
    bot.Commands.Add(com, CommandType.Normal);

    //1.2 Setting up spyListeners
    const consoleLogSpy = spyOn(console, "log");

    //# ============ Testing when safe net DISABLED =================
    bot.Settings.enableCommandSafeNet = false; //Should throw
    //===============================================================
    try {
      const prom1 = socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: `!${com.name.toLowerCase()}` });
      //Wait a little to let comamnd to reach "WaitMsg" image line inside command
      await new Promise((r) => setTimeout(r, 1000));
      const prom2 = socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "cancel" });
      await Promise.all([prom1, prom2]);
      throw new Error("Should throw error!!!, this line must not be executed!");
    } catch (e) {
      if (WhatsSocketReceiverHelper_isReceiverError(e)) {
        expect(e).toMatchObject({
          chatId: MockGroupTxtMsg_CHATID,
          errorMessage: WhatsSocketReceiverMsgError.UserCanceledWaiting,
          participantId_LID: MockGroupTxtMsg_SENDERID,
          participantId_PN: null,
          wasAbortedByUser: true,
        } satisfies WhatsSocketReceiverError);
      } else {
        console.log(Error);
        expect(e).not.toBeDefined();
      }
    }
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenLastCalledWith(`[Command Canceled]: Name ${com.name.toLowerCase()}`);

    //# ============ Testing when safe net ENABLED =================
    bot.Settings.enableCommandSafeNet = true; //Should not throw anything
    //===============================================================
    expect(async () => {
      const prom1 = socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: `!${com.name.toLowerCase()}` });
      //Wait a little to let comamnd to reach "WaitMsg" image line inside command
      await new Promise((r) => setTimeout(r, 1000));
      const prom2 = socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "cancel" });
      await Promise.all([prom1, prom2]);
    }).not.toThrow();
    expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    expect(consoleLogSpy).toHaveBeenLastCalledWith(`[Command Canceled]: Name ${com.name.toLowerCase()}`);

    //2. Cleaning
    consoleLogSpy.mockReset();
    consoleLogSpy.mockRestore();
  }
);

test.skipIf(skipLongTests)(
  "ErrorsHandling_WhenExecutingCommandAndGottenExpected_NotRejectedByUser;ByTimeoutError_ShouldRespectSafeNetOptionAndThrowAccordingToIt",
  async () => {
    const { bot, socket } = toolkit();
    const com = new VerySimpleCommand();
    let expectedNullMsg: WhatsappMessage | null | undefined;
    com.run = async function (ctx): Promise<void> {
      //Simulates it waits for user a txt msg, but user wont send it in the following 3 seconds, so, it will return "null"!
      console.warn("Waiting 2 seconds for a 'timeout' test...");
      const expectedMsg: WhatsappMessage | null = await ctx.WaitMsg(MsgType.Text, { timeoutSeconds: 2 });
      expectedNullMsg = expectedMsg;
      expect(expectedMsg).toBeNull();
    };

    // =====
    bot.Settings.enableCommandSafeNet = false;
    // =====
    bot.Commands.Add(com, CommandType.Normal);
    const consoleLogSpy = spyOn(console, "log");
    expect(async () => {
      await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: `!${com.name.toLowerCase()}` });
    }).not.toThrow();
    expect(consoleLogSpy).toHaveBeenCalledTimes(0);
    expect(expectedNullMsg).toBeNull();

    // =====
    bot.Settings.enableCommandSafeNet = true;
    // =====
    expect(async () => {
      await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: `!${com.name.toLowerCase()}` });
    }).not.toThrow();
    expect(consoleLogSpy).toHaveBeenCalledTimes(0);
    expect(expectedNullMsg).toBeNull();
    consoleLogSpy.mockReset();
    consoleLogSpy.mockRestore();
  }
);

// ================= MIDDLEWARE ==================
test("Middleware_WhenAddingMiddleware_ShouldAddItInternally", async () => {
  const { bot, socket } = toolkit();
  const firstLayer = fn<WhatsbotcordMiddlewareFunct>((_, __, ___, ____, _____, ______, next) => {
    next();
  });
  const secondLayerAsync = fn<WhatsbotcordMiddlewareFunct>(async (_, __, ___, ____, _____, ______, next) => {
    await next();
  });
  bot.Use(firstLayer);
  bot.Use(secondLayerAsync);
  bot.Start();
  await socket.MockSendMsgAsync(MockGroupTxtMsg /**doesn't matter what says or type, just send something*/);
  expect(firstLayer).toHaveBeenCalledTimes(1);
  expect(secondLayerAsync).toHaveBeenCalledTimes(1);
});

test("Middleware_WhenAddingMixedSyncAsyncMiddleWare_ShouldExecuteThemInOrder", async () => {
  const { bot, socket } = toolkit();
  const orderExecution: Array<"first" | "second" | "third" | "fourth"> = [];
  const firstLayerSync = fn<WhatsbotcordMiddlewareFunct>((_, __, ___, ____, _____, ______, next) => {
    console.log("[1/4]: Running middleware layer successfully, SYNC");
    orderExecution.push("first");
    next();
  });
  const secondLayerAsync = fn<WhatsbotcordMiddlewareFunct>(async (_, __, ___, ____, _____, ______, next) => {
    console.log("[2/4]: Running middleware layer successfully, ASYNC");
    orderExecution.push("second");
    await next();
  });
  const thirdLayerSync = fn<WhatsbotcordMiddlewareFunct>((_, __, ___, ____, _____, ______, next) => {
    console.log("[3/4]: Running middleware layer successfully, SYNC");
    orderExecution.push("third");
    next();
  });
  const fourthLayerAsync = fn<WhatsbotcordMiddlewareFunct>(async (_, __, ___, ____, _____, ______, next) => {
    console.log("[4/4]: Running middleware layer successfully, ASYNC");
    orderExecution.push("fourth");
    await next();
  });
  bot.Use(firstLayerSync);
  bot.Use(secondLayerAsync);
  bot.Use(thirdLayerSync);
  bot.Use(fourthLayerAsync);
  bot.Start();
  const sub = fn((success) => {
    expect(success).toBe(true);
  });
  bot.Events.onMiddlewareEnd.Subscribe(sub);
  await socket.MockSendMsgAsync(MockGroupTxtMsg /**doesn't matter what says or type, just send something*/);
  expect(firstLayerSync).toHaveBeenCalledTimes(1);
  expect(secondLayerAsync).toHaveBeenCalledTimes(1);
  expect(thirdLayerSync).toHaveBeenCalledTimes(1);
  expect(fourthLayerAsync).toHaveBeenCalledTimes(1);
  expect(orderExecution).toEqual(["first", "second", "third", "fourth"]);
  expect(sub).toHaveBeenCalledTimes(1);
});

test("Middleware_WhenBreakingChain_ShouldNotExecuteCommandHandling", async () => {
  //1. Seting up
  const { bot, socket } = toolkit();

  //1.1 Setting Middleware
  const firstLayerSync = fn<WhatsbotcordMiddlewareFunct>((_, __, ___, ____, _____, ______, next) => {
    next();
  });
  const secondLayerAsync = fn<WhatsbotcordMiddlewareFunct>(async (_, __, ___, ____, _____, ______, next) => {
    await next();
  });
  const thirdLayerSync = fn<WhatsbotcordMiddlewareFunct>((_, __, ___, ____, _____, ______, _next) => {
    //No next()
  });
  const fourthLayerAsync = fn<WhatsbotcordMiddlewareFunct>(async (_, __, ___, ____, _____, ______, next) => {
    await next();
  });
  bot.Use(firstLayerSync);
  bot.Use(secondLayerAsync);
  bot.Use(thirdLayerSync);
  bot.Use(fourthLayerAsync);

  //1.2 Setting simple mock command
  const com = new VerySimpleCommand();
  com.run = async function () {
    throw new Error("This command shouldn't be executed!");
  };
  const comRunSpy = spyOn(com, "run");
  bot.Commands.Add(com, CommandType.Normal);

  //1.3 Setting event on ending middleware
  const sub = fn((success: boolean) => {
    expect(success).toBe(false);
  });
  bot.Events.onMiddlewareEnd.Subscribe(sub);

  //Action
  bot.Start();
  await socket.MockSendMsgAsync(MockGroupTxtMsg, { replaceTextWith: "!" + com.name.toLowerCase() });

  // Check
  expect(comRunSpy).not.toHaveBeenCalled();
  expect(sub).toHaveBeenCalledTimes(1);
});

test("Middleware_WhenNOTBreakingChain_ShouldExecuteCommandHandling", async () => {
  //1. Setting up

  //1.1 Setting middleware
  const { bot, socket } = toolkit();
  const firstLayerSync = fn<WhatsbotcordMiddlewareFunct>((_, __, ___, ____, _____, ______, next) => {
    next();
  });
  const secondLayerAsync = fn<WhatsbotcordMiddlewareFunct>(async (_, __, ___, ____, _____, ______, next) => {
    await next();
  });
  const thirdLayerSync = fn<WhatsbotcordMiddlewareFunct>((_, __, ___, ____, _____, ______, next) => {
    next();
  });
  const fourthLayerAsync = fn<WhatsbotcordMiddlewareFunct>(async (_, __, ___, ____, _____, ______, next) => {
    await next();
  });
  bot.Use(firstLayerSync);
  bot.Use(secondLayerAsync);
  bot.Use(thirdLayerSync);
  bot.Use(fourthLayerAsync);

  //1.2 Setting simple Command mock
  const com = new VerySimpleCommand();
  com.run = async function () {
    console.log("Im being executed!");
  };
  const comRunSpy = spyOn(com, "run");
  bot.Commands.Add(com, CommandType.Normal);

  //1.3 Setting on ending middleware event
  const sub = fn((success: boolean) => {
    expect(success).toBe(true);
  });
  bot.Events.onMiddlewareEnd.Subscribe(sub);

  //2. Execute
  bot.Start();
  await socket.MockSendMsgAsync(MockGroupTxtMsg, { replaceTextWith: "!" + com.name.toLowerCase() });

  //3. Assert
  expect(comRunSpy).toHaveBeenCalledTimes(1);
  expect(sub).toHaveBeenCalledTimes(1);
});

test("WhenCreatingBotWithTwoEmojisAsDefaultEmojiToSend_ShouldFail", async () => {
  expect(() => {
    new Bot({ defaultEmojiToSendReactionOnFailureCommand: "😍😒" });
  }).toThrow();

  expect(() => {
    new Bot({ defaultEmojiToSendReactionOnFailureCommand: "🦊" });
  }).not.toThrow();

  //Maybe add validation in future to be only emojis
  expect(() => {
    new Bot({ defaultEmojiToSendReactionOnFailureCommand: "A" });
  }).not.toThrow();
});

test("WhenUsingConfigSendtoChatOnError_ShouldDoIt", async (): Promise<void> => {
  const myError = { errorcode: "400", msg: "my custom error" };
  const { bot, socket } = toolkit();
  bot.Settings.sendErrorToChatOnFailureCommand_debug = true;
  bot.Settings.commandPrefix = "!";
  bot.Commands.Add(
    {
      name: "error",
      async run(ctx, _rawMsgApi, _args) {
        await ctx.SendText("Creating error rn!");
        await new Promise<void>((_, reject) => {
          reject(myError);
        });
      },
    },
    CommandType.Normal
  );
  bot.Start();

  const originalSendSafeSpy = socket._SendSafe;
  const sendSafeSpy = spyOn(socket, "_SendSafe");
  sendSafeSpy.mockImplementation(async (chat, content, options): Promise<WhatsappMessage | null> => {
    console.log(chat, content, options);
    return await originalSendSafeSpy(chat, content, options);
  });

  try {
    await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "!error" });
    throw new Error("Should throw error!");
  } catch (e) {
    expect(sendSafeSpy).toHaveBeenCalledTimes(2);
    expect(socket.SentMessagesThroughQueue).toHaveLength(2);
    expect(socket.SentMessagesThroughQueue[0]!).toMatchObject({
      chatId: MockGroupTxtMsg_CHATID,
      content: {
        mentions: undefined,
        text: "Creating error rn!",
      },
      miscOptions: undefined,
    });
    expect(socket.SentMessagesThroughQueue[1]!).toMatchObject({
      chatId: MockGroupTxtMsg_CHATID,
      content: {
        mentions: undefined,
        text: JSON.stringify(myError, null, 2),
      },
      miscOptions: {
        normalizeMessageText: false,
      },
    });
  }
});

test("WhenNotUsingConfigSendtoChatOnError_ShouldNotSendErrorToChat", async (): Promise<void> => {
  const myError = { errorcode: "400", msg: "my custom error" };
  const { bot, socket } = toolkit();
  bot.Settings.sendErrorToChatOnFailureCommand_debug = false;
  bot.Settings.commandPrefix = "!";
  bot.Commands.Add(
    {
      name: "error",
      async run(ctx, _rawMsgApi, _args) {
        await ctx.SendText("Creating error rn!");
        await new Promise<void>((_, reject) => {
          reject(myError);
        });
      },
    },
    CommandType.Normal
  );
  bot.Start();

  const originalSendSafeSpy = socket._SendSafe;
  const sendSafeSpy = spyOn(socket, "_SendSafe");
  sendSafeSpy.mockImplementation(async (chat, content, options): Promise<WhatsappMessage | null> => {
    console.log(chat, content, options);
    return await originalSendSafeSpy(chat, content, options);
  });

  try {
    await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "!error" });
    throw new Error("Should throw error!");
  } catch (e) {
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(socket.SentMessagesThroughQueue).toHaveLength(1);
    expect(socket.SentMessagesThroughQueue[0]!).toMatchObject({
      chatId: MockGroupTxtMsg_CHATID,
      content: {
        mentions: undefined,
        text: "Creating error rn!",
      },
      miscOptions: undefined,
    });
  }
});

test("WhenUsingDefaultEmojiOnCommandFailure_ShouldUseIt", async (): Promise<void> => {
  const myError = { errorcode: "400", msg: "my custom error" };
  const { bot, socket } = toolkit();
  const emoji = "🦊";
  bot.Settings.sendErrorToChatOnFailureCommand_debug = false;
  bot.Settings.defaultEmojiToSendReactionOnFailureCommand = emoji;
  bot.Settings.commandPrefix = "!";
  bot.Commands.Add(
    {
      name: "error",
      async run(ctx, _rawMsgApi, _args) {
        await ctx.SendText("Creating error rn!");
        await new Promise<void>((_, reject) => {
          reject(myError);
        });
      },
    },
    CommandType.Normal
  );
  bot.Start();

  const originalSendSafeSpy = socket._SendSafe;
  const sendSafeSpy = spyOn(socket, "_SendSafe");
  sendSafeSpy.mockImplementation(async (chat, content, options): Promise<WhatsappMessage | null> => {
    console.log(chat, content, options);
    return await originalSendSafeSpy(chat, content, options);
  });

  try {
    await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "!error" });
    throw new Error("Should throw error!");
  } catch (e) {
    expect(sendSafeSpy).toHaveBeenCalledTimes(2);
    expect(socket.SentMessagesThroughQueue).toHaveLength(2);
    expect(socket.SentMessagesThroughQueue[0]!).toMatchObject({
      chatId: MockGroupTxtMsg_CHATID,
      content: {
        mentions: undefined,
        text: "Creating error rn!",
      },
      miscOptions: undefined,
    });
    expect(socket.SentMessagesThroughQueue[1]!).toMatchObject({
      chatId: MockGroupTxtMsg_CHATID,
      content: {
        mentions: undefined,
        react: {
          text: emoji,
          key: {
            remoteJid: MockGroupTxtMsg_CHATID,
            fromMe: false,
            /** id */
            participant: MockGroupTxtMsg_SENDERID,
          },
        },
      },
      miscOptions: undefined,
    });
  }
});

test("WhenNotUsingDefaultEmojiOnCommandFailure_ShouldNotSendIt", async (): Promise<void> => {
  const myError = { errorcode: "400", msg: "my custom error" };
  const { bot, socket } = toolkit();
  bot.Settings.sendErrorToChatOnFailureCommand_debug = false;
  bot.Settings.defaultEmojiToSendReactionOnFailureCommand = undefined;
  bot.Settings.commandPrefix = "!";
  bot.Commands.Add(
    {
      name: "error",
      async run(ctx, _rawMsgApi, _args) {
        await ctx.SendText("Creating error rn!");
        await new Promise<void>((_, reject) => {
          reject(myError);
        });
      },
    },
    CommandType.Normal
  );
  bot.Start();

  const originalSendSafeSpy = socket._SendSafe;
  const sendSafeSpy = spyOn(socket, "_SendSafe");
  sendSafeSpy.mockImplementation(async (chat, content, options): Promise<WhatsappMessage | null> => {
    console.log(chat, content, options);
    return await originalSendSafeSpy(chat, content, options);
  });

  try {
    await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "!error" });
    throw new Error("Should throw error!");
  } catch (e) {
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(socket.SentMessagesThroughQueue).toHaveLength(1);
    expect(socket.SentMessagesThroughQueue[0]!).toMatchObject({
      chatId: MockGroupTxtMsg_CHATID,
      content: {
        mentions: undefined,
        text: "Creating error rn!",
      },
      miscOptions: undefined,
    });
    // # Should not send any reactions
    // expect(socket.SentMessagesThroughQueue[1]!).toMatchObject({
    //   chatId: MockGroupTxtMsg_CHATID,
    //   content: {
    //     mentions: undefined,
    //     react: {
    //       text: emoji,
    //       key: {
    //         remoteJid: MockGroupTxtMsg_CHATID,
    //         fromMe: false,
    //         /** id */
    //         participant: MockGroupTxtMsg_SENDERID,
    //       },
    //     },
    //   },
    //   miscOptions: undefined,
    // });
  }
});
// ===========================================================

test("WhenSendingOnlyCommandPrefix_ShouldIgnoreIt", async () => {
  const { bot, socket } = toolkit();

  let normalCommandCalled: boolean = false;

  const commandNormal: ICommand = {
    name: "samecommand",
    async run(_ctx, _rawMsgApi, _args) {
      normalCommandCalled = true;
    },
  };

  bot.Commands.Add(commandNormal, CommandType.Normal);
  const normalCommandRunSpy = spyOn(commandNormal, "run");

  await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "!" });

  expect(normalCommandRunSpy).toHaveBeenCalledTimes(0);
  expect(normalCommandCalled).toBe(false);
});

test("WhenSendingOnlyTagPrefix_ShouldIgnoreIt", async () => {
  const { bot, socket } = toolkit();

  let tagCommandCancelled: boolean = false;

  const commandNormal: ICommand = {
    name: "samecommand",
    async run(_ctx, _rawMsgApi, _args) {
      tagCommandCancelled = true;
    },
  };

  bot.Commands.Add(commandNormal, CommandType.Tag);
  const tagCommandRunSpy = spyOn(commandNormal, "run");

  await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "@" });

  expect(tagCommandRunSpy).toHaveBeenCalledTimes(0);
  expect(tagCommandCancelled).toBe(false);
});

test("WhenSettingDefault_Command_ShouldUseIt", async () => {
  const { bot, socket } = toolkit();

  let normalCommandCalled: boolean = false;
  const commandNormal: ICommand = {
    name: "samecommand",
    async run(_ctx, _rawMsgApi, _args) {
      normalCommandCalled = true;
    },
  };
  bot.Commands.SetDefaultCommand(commandNormal);
  const normalCommandRunSpy = spyOn(commandNormal, "run");

  await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "!" });

  expect(normalCommandRunSpy).toHaveBeenCalledTimes(1);
  expect(normalCommandCalled).toBe(true);

  await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "@" });

  expect(normalCommandRunSpy).toHaveBeenCalledTimes(1);
  expect(normalCommandCalled).toBe(true);
});

test("WhenSettingDefault_Command_WithMuchTextTogether_ShouldUseIt", async () => {
  const { bot, socket } = toolkit();

  let normalCommandCalled: boolean = false;
  const commandNormal: ICommand = {
    name: "samecommand",
    async run(_ctx, _rawMsgApi, _args) {
      console.log(_args.args);
      expect(_args.args).toEqual(["hello", "im", "a", "user", "not", "command"]);
      normalCommandCalled = true;
    },
  };
  bot.Commands.SetDefaultCommand(commandNormal);
  const normalCommandRunSpy = spyOn(commandNormal, "run");

  await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "!hello im a user not command" });

  expect(normalCommandRunSpy).toHaveBeenCalledTimes(1);
  expect(normalCommandCalled).toBe(true);

  await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "@" });

  expect(normalCommandRunSpy).toHaveBeenCalledTimes(1);
  expect(normalCommandCalled).toBe(true);
});

test("WhenSettingDefault_Command_WithMuchTextTogetherButSeparatedFromPrefix_ShouldUseIt", async () => {
  const { bot, socket } = toolkit();

  let normalCommandCalled: boolean = false;
  const commandNormal: ICommand = {
    name: "samecommand",
    async run(_ctx, _rawMsgApi, _args) {
      console.log(_args.args);
      expect(_args.args).toEqual(["hello", "im", "a", "user", "not", "command"]);
      normalCommandCalled = true;
    },
  };
  bot.Commands.SetDefaultCommand(commandNormal);
  const normalCommandRunSpy = spyOn(commandNormal, "run");

  await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "! hello im a user not command" });

  expect(normalCommandRunSpy).toHaveBeenCalledTimes(1);
  expect(normalCommandCalled).toBe(true);

  await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "@" });

  expect(normalCommandRunSpy).toHaveBeenCalledTimes(1);
  expect(normalCommandCalled).toBe(true);
});

test("WhenSettingDefault_Tag_ShouldUseIt", async () => {
  const { bot, socket } = toolkit();

  let tagCommandCalled: boolean = false;
  const commandNormal: ICommand = {
    name: "samecommand",
    async run(_ctx, _rawMsgApi, _args) {
      tagCommandCalled = true;
    },
  };
  bot.Commands.SetDefaultTag(commandNormal);
  const normalCommandRunSpy = spyOn(commandNormal, "run");

  await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "!" });

  expect(normalCommandRunSpy).toHaveBeenCalledTimes(0);
  expect(tagCommandCalled).toBe(false);

  await socket.MockSendMsgAsync(GroupTxtMsg, { replaceTextWith: "@" });

  expect(normalCommandRunSpy).toHaveBeenCalledTimes(1);
  expect(tagCommandCalled).toBe(true);
});
