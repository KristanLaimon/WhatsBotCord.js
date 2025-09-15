import { describe, expect, it, test } from "bun:test";
import type { CommandArgs } from "../core/bot/internals/CommandsSearcher.types.js";
import type { ICommand, RawMsgAPI } from "../core/bot/internals/IBotCommand.js";
import type { IChatContext } from "../core/bot/internals/IChatContext.js";
import { SenderType } from "../Msg.types.js";
import MockingChat from "./MockChat.js";

//                    ------------------- ======== GENERAL Tests ========= -----------------------------
test("Nothing_ShouldNotThrowAnyError", async () => {
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
      /**  Success  */
    }
  }
  const chat = new MockingChat(new Com());
  expect(async () => {
    await chat.StartChatSimulation();
  }).not.toThrow();
  expect(chat.SentFromCommand.Texts).toHaveLength(0);
});

test("Nothing_WhenThrowingErrorInsideCommand_ShouldThrowItAtChatLevel", async (): Promise<void> => {
  const customError = { error: "im a strange error inside" };
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
      throw customError;
    }
  }
  const chat = new MockingChat(new Com());
  expect(async (): Promise<void> => {
    await chat.StartChatSimulation();
  }).toThrow();
});

test("WhenSendingArguments_CommandShouldReceiveThem", async (): Promise<void> => {
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
      expect(_args.args).toEqual(["arg1", "arg2", "arg3"]);
    }
  }
  const chat = new MockingChat(new Com(), { args: ["arg1", "arg2", "arg3"] });
  await chat.StartChatSimulation();
});

test("WhenSendingCustomChatId_CommandShouldReceiveIt", async (): Promise<void> => {
  const customChatId: string = "myCustomChatID@g.us";
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
      expect(_args.chatId).toBe(customChatId);
      expect(_ctx.FixedChatId).toBe(customChatId);
      expect(_args.chatId).toBe(_ctx.FixedChatId); // They must be the same, logically
    }
  }
  const chat = new MockingChat(new Com(), { customChatId: customChatId });
  await chat.StartChatSimulation();
});

test("WhenProvidingCustomChatId_MustBeIndividualSender", async (): Promise<void> => {
  const customChatId: string = "myCustomChatID@g.us";
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
      expect(_args.senderType).toBe(SenderType.Individual);
    }
  }
  const chat = new MockingChat(new Com(), { customChatId: customChatId });
  await chat.StartChatSimulation();
});

test("WhenSendingCustomParticipantId_CommandShouldReceiveIt", async (): Promise<void> => {
  const customChatId: string = "custompartiipcantid@whatsapp.es";
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
      expect(_args.participantId).toBe(customChatId);
      expect(_ctx.FixedOriginalParticipantId).toBe(customChatId);
      expect(_args.participantId).toBe(_ctx.FixedOriginalParticipantId);
    }
  }
  const chat = new MockingChat(new Com(), { customParticipantId: customChatId });
  await chat.StartChatSimulation();
});

//TODO: DO THIS
//                      ------------------- ======== Raw API Testing ========= -----------------------------
/**
 * Using chat context seems to correct easily, but commands also are provided with a RAWAPI object to interact which comes with:
 * 1. A ReceiverObject  (To wait for msgs from whatsapp)                   (it's the same obj by ref used like in ChatContext)
 * 2. A SenderObject    (To send easily msgs to whatsapp groups or chats)  (it's the same obj by ref used like in ChatContext)
 *
 * 3. A raw access to socket (Which you cand send msgs as well and receive them but at a low control)
 *
 * Let's check if ChatMock can catch received and sent messages from:
 * 1. ChatContext (already checked previously)
 * 2. ReceiverObject (to check)
 * 3. SenderObject (to check)
 * 4. RawSocket a mock one (to check)
 */
// test("WhenUsingRawApi_NoSocket_Sending_ShouldCatchMsgSent");

//                      ------------------- ======== SenderType Testing ========= -----------------------------
test("WhenNoProvidingCustomParticipantIdOrGroupChatId_ByDefaultShouldBeTreatedAsIndividualChat", async () => {
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
      expect(_args.senderType).toBe(SenderType.Individual);
      expect(_ctx.FixedSenderType).toBe(SenderType.Individual);
    }
  }
  const chat = new MockingChat(new Com());
  await chat.StartChatSimulation();
});

test("WhenProvidingParticipantId_MustBeGroup", async (): Promise<void> => {
  const customParticipantID: string = "participant@whatsapp.es";
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
      expect(_args.senderType).toBe(SenderType.Group);
      expect(_ctx.FixedSenderType).toBe(SenderType.Group);
    }
  }
  const chat = new MockingChat(new Com(), { customParticipantId: customParticipantID });
  await chat.StartChatSimulation();
});

test("WhenProvidingCustomSenderType_OverridesDefaultDetectionFromChatIdAndParticipantId_IndividualCase", async () => {
  const customParticipantID: string = "participant@whatsapp.es";
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
      expect(_args.senderType).toBe(SenderType.Individual);
      expect(_ctx.FixedSenderType).toBe(SenderType.Individual);
    }
  }
  //Normally this would be a chat of type SenderType.Group due to customParticipantId
  //but customSenderType is provided and set to individual, so it'll be individual
  const chat = new MockingChat(new Com(), { customParticipantId: customParticipantID, customSenderType: SenderType.Individual });
  await chat.StartChatSimulation();
});

