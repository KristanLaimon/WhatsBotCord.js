import { describe, expect, it, test } from "bun:test";
import type { CommandArgs } from "../core/bot/internals/CommandsSearcher.types.js";
import type { IChatContext } from "../core/bot/internals/IChatContext.js";
import type { AdditionalAPI, ICommand } from "../core/bot/internals/ICommand.js";
import type { GroupMetadataInfo } from "../core/whats_socket/internals/WhatsSocket.receiver.js";
import type { WhatsappMessage } from "../core/whats_socket/types.js";
import { MsgHelper_FullMsg_GetText } from "../helpers/Msg.helper.js";
import { MsgType, SenderType } from "../Msg.types.js";
import { WhatsappGroupIdentifier, WhatsappIndividualIdentifier, WhatsappLIDIdentifier } from "../Whatsapp.types.js";
import ChatMock from "./ChatMock.js";

//                    ------------------- ======== GENERAL Tests ========= -----------------------------
test("Nothing_ShouldNotThrowAnyError", async () => {
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      /**  Success  */
    }
  }
  const chat = new ChatMock(new Com());
  expect(async () => {
    await chat.StartChatSimulation();
  }).not.toThrow();
  expect(chat.SentFromCommand.Texts).toHaveLength(0);
});

test("Nothing_WhenThrowingErrorInsideCommand_ShouldThrowItAtChatLevel", async (): Promise<void> => {
  const customError = { error: "im a strange error inside" };
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      throw customError;
    }
  }
  const chat = new ChatMock(new Com());
  expect(async (): Promise<void> => {
    await chat.StartChatSimulation();
  }).toThrow();
});

test("WhenSendingArguments_CommandShouldReceiveThem", async (): Promise<void> => {
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      expect(_args.args).toEqual(["arg1", "arg2", "arg3"]);
    }
  }
  const chat = new ChatMock(new Com(), { args: ["arg1", "arg2", "arg3"] });
  await chat.StartChatSimulation();
});

test("WhenSendingCustomChatId_CommandShouldReceiveIt", async (): Promise<void> => {
  //Due to only providing customChatId, its considered as an individual chat!
  const customChatId: string = "myCustomChatID";
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      expect(_args.chatId).toBe(customChatId + WhatsappIndividualIdentifier);
      expect(_ctx.FixedChatId).toBe(customChatId + WhatsappIndividualIdentifier);
      expect(_args.chatId).toBe(_ctx.FixedChatId); // They must be the same, logically
    }
  }
  const chat = new ChatMock(new Com(), { chatId: customChatId });
  await chat.StartChatSimulation();
});

test("WhenProvidingCustomChatId_MustBeIndividualSender", async (): Promise<void> => {
  const customChatId: string = "myCustomChatID@g.us";
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      expect(_args.senderType).toBe(SenderType.Individual);
    }
  }
  const chat = new ChatMock(new Com(), { chatId: customChatId });
  await chat.StartChatSimulation();
});

test("WhenSendingCustomParticipantId_CommandShouldReceiveIt", async (): Promise<void> => {
  const customChatId: string = "custom_participant";
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      expect(_args.participantIdLID).toBe(customChatId + WhatsappLIDIdentifier);
      expect(_args.participantIdPN).toEndWith(WhatsappIndividualIdentifier);

      expect(_ctx.FixedParticipantLID).toBe(_args.participantIdLID);
      expect(_ctx.FixedParticipantPN).toBe(_args.participantIdPN);
    }
  }
  const chat = new ChatMock(new Com(), { participantId_LID: customChatId });
  await chat.StartChatSimulation();
});

//                      ------------------- ======== Raw API Testing ========= -----------------------------
/**
 * Using chat context seems to correct easily, but commands also are provided with a RAWAPI object to interact which comes with:
 * ✅ 1. A ReceiverObject  (To wait for msgs from whatsapp)                   (it's the same obj by ref used like in ChatContext)
 * ✅ 2. A SenderObject    (To send easily msgs to whatsapp groups or chats)  (it's the same obj by ref used like in ChatContext)
 *
 * ✅ 3. A raw access to socket (Which you cand send msgs as well and receive them but at a low control)
 *
 * Let's check if ChatMock can catch received and sent messages from:
 * ✅ 1. ChatContext (already checked previously)
 * ✅ 2. ReceiverObject (to check)
 * ✅ 3. SenderObject (to check)
 * ✅ 4. RawSocket a mock one (to check)
 */
test("WhenUsingRawApi_NoSocket_Sending_ShouldCatchMsgSent", async (): Promise<void> => {
  const myCustomChatId: string = "myChatID@g.us";
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      await _rawMsgApi.InternalSocket.Send.Text(myCustomChatId, "MyText");
      await _rawMsgApi.InternalSocket.Send.Text(myCustomChatId, "MyOtherText");
    }
  }
  const chat = new ChatMock(new Com());
  await chat.StartChatSimulation();
  expect(chat.SentFromCommand.Texts[0]!.chatId).toBe(myCustomChatId);
  expect(chat.SentFromCommand.Texts[0]!.text).toBe("MyText");
  expect(chat.SentFromCommand.Texts[1]!.chatId).toBe(myCustomChatId);
  expect(chat.SentFromCommand.Texts[1]!.text).toBe("MyOtherText");
});