test("WhenProvidingCustomSenderType_OverridesDefaultDetectionFromChatIdAndParticipantId_GroupCase", async () => {
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
      expect(_args.senderType).toBe(SenderType.Group);
      expect(_ctx.FixedSenderType).toBe(SenderType.Group);
    }
  }
  //Normally this would be a chat of type SenderType.Group due to customParticipantId
  //but customSenderType is provided and set to individual, so it'll be individual
  const chat = new MockingChat(new Com(), { customSenderType: SenderType.Group });
  await chat.StartChatSimulation();
});

//        ----------------------- ================== Cancel words testing ================== -------------------------
test("WhenUsingCancelWords_ShouldThrowError", async (): Promise<void> => {
  // ================ With "twitter omg" ===================
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
      await _ctx.WaitText();
    }
  }
  const chat = new MockingChat(new Com(), { cancelKeywords: ["twitter"] });
  chat.SendText("twitter omg");
  expect(async () => {
    await chat.StartChatSimulation();
  }).toThrow();

  //================ With "twitter" only ===================
  class Com2 implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
      await _ctx.WaitText();
    }
  }
  const chat2 = new MockingChat(new Com2(), { cancelKeywords: ["twitter"] });
  chat2.SendText("twitter");
  expect(async () => {
    await chat2.StartChatSimulation();
  }).toThrow();
});

/**
 *
 *
 *
 *
 *
 *
 *
 * Command Mocking System Tests
 * Here starts general testing for each type of sending and receving msg!
 *
 *
 *
 *
 *
 *
 *
 *
 */
//                      ------------------- ======== TEXTS ========= -----------------------------
describe("Text", () => {
  it("ShouldGetTextSentFromCommand", async () => {
    class Com implements ICommand {
      name: string = "mynamecommand";
      async run(_ctx: IChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
        await _ctx.SendText("Hello User");
        await _ctx.SendText("Hello User2");
        await _ctx.SendText("Hello User3", { normalizeMessageText: true });
      }
    }
    const chat = new MockingChat(new Com());
    await chat.StartChatSimulation();
    expect(chat.SentFromCommand.Texts).toHaveLength(3);
    expect(chat.SentFromCommand.Texts.at(0)!.text).toBe("Hello User");
    expect(chat.SentFromCommand.Texts.at(0)!.options).toBeUndefined();

    expect(chat.SentFromCommand.Texts.at(1)!.text).toBe("Hello User2");
    expect(chat.SentFromCommand.Texts.at(1)!.options).toBeUndefined();

    expect(chat.SentFromCommand.Texts.at(2)!.text).toBe("Hello User3");
    expect(chat.SentFromCommand.Texts.at(2)!.options).toMatchObject({
      normalizeMessageText: true,
    });
  });

  it("ShouldBeAbleToWaitTxtMsgs", async (): Promise<void> => {
    //This is supposed to be an Individual mock chat
    class Com implements ICommand {
      name: string = "mynamecommand";
      async run(_ctx: IChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
        await _ctx.SendText("Hello User");
        await _ctx.SendText("What's your name?");
        const userName: string | null = await _ctx.WaitText();
        expect(userName).toBe("chris");
        await _ctx.SendText("Hello " + userName);
      }
    }
    const chat = new MockingChat(new Com());
    chat.SendText("chris");
    await chat.StartChatSimulation();

    expect(chat.SentFromCommand.Texts).toHaveLength(3);
    expect(chat.SentFromCommand.Texts[2]!.text).toBe("Hello chris");
  });

  it("IfNotSentAnyMessagesButWaitingThem_ShouldThrowError", async (): Promise<void> => {
    class Com implements ICommand {
      name: string = "mynamecommand";
      async run(_ctx: IChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
        await _ctx.SendText("Hello User");
        await _ctx.SendText("What's your name?");
        const userName: string | null = await _ctx.WaitText();
        expect(userName).toBe("chris");
        await _ctx.SendText("Hello " + userName);
      }
    }
    const chat = new MockingChat(new Com());
    // chat.SendText("chris"); //Without send this, what will happen? (throw error)
    expect(async (): Promise<void> => {
      await chat.StartChatSimulation();
    }).toThrow("ChatContext is trying to wait a msg that will never arrives!... Use MockChat.Send*() to enqueue what to return!");

    expect(chat.SentFromCommand.Texts).toHaveLength(2); //Not 3,due to, it throws after second SendText on WaitText!
    expect(chat.SentFromCommand.Texts[0]!.text).toBe("Hello User");
    expect(chat.SentFromCommand.Texts[1]!.text).toBe("What's your name?");
  });

  it("WhenWaitingWithParams_ShouldRetrieveThoseParamsAsWell", async (): Promise<void> => {
    class Com implements ICommand {
      name: string = "mynamecommand";
      async run(_ctx: IChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
        await _ctx.SendText("Hello User");
        await _ctx.SendText("What's your name?");
        const userName: string | null = await _ctx.WaitText({ cancelKeywords: ["hello", "world"] });
        expect(userName).toBe("chris");
        await _ctx.SendText("Hello " + userName);
      }
    }
    const chat = new MockingChat(new Com());
    chat.SendText("chris"); //Without send this, what will happen? (throw error)
    await chat.StartChatSimulation();
    expect(chat.WaitedFromCommand.Texts).toHaveLength(1);
    expect(chat.WaitedFromCommand.Texts[0]!.options).toMatchObject({
      cancelKeywords: ["hello", "world"],
    });
  });
});

//                      ------------------- ======== IMAGES ========= -----------------------------