test("WhenUsingRawApi_NoSocket_Receiver_Group_ShouldCatch", async (): Promise<void> => {
  const myCustomChatId: string = "customChatID" + WhatsappGroupIdentifier;
  const myCustomParticipantId: string = "participatnId" + WhatsappIndividualIdentifier;
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      //Doesn't matter if its not the same as this chatID and participantId, its mocked!
      const msgArrived: WhatsappMessage = await _rawMsgApi.InternalSocket.Receive.WaitUntilNextRawMsgFromUserIDInGroup(
        myCustomParticipantId,
        null,
        myCustomChatId,
        MsgType.Text,
        {
          cancelKeywords: ["cancel"],
          ignoreSelfMessages: true,
          timeoutSeconds: 1,
          cancelFeedbackMsg: "feedback",
          wrongTypeFeedbackMsg: "wrong type!",
        }
      );
      const msg = MsgHelper_FullMsg_GetText(msgArrived);
      if (!msg) throw new Error("Should not be null");
      expect(msg).toBe("MyText");
    }
  }
  const chat = new ChatMock(new Com());
  chat.EnqueueIncoming_Text("MyText");
  await chat.StartChatSimulation();
  expect(chat.SentFromCommand.Texts).toHaveLength(0);
  expect(chat.WaitedFromCommand).toHaveLength(1);
  expect(chat.WaitedFromCommand.at(0)!.chatId).toBe(myCustomChatId);
});

test("WhenUsingRawApi_NoSocket_Receiver_PrivateConversation_ShouldCatch", async (): Promise<void> => {
  const myCustomChatId: string = "customChatID" + WhatsappGroupIdentifier;
  // const myCustomParticipantId: string = "participatnId" + WhatsappIndividualIdentifier;
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      //Doesn't matter if its not the same as this chatID and participantId, its mocked!
      const msgArrived: WhatsappMessage = await _rawMsgApi.InternalSocket.Receive.WaitUntilNextRawMsgFromUserIdInPrivateConversation(
        myCustomChatId,
        MsgType.Text,
        {
          cancelKeywords: ["cancel"],
          ignoreSelfMessages: true,
          timeoutSeconds: 1,
          cancelFeedbackMsg: "feedback",
          wrongTypeFeedbackMsg: "wrong type!",
        }
      );
      const msg = MsgHelper_FullMsg_GetText(msgArrived);
      if (!msg) throw new Error("Should not be null");
      expect(msg).toBe("MyText");
    }
  }
  const chat = new ChatMock(new Com());
  chat.EnqueueIncoming_Text("MyText");
  await chat.StartChatSimulation();
  expect(chat.SentFromCommand.Texts).toHaveLength(0);
  expect(chat.WaitedFromCommand).toHaveLength(1);
  expect(chat.WaitedFromCommand.at(0)!.chatId).toBe(myCustomChatId);
  expect(chat.WaitedFromCommand.at(0)?.partipantId_LID).toBeNull();
});

test("WhenWaitingShouldBeTheSameChatIdAndParticipantId_UsingChatContext", async (): Promise<void> => {
  //Should not be thighted coupled to use a customChatID + WhatsappGroupIdentifier, can be anything, but won't be recognized, fallbacks to individual chat (due to lack of whatsapp caracteristing terminal strings like @whatsapp.es or @g.us)
  const myCustomChatId: string = "customChatID";
  const myCustomParticipantId: string = "participatnId";
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      //Doesn't matter if its not the same as this chatID and participantId, its mocked!
      const msg = _ctx.WaitText({ timeoutSeconds: 23 });
      if (!msg) throw new Error("Should not be null");
      // expect(msg).toBe("MyText");
    }
  }
  const chat = new ChatMock(new Com(), { chatId: myCustomChatId, participantId_LID: myCustomParticipantId });
  chat.EnqueueIncoming_Text("MyText");
  await chat.StartChatSimulation();
  expect(chat.SentFromCommand.Texts).toHaveLength(0);
  expect(chat.WaitedFromCommand).toHaveLength(1);
  expect(chat.WaitedFromCommand.at(0)!.chatId).toBe(myCustomChatId + WhatsappIndividualIdentifier);
  expect(chat.WaitedFromCommand.at(0)!.partipantId_LID).toBe(myCustomParticipantId + WhatsappLIDIdentifier);
  expect(chat.WaitedFromCommand.at(0)!.options).toMatchObject({ timeoutSeconds: 23 });
});

test("WhenUsingLowLevelSocket_SafSend_ShouldCatchAllSendingSeparately", async (): Promise<void> => {
  const chatIdToSend: string = "myChatId";
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      await _rawMsgApi.InternalSocket._SendSafe(chatIdToSend, { text: "mytxtfromsocket" });
    }
  }
  //By default individual chat
  const chat = new ChatMock(new Com());
  await chat.StartChatSimulation();
  expect(chat.SentFromCommandSocketQueue).toHaveLength(1);
  expect(chat.SentFromCommandSocketQueue[0]!).toMatchObject({
    chatId: chatIdToSend + WhatsappGroupIdentifier,
    content: {
      text: "mytxtfromsocket",
    },
    miscOptions: undefined,
  });
  expect(chat.SentFromCommandSocketWithoutQueue).toHaveLength(0);
});

test("WhenUsingLowLevelSocket_RawUnsafeSend_ShouldCatchAllSendingSeparately", async (): Promise<void> => {
  const chatIdToSend: string = "myChatId";
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      await _rawMsgApi.InternalSocket._SendRaw(chatIdToSend, { text: "mytxtfromsocket" });
    }
  }
  //By default individual chat
  const chat = new ChatMock(new Com());
  await chat.StartChatSimulation();
  expect(chat.SentFromCommandSocketWithoutQueue).toHaveLength(1);
  expect(chat.SentFromCommandSocketWithoutQueue[0]!).toMatchObject({
    chatId: chatIdToSend + WhatsappGroupIdentifier,
    content: {
      text: "mytxtfromsocket",
    },
    miscOptions: undefined,
  });
  expect(chat.SentFromCommandSocketQueue).toHaveLength(0);
});

//                      ------------------- ======== SenderType Testing ========= -----------------------------
test("WhenNoProvidingCustomParticipantIdOrGroupChatId_ByDefaultShouldBeTreatedAsIndividualChat", async () => {
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      expect(_args.senderType).toBe(SenderType.Individual);
      expect(_ctx.FixedSenderType).toBe(SenderType.Individual);
    }
  }
  const chat = new ChatMock(new Com());
  await chat.StartChatSimulation();
});

test("WhenProvidingParticipantId_MustBeGroup", async (): Promise<void> => {
  const customParticipantID: string = "participant@whatsapp.es";
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      expect(_args.senderType).toBe(SenderType.Group);
      expect(_ctx.FixedSenderType).toBe(SenderType.Group);
    }
  }
  const chat = new ChatMock(new Com(), { participantId_LID: customParticipantID });
  await chat.StartChatSimulation();
});

test("WhenProvidingCustomSenderType_OverridesDefaultDetectionFromChatIdAndParticipantId_IndividualCase", async () => {
  const customParticipantID: string = "participant@whatsapp.es";
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      expect(_args.senderType).toBe(SenderType.Individual);
      expect(_ctx.FixedSenderType).toBe(SenderType.Individual);
    }
  }
  //Normally this would be a chat of type SenderType.Group due to customParticipantId
  //but customSenderType is provided and set to individual, so it'll be individual
  const chat = new ChatMock(new Com(), { participantId_LID: customParticipantID, senderType: SenderType.Individual });
  await chat.StartChatSimulation();
});

test("WhenProvidingCustomSenderType_OverridesDefaultDetectionFromChatIdAndParticipantId_GroupCase", async () => {
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      expect(_args.senderType).toBe(SenderType.Group);
      expect(_ctx.FixedSenderType).toBe(SenderType.Group);
    }
  }
  //Normally this would be a chat of type SenderType.Group due to customParticipantId
  //but customSenderType is provided and set to individual, so it'll be individual
  const chat = new ChatMock(new Com(), { senderType: SenderType.Group });
  await chat.StartChatSimulation();
});

//        ----------------------- ================== Cancel words testing ================== -------------------------
test("WhenUsingCancelWords_ShouldThrowError", async (): Promise<void> => {
  // ================ With "twitter omg" ===================
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      await _ctx.WaitText();
    }
  }
  const chat = new ChatMock(new Com(), { cancelKeywords: ["twitter"] });
  chat.EnqueueIncoming_Text("twitter omg");
  expect(async () => {
    await chat.StartChatSimulation();
  }).toThrow();

  //================ With "twitter" only ===================
  class Com2 implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      await _ctx.WaitText();
    }
  }
  const chat2 = new ChatMock(new Com2(), { cancelKeywords: ["twitter"] });
  chat2.EnqueueIncoming_Text("twitter");
  expect(async () => {
    await chat2.StartChatSimulation();
  }).toThrow();
});

//        ----------------------- ================== GroupChatMocking testing ================== -------------------------\
test("GroupChatMetadata_WhenComingFromIndividualChat_ShouldBeNullFromContextObject", async (): Promise<void> => {
  //By default is individual chat. Remember?
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      const groupInfo: GroupMetadataInfo | null = await _ctx.FetchGroupData();
      expect(groupInfo).toBeNull();
    }
  }
  const chat = new ChatMock(new Com());
  await chat.StartChatSimulation();
});

test("GroupChatMetadata_WhenComingFromGroupChat_ShouldFetchObjectGroupDataFromContextObject", async (): Promise<void> => {
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      const groupInfo: GroupMetadataInfo | null = await _ctx.FetchGroupData();
      expect(groupInfo).not.toBeNull();
    }
  }
  const chat = new ChatMock(new Com(), { senderType: SenderType.Group });
  await chat.StartChatSimulation();
});

test("GroupChatMetadata_WhenComingFromGroupChat_ShouldFetchObjectGroupDataFromContextObjectAndBeTheSameAsInternalReceiver", async (): Promise<void> => {
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      const groupInfo: GroupMetadataInfo | null = await _ctx.FetchGroupData();
      expect(groupInfo).not.toBeNull();
      //it really doesn't matter the chatId, it gets a default mock group metadata object
      const groupInfoFromInternalReceiver: GroupMetadataInfo | null = await _rawMsgApi.InternalSocket.Receive.FetchGroupData(_args.chatId);
      expect(groupInfoFromInternalReceiver).not.toBeNull();

      if (!groupInfo || !groupInfoFromInternalReceiver)
        throw Error("They should not be null, and actually be the same, they come from same receiver under the hood");
      expect(groupInfo).toMatchObject(groupInfoFromInternalReceiver);
    }
  }
  const chat = new ChatMock(new Com(), { senderType: SenderType.Group });
  await chat.StartChatSimulation();
});

test("GroupChatMetadata_DoesntMatterSenderType_WhenFetchingFromInternalSocket_ShouldFetch", async (): Promise<void> => {
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      const groupInfoFromReceiveDirectly = await _rawMsgApi.InternalSocket.GetRawGroupMetadata("anything");
      if (!groupInfoFromReceiveDirectly) {
        throw new Error("Group mocking from receiver should be always available on tests, why null?");
      }
      expect(groupInfoFromReceiveDirectly.id).toBe("mygroupid" + WhatsappGroupIdentifier);
    }
  }
  const chat = new ChatMock(new Com());
  chat.SetGroupMetadataMock({ id: "mygroupid" });
  await chat.StartChatSimulation();
});

test("GroupChatMetadata_CHATCONTEXT_SOCKETRECEIVER_AND_RECEIVER_ShouldBeSynchronizedWithSameMockGroupMock_WithoutSettingCustomMock", async (): Promise<void> => {
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      const groupMetadata_chatcontext = await _ctx.FetchGroupData();
      const groupMetadata_highLevelReceiver = await _rawMsgApi.InternalSocket.Receive.FetchGroupData(_args.chatId);
      const groupMetadata_lowLevelSocket = await _rawMsgApi.InternalSocket.GetRawGroupMetadata(_args.chatId);

      expect(groupMetadata_chatcontext).not.toBeNull();
      expect(groupMetadata_chatcontext).toBeDefined();

      expect(groupMetadata_highLevelReceiver).not.toBeNull();
      expect(groupMetadata_highLevelReceiver).toBeDefined();

      expect(groupMetadata_lowLevelSocket).toBeDefined();

      if (!groupMetadata_chatcontext || !groupMetadata_highLevelReceiver || !groupMetadata_lowLevelSocket) {
        throw new Error("All of them should be defined!");
      }

      //All 3 ids must be the same!
      if (!(groupMetadata_chatcontext.id === groupMetadata_highLevelReceiver.id && groupMetadata_highLevelReceiver.id === groupMetadata_lowLevelSocket.id)) {
        throw new Error("All data must have same chat Id!");
      }

      console.log(groupMetadata_chatcontext);
      console.log(groupMetadata_highLevelReceiver);
      console.log(groupMetadata_lowLevelSocket);
    }
  }
  const chat = new ChatMock(new Com(), { senderType: SenderType.Group });
  await chat.StartChatSimulation();
});

test("GroupChatMetadata_CHATCONTEXT_SOCKETRECEIVER_AND_RECEIVER_ShouldBeSynchronizedWithSameMockGroupMock!", async (): Promise<void> => {
  const groupMock: Partial<GroupMetadataInfo> = {
    id: "mygroupid",
    members: [{ isAdmin: true, asMentionFormatted: "@xd" }],
  };
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      const groupMetadata_chatcontext = await _ctx.FetchGroupData();
      const groupMetadata_highLevelReceiver = await _rawMsgApi.InternalSocket.Receive.FetchGroupData(_args.chatId);
      const groupMetadata_lowLevelSocket = await _rawMsgApi.InternalSocket.GetRawGroupMetadata(_args.chatId);

      expect(groupMetadata_chatcontext).not.toBeNull();
      expect(groupMetadata_chatcontext).toBeDefined();

      expect(groupMetadata_highLevelReceiver).not.toBeNull();
      expect(groupMetadata_highLevelReceiver).toBeDefined();

      expect(groupMetadata_lowLevelSocket).toBeDefined();

      if (!groupMetadata_chatcontext || !groupMetadata_highLevelReceiver || !groupMetadata_lowLevelSocket) {
        throw new Error("All of them should be defined!");
      }

      console.log(groupMetadata_chatcontext);
      console.log(groupMetadata_highLevelReceiver);
      console.log(groupMetadata_lowLevelSocket);

      //All 3 ids must be the same!
      if (!(groupMetadata_chatcontext.id === groupMetadata_highLevelReceiver.id && groupMetadata_highLevelReceiver.id === groupMetadata_lowLevelSocket.id)) {
        throw new Error("All data must have same chat Id!");
      }
    }
  }
  const chat = new ChatMock(new Com(), { senderType: SenderType.Group });
  chat.SetGroupMetadataMock(groupMock);
  await chat.StartChatSimulation();
});
// ====== ctx.WaitMultimedia ==========
it("ShouldGetDefaultBufferWhenExpectingMsgIfnotBufferMockConfigured_ChatContext", async () => {
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      const myBufferAudio: Buffer<ArrayBufferLike> | null = await ctx.WaitMultimedia(MsgType.Audio);
      const myBufferImg: Buffer<ArrayBufferLike> | null = await ctx.WaitMultimedia(MsgType.Image);
      const myBufferVideo: Buffer<ArrayBufferLike> | null = await ctx.WaitMultimedia(MsgType.Video);
      const myBufferDocument: Buffer<ArrayBufferLike> | null = await ctx.WaitMultimedia(MsgType.Document);
      const myBufferSticker: Buffer<ArrayBufferLike> | null = await ctx.WaitMultimedia(MsgType.Sticker);

      expect(myBufferAudio).toBeDefined();
      expect(myBufferImg).toBeDefined();
      expect(myBufferVideo).toBeDefined();
      expect(myBufferDocument).toBeDefined();
      expect(myBufferSticker).toBeDefined();

      expect(myBufferAudio).toBeInstanceOf(Buffer);
      expect(myBufferImg).toBeInstanceOf(Buffer);
      expect(myBufferVideo).toBeInstanceOf(Buffer);
      expect(myBufferDocument).toBeInstanceOf(Buffer);
      expect(myBufferSticker).toBeInstanceOf(Buffer);

      const mockDefaultContent: string = "mock_buffer";
      const mockDefaultBufferAsText = myBufferAudio!.toString();
      expect(mockDefaultBufferAsText).toBe(mockDefaultContent);

      expect(myBufferAudio!.toString()).toBe(mockDefaultContent);
      expect(myBufferImg!.toString()).toBe(mockDefaultContent);
      expect(myBufferVideo!.toString()).toBe(mockDefaultContent);
      expect(myBufferDocument!.toString()).toBe(mockDefaultContent);
      expect(myBufferSticker!.toString()).toBe(mockDefaultContent);
    }
  }
  const chat = new ChatMock(new Com());
  chat.EnqueueIncoming_Audio("./my-url-audio.mp3", { buffeToReturnOn_WaitMultimedia: undefined /** use default */ });
  chat.EnqueueIncoming_Img("./my-img-file.jpg", { buffeToReturnOn_WaitMultimedia: undefined /** use default */ });
  chat.EnqueueIncoming_Video("./my-video-file.mp4", { buffeToReturnOn_WaitMultimedia: undefined });
  chat.EnqueueIncoming_Document("./my-document-file.pdf", "my-file-name.pdf", { buffeToReturnOn_WaitMultimedia: undefined /** use default */ });
  chat.EnqueueIncoming_Sticker("./my-sticker-file.webp", { buffeToReturnOn_WaitMultimedia: undefined /** use default */ });
  await chat.StartChatSimulation();
});

it("ShouldGetDefaultBufferWhenExpectingMsgButBufferMockIsConfigured_ChatContext", async () => {
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
      const myBufferAudio: Buffer<ArrayBufferLike> | null = await ctx.WaitMultimedia(MsgType.Audio);
      const myBufferImg: Buffer<ArrayBufferLike> | null = await ctx.WaitMultimedia(MsgType.Image);
      const myBufferVideo: Buffer<ArrayBufferLike> | null = await ctx.WaitMultimedia(MsgType.Video);
      const myBufferDocument: Buffer<ArrayBufferLike> | null = await ctx.WaitMultimedia(MsgType.Document);
      const myBufferSticker: Buffer<ArrayBufferLike> | null = await ctx.WaitMultimedia(MsgType.Sticker);

      expect(myBufferAudio).toBeDefined();
      expect(myBufferImg).toBeDefined();
      expect(myBufferVideo).toBeDefined();
      expect(myBufferDocument).toBeDefined();
      expect(myBufferSticker).toBeDefined();

      expect(myBufferAudio).toBeInstanceOf(Buffer);
      expect(myBufferImg).toBeInstanceOf(Buffer);
      expect(myBufferVideo).toBeInstanceOf(Buffer);
      expect(myBufferDocument).toBeInstanceOf(Buffer);
      expect(myBufferSticker).toBeInstanceOf(Buffer);

      expect(myBufferAudio!.toString()).toBe("audio");
      expect(myBufferImg!.toString()).toBe("img");
      expect(myBufferVideo!.toString()).toBe("video");
      expect(myBufferDocument!.toString()).toBe("document");
      expect(myBufferSticker!.toString()).toBe("sticker");
    }
  }
  const chat = new ChatMock(new Com());
  chat.EnqueueIncoming_Audio("./my-url-audio.mp3", { buffeToReturnOn_WaitMultimedia: Buffer.from("audio") });
  chat.EnqueueIncoming_Img("./my-img-file.jpg", { buffeToReturnOn_WaitMultimedia: Buffer.from("img") });
  chat.EnqueueIncoming_Video("./my-video-file.mp4", { buffeToReturnOn_WaitMultimedia: Buffer.from("video") });
  chat.EnqueueIncoming_Document("./my-document-file.pdf", "my-file-name.pdf", { buffeToReturnOn_WaitMultimedia: Buffer.from("document") });
  chat.EnqueueIncoming_Sticker("./my-sticker-file.webp", { buffeToReturnOn_WaitMultimedia: Buffer.from("sticker") });
  await chat.StartChatSimulation();
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
      async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
        await _ctx.SendText("Hello User");
        await _ctx.SendText("Hello User2");
        await _ctx.SendText("Hello User3", { normalizeMessageText: true });
      }
    }
    const chat = new ChatMock(new Com());
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
      async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
        await _ctx.SendText("Hello User");
        await _ctx.SendText("What's your name?");
        const userName: string | null = await _ctx.WaitText();
        expect(userName).toBe("chris");
        await _ctx.SendText("Hello " + userName);
      }
    }
    const chat = new ChatMock(new Com());
    chat.EnqueueIncoming_Text("chris");
    await chat.StartChatSimulation();

    expect(chat.SentFromCommand.Texts).toHaveLength(3);
    expect(chat.SentFromCommand.Texts[2]!.text).toBe("Hello chris");
  });

  it("IfNotSentAnyMessagesButWaitingThem_ShouldThrowError", async (): Promise<void> => {
    class Com implements ICommand {
      name: string = "mynamecommand";
      async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
        await _ctx.SendText("Hello User");
        await _ctx.SendText("What's your name?");
        const userName: string | null = await _ctx.WaitText();
        expect(userName).toBe("chris");
        await _ctx.SendText("Hello " + userName);
      }
    }
    const chat = new ChatMock(new Com());
    // chat.SendText("chris"); //Without send this, what will happen? (throw error)
    expect(async (): Promise<void> => {
      await chat.StartChatSimulation();
    }).toThrow();

    expect(chat.SentFromCommand.Texts).toHaveLength(2); //Not 3,due to, it throws after second SendText on WaitText!
    expect(chat.SentFromCommand.Texts[0]!.text).toBe("Hello User");
    expect(chat.SentFromCommand.Texts[1]!.text).toBe("What's your name?");
  });

  it("WhenWaitingWithParams_ShouldRetrieveThoseParamsAsWell", async (): Promise<void> => {
    class Com implements ICommand {
      name: string = "mynamecommand";
      async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
        await _ctx.SendText("Hello User");
        await _ctx.SendText("What's your name?");
        const userName: string | null = await _ctx.WaitText({ cancelKeywords: ["hello", "world"] });
        expect(userName).toBe("chris");
        await _ctx.SendText("Hello " + userName);
      }
    }
    const chat = new ChatMock(new Com());
    chat.EnqueueIncoming_Text("chris"); //Without send this, what will happen? (throw error)
    await chat.StartChatSimulation();
    expect(chat.WaitedFromCommand).toHaveLength(1);
    expect(chat.WaitedFromCommand[0]!.options).toMatchObject({
      cancelKeywords: ["hello", "world"],
    });
  });

  it("ShouldSendNormallyUsingInternalSocket", async (): Promise<void> => {
    class Com implements ICommand {
      name: string = "mynamecommand";
      async run(ctx: IChatContext, rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
        await ctx.SendText("HelloWorld");
        await rawMsgApi.InternalSocket.Send.Text("differentGroupId", "mytext");
      }
    }
    const chat = new ChatMock(new Com());
    await chat.StartChatSimulation();
    expect(chat.SentFromCommand.Texts).toHaveLength(2);
    expect(chat.SentFromCommand.Texts[0]!).toMatchObject({
      chatId: chat.ChatId,
      text: "HelloWorld",
      options: undefined,
    });
    expect(chat.SentFromCommand.Texts[1]!).toMatchObject({
      chatId: "differentGroupId" + WhatsappGroupIdentifier,
      text: "mytext",
      options: undefined,
    });
  });

  //The thanos test! for texts
  it("ShouldWaitNormallyUsingInternalSocket", async (): Promise<void> => {
    class Com implements ICommand {
      name: string = "mynamecommand";
      async run(ctx: IChatContext, rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
        //Fun fact, they all use same receiver object, InternalSocket doesn't have native methods for waiting....
        const textAwaited_chatcontext = await ctx.WaitText({ timeoutSeconds: 1 });
        const textAwaited_chatContextRaw = await ctx.WaitMsg(MsgType.Text, { timeoutSeconds: 2 });
        const textAwaited = await rawMsgApi.InternalSocket.Receive.WaitUntilNextRawMsgFromUserIdInPrivateConversation(_args.chatId, MsgType.Text, {
          cancelKeywords: [],
          ignoreSelfMessages: true,
          timeoutSeconds: 3,
          cancelFeedbackMsg: "cancelfeedback",
          wrongTypeFeedbackMsg: "wronttypefeedback",
        });

        expect(textAwaited_chatcontext).toBeDefined();
        expect(textAwaited_chatContextRaw).toBeDefined();
        expect(textAwaited).toBeDefined();

        expect(textAwaited_chatcontext).toBe("1");
        expect(MsgHelper_FullMsg_GetText(textAwaited_chatContextRaw!)).toBe("2");
        expect(MsgHelper_FullMsg_GetText(textAwaited!)).toBe("3");
      }
    }
    const chat = new ChatMock(new Com());
    chat.EnqueueIncoming_Text("1");
    chat.EnqueueIncoming_Text("2");
    chat.EnqueueIncoming_Text("3");
    await chat.StartChatSimulation();
    expect(chat.WaitedFromCommand).toHaveLength(3);
    expect(chat.WaitedFromCommand[0]!).toMatchObject({
      /** and all other default config */
      chatId: chat.ChatId,
      options: { timeoutSeconds: 1 },
    });
    expect(chat.WaitedFromCommand[1]!).toMatchObject({
      chatId: chat.ChatId,
      options: { timeoutSeconds: 2 },
    });
    expect(chat.WaitedFromCommand[2]!).toMatchObject({
      chatId: chat.ChatId,
      options: { timeoutSeconds: 3 },
    });
  });
});

//                      ------------------- ======== IMAGES ========= -----------------------------
describe("Images", () => {
  // Sending section
  it("ShouldSendImgs_Simple_ImgPathOnly", async (): Promise<void> => {
    const imgPath: string = "./my/img/path/correct.png";
    class Com implements ICommand {
      name: string = "mynamecommand";
      async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
        //broadcast true, is just anything to test all options are cached in simulation
        await _ctx.SendImg(imgPath, { broadcast: true });
      }
    }
    const chat = new ChatMock(new Com());
    await chat.StartChatSimulation();
    expect(chat.SentFromCommand.Images).toHaveLength(1);
    expect(chat.SentFromCommand.Images[0]!).toMatchObject({
      chatId: chat.ChatId,
      imageOptions: {
        caption: undefined,
        source: imgPath,
      },
      options: {
        broadcast: true,
      },
    });
  });

  it("ShouldSendImgs_Simple_ImgPathWithCaption", async (): Promise<void> => {
    const imgPath: string = "./my/img/path/correct.png";
    const imgPathCaption: string = "my img path str with caption";
    class Com implements ICommand {
      name: string = "mynamecommand";
      async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
        //broadcast true, is just anything to test all options are cached in simulation
        await _ctx.SendImgWithCaption(imgPath, imgPathCaption, { broadcast: false });
      }
    }
    const chat = new ChatMock(new Com());
    await chat.StartChatSimulation();
    expect(chat.SentFromCommand.Images).toHaveLength(1);
    expect(chat.SentFromCommand.Images[0]!).toMatchObject({
      chatId: chat.ChatId,
      imageOptions: {
        caption: imgPathCaption,
        source: imgPath,
      },
      options: {
        broadcast: false,
      },
    });
  });

  it("ShouldSendImgs_Simple_ImgBufferOnly", async (): Promise<void> => {
    const imgBuffer: Buffer<ArrayBuffer> = Buffer.from("img_mock");
    class Com implements ICommand {
      name: string = "mynamecommand";
      async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
        //broadcast true, is just anything to test all options are cached in simulation
        await _ctx.SendImgFromBuffer(imgBuffer, ".png", { broadcast: true });
      }
    }
    const chat = new ChatMock(new Com());
    await chat.StartChatSimulation();
    expect(chat.SentFromCommand.Images).toHaveLength(1);
    console.log(chat.SentFromCommand.Images);
    expect(chat.SentFromCommand.Images[0]!).toMatchObject({
      chatId: chat.ChatId,
      imageOptions: {
        caption: undefined,
        formatExtension: ".png",
        source: expect.any(Buffer),
      },
      options: {
        broadcast: true,
      },
    });
  });

  it("ShouldSendImgs_Simple_ImgBufferWithCaption", async (): Promise<void> => {
    const imgBuffer: Buffer<ArrayBuffer> = Buffer.from("img_mock");
    const imgBufferCaption: string = "Img buffer caption";
    class Com implements ICommand {
      name: string = "mynamecommand";
      async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
        //broadcast true, is just anything to test all options are cached in simulation
        await _ctx.SendImgFromBufferWithCaption(imgBuffer, ".png", imgBufferCaption, { broadcast: true });
      }
    }
    const chat = new ChatMock(new Com());
    await chat.StartChatSimulation();
    expect(chat.SentFromCommand.Images).toHaveLength(1);
    console.log(chat.SentFromCommand.Images);
    expect(chat.SentFromCommand.Images[0]!).toMatchObject({
      chatId: chat.ChatId,
      imageOptions: {
        caption: imgBufferCaption,
        formatExtension: ".png",
        source: expect.any(Buffer),
      },
      options: {
        broadcast: true,
      },
    });
  });

  //Are the same individual tests as before, but using directly Sender from socket (its the same sender obj in ChatContext and socket),
  //so they should work the same!
  it("AllTypesOfImgSending_ButFromSocketSending", async (): Promise<void> => {
    const imgPathStr: string = "./my-img.png";

    const imgPathWithCaptionStr: string = "./my-img-with-caption.png";
    const imagePathCaption: string = "caption from img from path str!";

    const bufferImgNoCaption: Buffer = Buffer.from("image-no-caption");

    const bufferImgWithCaption: Buffer = Buffer.from("image-with-caption");
    const bufferImgCaptionStr: string = "caption for buffered img!";
    class Com implements ICommand {
      name: string = "mynamecommand";
      async run(_ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
        //broadcast true, is just anything to test all options are cached in simulation
        const img1Msg = await _rawMsgApi.InternalSocket.Send.Image(_args.chatId, { source: imgPathStr, formatExtension: ".png" }, { broadcast: true });
        const img2Msg = await _rawMsgApi.InternalSocket.Send.Image(_args.chatId, {
          source: imgPathWithCaptionStr,
          caption: imagePathCaption,
          formatExtension: ".png",
        });
        const img3Msg = await _rawMsgApi.InternalSocket.Send.Image(_args.chatId, { source: bufferImgNoCaption, formatExtension: ".png" });
        const img4Msg = await _rawMsgApi.InternalSocket.Send.Image(_args.chatId, {
          source: bufferImgWithCaption,
          caption: bufferImgCaptionStr,
          formatExtension: ".png",
        });

        expect(img1Msg).toBeDefined();
        expect(img2Msg).toBeDefined();
        expect(img3Msg).toBeDefined();
        expect(img4Msg).toBeDefined();
      }
    }
    const chat = new ChatMock(new Com());
    await chat.StartChatSimulation();

    expect(chat.SentFromCommand.Images).toHaveLength(4);
    // 1. Image from path, no caption, broadcast
    expect(chat.SentFromCommand.Images[0]).toMatchObject({
      chatId: chat.ChatId,
      imageOptions: {
        source: imgPathStr,
        formatExtension: ".png",
      },
      options: {
        broadcast: true,
      },
    });

    // 2. Image from path, with caption
    expect(chat.SentFromCommand.Images[1]).toMatchObject({
      chatId: chat.ChatId,
      imageOptions: {
        source: imgPathWithCaptionStr,
        caption: imagePathCaption,
        formatExtension: ".png",
      },
    });

    // 3. Image from buffer, no caption
    expect(chat.SentFromCommand.Images[2]).toMatchObject({
      chatId: chat.ChatId,
      imageOptions: {
        source: bufferImgNoCaption,
        formatExtension: ".png",
      },
    });

    // 4. Image from buffer, with caption
    expect(chat.SentFromCommand.Images[3]).toMatchObject({
      chatId: chat.ChatId,
      imageOptions: {
        source: bufferImgWithCaption,
        caption: bufferImgCaptionStr,
        formatExtension: ".png",
      },
    });
  });

  //==== Waiting section =====
  it("WhenWaitingImgs_WithoutMockBuffer_Simple_ShouldWork_WaitMultimedia", async (): Promise<void> => {
    class Com implements ICommand {
      name: string = "mynamecommand";
      async run(ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
        const myImg = await ctx.WaitMultimedia(MsgType.Image, { timeoutSeconds: 1 });
        expect(myImg).toBeDefined();
        expect(myImg).toBeInstanceOf(Buffer);
        expect(myImg?.toString()).toBe("mock_buffer"); //Default one if not provided
      }
    }
    const chat = new ChatMock(new Com());
    chat.EnqueueIncoming_Img("./img-path-name.png");
    await chat.StartChatSimulation();
    expect(chat.WaitedFromCommand).toHaveLength(1);
  });

  it("WhenWaitingImgs_WithSpecificMockBuffer_Simple_ShouldWork_WaitMultimedia", async (): Promise<void> => {
    class Com implements ICommand {
      name: string = "mynamecommand";
      async run(ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
        const myImg = await ctx.WaitMultimedia(MsgType.Image, { timeoutSeconds: 1 });
        expect(myImg).toBeDefined();
        expect(myImg).toBeInstanceOf(Buffer);
        expect(myImg!.toString()).toBe("myimg_omg"); //Default one if not provided
      }
    }
    const chat = new ChatMock(new Com());
    chat.EnqueueIncoming_Img("./img-path-name.png", { buffeToReturnOn_WaitMultimedia: Buffer.from("myimg_omg") });
    await chat.StartChatSimulation();
    expect(chat.WaitedFromCommand).toHaveLength(1);
  });

  it("WhenWaitingImgs_UsingWaitMsgGeneric_ShouldFetchIt", async (): Promise<void> => {
    class Com implements ICommand {
      name: string = "mynamecommand";
      async run(ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
        const myImg = await ctx.WaitMsg(MsgType.Image, { timeoutSeconds: 1 });
        expect(myImg).toBeDefined();
        expect(myImg!.message?.imageMessage).toBeDefined();
        expect(myImg!.message?.imageMessage?.url).toBe("./my-msg.png");
        expect(myImg?.pushName).toBe("My pushname");
      }
    }

    const chat = new ChatMock(new Com());
    chat.EnqueueIncoming_Img("./my-msg.png", { pushName: "My pushname" });
    await chat.StartChatSimulation();
    expect(chat.SentFromCommand.Images).toHaveLength(0);
    expect(chat.WaitedFromCommand).toHaveLength(1);
  });

  it("WhenWaitingMsgs_UsingRawSocketReceiver_IndividualChat", async (): Promise<void> => {
    class Com implements ICommand {
      name: string = "mynamecommand";
      async run(_ctx: IChatContext, rawMsgApi: AdditionalAPI, args: CommandArgs): Promise<void> {
        const myImg = await rawMsgApi.InternalSocket.Receive.WaitUntilNextRawMsgFromUserIdInPrivateConversation(args.chatId, MsgType.Image, {
          cancelKeywords: ["cancel"],
          ignoreSelfMessages: true,
          timeoutSeconds: 1,
        });
        expect(myImg).toBeDefined();
        expect(myImg!.message?.imageMessage).toBeDefined();
        expect(myImg!.message?.imageMessage?.url).toBe("./my-msg.png");
        expect(myImg?.pushName).toBe("My pushname");
      }
    }

    const chat = new ChatMock(new Com());
    chat.EnqueueIncoming_Img("./my-msg.png", { pushName: "My pushname" });
    await chat.StartChatSimulation();
    expect(chat.SentFromCommand.Images).toHaveLength(0);
    expect(chat.WaitedFromCommand).toHaveLength(1);
  });

  it("WhenWaitingMsgs_UsingRawSocketReceiver_GroupChat", async (): Promise<void> => {
    class Com implements ICommand {
      name: string = "mynamecommand";
      async run(_ctx: IChatContext, rawMsgApi: AdditionalAPI, args: CommandArgs): Promise<void> {
        const myImg = await rawMsgApi.InternalSocket.Receive.WaitUntilNextRawMsgFromUserIDInGroup(args.participantIdLID!, null, args.chatId, MsgType.Image, {
          cancelKeywords: ["cancel"],
          ignoreSelfMessages: true,
          timeoutSeconds: 1,
        });
        expect(myImg).toBeDefined();
        expect(myImg!.message?.imageMessage).toBeDefined();
        expect(myImg!.message?.imageMessage?.url).toBe("./my-msg.png");
        expect(myImg?.pushName).toBe("My pushname");

        //Due to senderType: SenderType.Group config in ChatMock, by default should create this
        expect(args.chatId).toEndWith(WhatsappGroupIdentifier);
        expect(args.participantIdLID).toEndWith(WhatsappLIDIdentifier);
        expect(args.participantIdPN).toEndWith(WhatsappIndividualIdentifier);

        expect(_ctx.FixedChatId).toBe(args.chatId);
        expect(_ctx.FixedParticipantPN).toBe(args.participantIdPN);
      }
    }

    const chat = new ChatMock(new Com(), { senderType: SenderType.Group });
    chat.EnqueueIncoming_Img("./my-msg.png", { pushName: "My pushname" });
    await chat.StartChatSimulation();
    expect(chat.SentFromCommand.Images).toHaveLength(0);
    expect(chat.WaitedFromCommand).toHaveLength(1);
  });
});

//TEMPLATE
// it("", async (): Promise<void> => {
//   class Com implements ICommand {
//     name: string = "mynamecommand";
//     async run(ctx: IChatContext, rawMsgApi: AdditionalAPI, args: CommandArgs): Promise<void> {}
//   }
//   const chat = new ChatMock(new Com());
//   await chat.StartChatSimulation();
// });
