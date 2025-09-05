import { expect, it, spyOn, test, type Mock } from "bun:test";
import { GroupMsg, GroupMsg_CHATID, GroupMsg_SENDERID, IndividualMsg, IndividualMsg_CHATID } from "../../../helpers/Whatsapp.helper.mocks";
import { MsgType, SenderType } from "../../../Msg.types";
import { WhatsappIndividualIdentifier } from "../../../Whatsapp.types";
import { WhatsSocketReceiverMsgError, WhatsSocket_Submodule_Receiver, type WhatsSocketReceiverError } from "../../whats_socket/internals/WhatsSocket.receiver";
import { WhatsSocket_Submodule_SugarSender, type WhatsMsgSenderSendingOptions } from "../../whats_socket/internals/WhatsSocket.sugarsenders";
import WhatsSocketMock from "../../whats_socket/mocks/WhatsSocket.mock";
import type { WhatsappMessage } from "../../whats_socket/types";
import { ChatContext, type ChatContextConfig } from "./ChatContext";

/**
 * ChatSession Testing Suite
 * * Here we only test how 'ChatSession' (Object) delegates correclty to its internal
 * * WhatsSocketsugarSender(_Submodule) object with correct params.
 *
 * All testing corresponding about how msgs are going through socket or any
 * low-level testing, it's already made on the following files:
 *
 * 1. /core/whats_socket/internals/WhatsSocket.sugarsenders.test.ts
 * 2. /core/whats_socket/WhatsSocket.mock.test.ts
 * 3. /core/wahts_socket/mocks/Whatssocket.mock.test.ts
 */

// ========= Utilities ===========
const CHATID: string = GroupMsg.key.remoteJid!;
const WHATSMSGOPTIONSPARAM: WhatsMsgSenderSendingOptions = {
  sendRawWithoutEnqueue: false,
  mentionsIds: ["testID" + WhatsappIndividualIdentifier, "testID2" + WhatsappIndividualIdentifier],
};

function GenerateLocalToolKit_ChatSession_FromGroup() {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
  const senderDependency = new WhatsSocket_Submodule_SugarSender(mockSocket);
  const receiverDependency = new WhatsSocket_Submodule_Receiver(mockSocket);
  const chatSession = new ChatContext(GroupMsg.key.participant ?? null, GroupMsg.key.remoteJid!, GroupMsg, senderDependency, receiverDependency, {
    cancelKeywords: ["cancel", "cancelar"],
    ignoreSelfMessages: true,
    timeoutSeconds: 5,
    wrongTypeFeedbackMsg: "❌",
  });
  return {
    mockSocket: mockSocket,
    sender: senderDependency,
    chat: chatSession,
    receiver: receiverDependency,
  };
}

function GenerateLocalToolKit_ChatSession_FromIndividual() {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
  const senderDependency = new WhatsSocket_Submodule_SugarSender(mockSocket);
  const receiverDependency = new WhatsSocket_Submodule_Receiver(mockSocket);
  const chatSession = new ChatContext(null, IndividualMsg.key.remoteJid!, IndividualMsg, senderDependency, receiverDependency, {
    cancelKeywords: ["cancel", "cancelar"],
    ignoreSelfMessages: true,
    timeoutSeconds: 5,
    wrongTypeFeedbackMsg: "❌",
  });
  return {
    mockSocket: mockSocket,
    sender: senderDependency,
    chat: chatSession,
    receiver: receiverDependency,
  };
}

test("WhenInstatiating_ShouldNotThrowAnyError", () => {
  expect(() => {
    GenerateLocalToolKit_ChatSession_FromGroup();
  }).not.toThrow();
});

it("Text_WhenUsingSendText_ShouldUseCorrectlySugarSender", async () => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const senderTextSpy: Mock<typeof sender.Text> = spyOn(sender, "Text");
  await chat.SendText("Hello world with options", WHATSMSGOPTIONSPARAM);

  expect(senderTextSpy).toHaveBeenCalledTimes(1);
  expect(senderTextSpy).toBeCalledWith(CHATID, "Hello world with options", WHATSMSGOPTIONSPARAM);
});

it("Image_WhenUsingSendImg_ShouldUseCorrectlySugarSender", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const senderImgSpy: Mock<typeof sender.Img> = spyOn(sender, "Img");
  senderImgSpy.mockResolvedValueOnce({} as any);
  await chat.SendImg("./test_img", WHATSMSGOPTIONSPARAM);

  expect(senderImgSpy).toHaveBeenCalledTimes(1);
  expect(senderImgSpy).toBeCalledWith(CHATID, { sourcePath: "./test_img", caption: undefined }, WHATSMSGOPTIONSPARAM);
});

it("Image_WhenUsingSendImgWithCaption_ShouldUseCorrectlySugarSender", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const senderImgSpy: Mock<typeof sender.Img> = spyOn(sender, "Img");
  senderImgSpy.mockResolvedValueOnce({} as any);
  await chat.SendImgWithCaption("./test_img", "img caption", WHATSMSGOPTIONSPARAM);

  expect(senderImgSpy).toHaveBeenCalledTimes(1);
  expect(senderImgSpy).toBeCalledWith(CHATID, { sourcePath: "./test_img", caption: "img caption" }, WHATSMSGOPTIONSPARAM);
});

it("ReactionEmoji_WhenUsingSendReactEmojiTo_ShouldUseCorrectlySugarSender", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const senderReactEmojiToSpy: Mock<typeof sender.ReactEmojiToMsg> = spyOn(sender, "ReactEmojiToMsg");
  const emojiToSendTwoCharLength = "🦊"; //Two javascript chars length
  const emojiToSendOneCharLength = "✨"; //One javascript char length
  expect(async () => {
    await chat.SendReactEmojiTo(GroupMsg, emojiToSendTwoCharLength, WHATSMSGOPTIONSPARAM);
    await chat.SendReactEmojiTo(GroupMsg, emojiToSendOneCharLength, WHATSMSGOPTIONSPARAM);
  }).not.toThrow();

  expect(senderReactEmojiToSpy).toHaveBeenCalledTimes(2);
  expect(senderReactEmojiToSpy).toBeCalledWith(CHATID, GroupMsg, emojiToSendTwoCharLength, WHATSMSGOPTIONSPARAM);
  expect(senderReactEmojiToSpy).toBeCalledWith(CHATID, GroupMsg, emojiToSendOneCharLength, WHATSMSGOPTIONSPARAM);
});

it("ReactionEmoji_WhenUsingSendReactEmojiToOriginalMsg_ShouldUseCorrectlySugarSender", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const senderReactEmojiToSpy: Mock<typeof sender.ReactEmojiToMsg> = spyOn(sender, "ReactEmojiToMsg");
  const emojiToSendTwoCharLength = "🦊"; //Two javascript chars length
  const emojiToSendOneCharLength = "✨"; //One javascript char length

  expect(async (): Promise<void> => {
    //Without needing to refer to original msg
    await chat.SendReactEmojiToInitialMsg(emojiToSendOneCharLength, WHATSMSGOPTIONSPARAM);
    await chat.SendReactEmojiToInitialMsg(emojiToSendTwoCharLength, WHATSMSGOPTIONSPARAM);
  }).not.toThrow();

  expect(senderReactEmojiToSpy).toHaveBeenCalledTimes(2);
  expect(senderReactEmojiToSpy).toBeCalledWith(CHATID, GroupMsg, emojiToSendOneCharLength, WHATSMSGOPTIONSPARAM);
  expect(senderReactEmojiToSpy).toBeCalledWith(CHATID, GroupMsg, emojiToSendTwoCharLength, WHATSMSGOPTIONSPARAM);
});

it("OK_WhenUsingOK_ShouldCorrectlyUseInternalSugarSenderReactEmojiToMsg", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendReactEmojiSpy: Mock<typeof sender.ReactEmojiToMsg> = spyOn(sender, "ReactEmojiToMsg");

  expect(async (): Promise<void> => {
    await chat.Ok(WHATSMSGOPTIONSPARAM);
  }).not.toThrow();

  expect(sendReactEmojiSpy).toHaveBeenCalledTimes(1);
  expect(sendReactEmojiSpy).toHaveBeenCalledWith(CHATID, GroupMsg, "✅", WHATSMSGOPTIONSPARAM);
});

it("OK_WhenUsingOKWithoutOptions_ShouldCorrectlyUseSugarSenderReactEmojiToMsg", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendReactEmojiSpy: Mock<typeof sender.ReactEmojiToMsg> = spyOn(sender, "ReactEmojiToMsg");

  expect(async (): Promise<void> => {
    await chat.Ok();
  }).not.toThrow();

  expect(sendReactEmojiSpy).toHaveBeenCalledTimes(1);
  expect(sendReactEmojiSpy).toHaveBeenCalledWith(CHATID, GroupMsg, "✅", undefined /** Additional param options wasn't provided */);
});

it("Fail_WhenUsingFail_ShouldCorrectlyUseInternalSugarSenderReactEmojiToMsg", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendReactEmojiSpy: Mock<typeof sender.ReactEmojiToMsg> = spyOn(sender, "ReactEmojiToMsg");

  expect(async (): Promise<void> => {
    await chat.Fail(WHATSMSGOPTIONSPARAM);
  }).not.toThrow();

  expect(sendReactEmojiSpy).toHaveBeenCalledTimes(1);
  expect(sendReactEmojiSpy).toHaveBeenCalledWith(CHATID, GroupMsg, "❌", WHATSMSGOPTIONSPARAM);
});

it("Fail_WhenUsingFailWithoutOptions_ShouldCorrectlyUseSugarSenderReactEmojiToMsg", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendReactEmojiSpy: Mock<typeof sender.ReactEmojiToMsg> = spyOn(sender, "ReactEmojiToMsg");

  expect(async (): Promise<void> => {
    await chat.Fail();
  }).not.toThrow();

  expect(sendReactEmojiSpy).toHaveBeenCalledTimes(1);
  expect(sendReactEmojiSpy).toHaveBeenCalledWith(CHATID, GroupMsg, "❌", undefined /** Additional param options wasn't provided */);
});

it("Sticker_WhenUsingSendSticker_ShouldCorrectlyUseSugarSenderSticker", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendStickerSpy: Mock<typeof sender.Sticker> = spyOn(sender, "Sticker");
  sendStickerSpy.mockReturnValueOnce({} as any);
  expect(async (): Promise<void> => {
    await chat.SendSticker("./sticker_fake.webp", WHATSMSGOPTIONSPARAM);
  }).not.toThrow();
  expect(sendStickerSpy).toHaveBeenCalledTimes(1);
  expect(sendStickerSpy).toHaveBeenCalledWith(CHATID, "./sticker_fake.webp", WHATSMSGOPTIONSPARAM);
});

it("Audio_WhenUsingSendAudio_ShouldCorrectlyUseSugarSenderAudio", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendAudioSenderSpy: Mock<typeof sender.Audio> = spyOn(sender, "Audio");
  sendAudioSenderSpy.mockResolvedValueOnce({} as any);
  expect(async (): Promise<void> => {
    await chat.SendAudio("./mockAudio.mp3", WHATSMSGOPTIONSPARAM);
  }).not.toThrow();
  expect(sendAudioSenderSpy).toHaveBeenCalledTimes(1);
  expect(sendAudioSenderSpy).toHaveBeenCalledWith(CHATID, "./mockAudio.mp3", WHATSMSGOPTIONSPARAM);
});

//TODO: Continue with => Video, Video With Caption, Poll, Ubication, Ubication With Description, Contact!
it("Video_WhenUsingSendVideoWithoutCaption_ShouldCorrectlyUseSugarSenderVideo", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendVideoSenderSpy: Mock<typeof sender.Video> = spyOn(sender, "Video");
  sendVideoSenderSpy.mockResolvedValueOnce({} as any);
  expect(async (): Promise<void> => {
    await chat.SendVideo("./fake_video.mp4", WHATSMSGOPTIONSPARAM);
  }).not.toThrow();
  expect(sendVideoSenderSpy).toHaveBeenCalledTimes(1);
  expect(sendVideoSenderSpy).toHaveBeenCalledWith(CHATID, { sourcePath: "./fake_video.mp4", caption: undefined }, WHATSMSGOPTIONSPARAM);
});

it("Video_WhenUsingSendVideoWithCaption_ShouldCorrectlyUseSugarSenderVideo", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendVideoSenderSpy: Mock<typeof sender.Video> = spyOn(sender, "Video");
  sendVideoSenderSpy.mockResolvedValueOnce({} as any);
  expect(async (): Promise<void> => {
    await chat.SendVideoWithCaption("./fake_video_with_caption.mp4", "video caption", WHATSMSGOPTIONSPARAM);
  }).not.toThrow();
  expect(sendVideoSenderSpy).toHaveBeenCalledTimes(1);
  expect(sendVideoSenderSpy).toHaveBeenCalledWith(CHATID, { sourcePath: "./fake_video_with_caption.mp4", caption: "video caption" }, WHATSMSGOPTIONSPARAM);
});

it("Poll_WhenUsingSendPoll_ShouldCorrectlyUseSugarSenderPoll", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendPollSenderSpy: Mock<typeof sender.Poll> = spyOn(sender, "Poll");
  const pollTitle: string = "Title";
  const pollOptions: string[] = ["options"];
  expect(async (): Promise<void> => {
    await chat.SendPoll(pollTitle, pollOptions, { withMultiSelect: true }, WHATSMSGOPTIONSPARAM);
  }).not.toThrow();
  expect(sendPollSenderSpy).toHaveBeenCalledTimes(1);
  expect(sendPollSenderSpy).toHaveBeenCalledWith(CHATID, pollTitle, pollOptions, { withMultiSelect: true }, WHATSMSGOPTIONSPARAM);
});

it("Ubication_WhenSendingUbicationWithoutExtraInfo_ShouldCorrectlyUseSugarenderUbication", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendUbicationSenderSpy: Mock<typeof sender.Ubication> = spyOn(sender, "Ubication");
  const latitude: number = 80;
  const longitude: number = -120;
  expect(async (): Promise<void> => {
    await chat.SendUbication(latitude, longitude, WHATSMSGOPTIONSPARAM);
  }).not.toThrow();
  expect(sendUbicationSenderSpy).toHaveBeenCalledTimes(1);
  expect(sendUbicationSenderSpy).toHaveBeenCalledWith(
    CHATID,
    { degreesLatitude: latitude, degreesLongitude: longitude, addressText: undefined, name: undefined },
    WHATSMSGOPTIONSPARAM
  );
});

it("Ubication_WhenSendingUbicationWithExtraInfo_ShouldCorrectlyUseSugaSenderUbication", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendUbicationSenderSpy: Mock<typeof sender.Ubication> = spyOn(sender, "Ubication");
  const latitude: number = 80;
  const longitude: number = -120;
  expect(async (): Promise<void> => {
    await chat.SendUbicationWithDescription(latitude, longitude, "Ubication Name", "more extra info", WHATSMSGOPTIONSPARAM);
  }).not.toThrow();
  expect(sendUbicationSenderSpy).toHaveBeenCalledTimes(1);
  expect(sendUbicationSenderSpy).toHaveBeenCalledWith(
    CHATID,
    {
      degreesLatitude: latitude,
      degreesLongitude: longitude,
      addressText: "more extra info",
      name: "Ubication Name",
    },
    WHATSMSGOPTIONSPARAM
  );
});

it("Contacts_WhenSendingContacts_ShouldCorrectlyUseSugarSendContacts", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendContactSenderSpy: Mock<typeof sender.Contact> = spyOn(sender, "Contact");
  const contactMockInfo = { name: "ChristianLaimon", phone: "521948930283" };
  expect(async (): Promise<void> => {
    await chat.SendContact(contactMockInfo, WHATSMSGOPTIONSPARAM);
  }).not.toThrow();
  expect(sendContactSenderSpy).toHaveBeenCalledTimes(1);
  expect(sendContactSenderSpy).toHaveBeenCalledWith(CHATID, contactMockInfo, WHATSMSGOPTIONSPARAM);
});

// ============ Receive Methods =============

//Basic functioning
it("WaitMsg_WhenExpectingForMsg_FROMGROUP_ShouldReceiveIt", async (): Promise<void> => {
  const { chat, mockSocket } = GenerateLocalToolKit_ChatSession_FromGroup();

  const main: Promise<WhatsappMessage | null> = chat.WaitMsg(MsgType.Text);
  const msging: Promise<void> = new Promise<void>((resolve) => {
    mockSocket.onIncomingMsg.CallAll(GroupMsg_SENDERID, GroupMsg_CHATID, GroupMsg, MsgType.Text, SenderType.Group);
    resolve();
  });

  let res: WhatsappMessage | null = null;
  expect(async (): Promise<void> => {
    res = await Promise.all([main, msging]).then(([msg, _void]) => msg);
  }).not.toThrow();

  expect(res).toBeDefined();
  expect(res).not.toBeNull();
  expect(res).toMatchObject(GroupMsg);
});

it("WaitMsg_WhenExpectingForMsg_FROMINDIVIDUAL_ShouldReceiveIt", async (): Promise<void> => {
  const { chat, mockSocket } = GenerateLocalToolKit_ChatSession_FromIndividual();

  const main: Promise<WhatsappMessage | null> = chat.WaitMsg(MsgType.Text);
  const msging: Promise<void> = new Promise<void>((resolve) => {
    mockSocket.onIncomingMsg.CallAll(null, IndividualMsg_CHATID, IndividualMsg, MsgType.Text, SenderType.Individual);
    resolve();
  });

  let res: WhatsappMessage | null = null;
  expect(async (): Promise<void> => {
    res = await Promise.all([main, msging]).then(([msg, _void]) => msg);
  }).not.toThrow();

  expect(res).toBeDefined();
  expect(res).not.toBeNull();
  expect(res!).toMatchObject(IndividualMsg);
});

//When getting bad msg type
it("WaitMsg_WhenGettingIncorrectMsgType_FROMGROUP_ShouldIgnoreItUntilGetExpected", async (): Promise<void> => {
  const { chat, mockSocket } = GenerateLocalToolKit_ChatSession_FromGroup();
  //Temp attaching prop for testing-only purposes
  const incorrectMsg: WhatsappMessage & { INCORRECT: boolean } = { ...GroupMsg, INCORRECT: true };
  const main: Promise<WhatsappMessage | null> = chat.WaitMsg(MsgType.Video);
  const msgs: Promise<void> = new Promise<void>((resolve) => {
    mockSocket.onIncomingMsg.CallAll(GroupMsg_SENDERID, GroupMsg_CHATID, incorrectMsg, MsgType.Image, SenderType.Group);
    mockSocket.onIncomingMsg.CallAll(GroupMsg_SENDERID, GroupMsg_CHATID, incorrectMsg, MsgType.Contact, SenderType.Group);
    mockSocket.onIncomingMsg.CallAll(GroupMsg_SENDERID, GroupMsg_CHATID, incorrectMsg, MsgType.Text, SenderType.Group);
    mockSocket.onIncomingMsg.CallAll(GroupMsg_SENDERID, GroupMsg_CHATID, incorrectMsg, MsgType.Contact, SenderType.Group);
    mockSocket.onIncomingMsg.CallAll(GroupMsg_SENDERID, GroupMsg_CHATID, incorrectMsg, MsgType.Sticker, SenderType.Group);
    mockSocket.onIncomingMsg.CallAll(GroupMsg_SENDERID, GroupMsg_CHATID, incorrectMsg, MsgType.Poll, SenderType.Group);

    //This should be fetched from waiting process
    mockSocket.onIncomingMsg.CallAll(GroupMsg_SENDERID, GroupMsg_CHATID, GroupMsg, MsgType.Video, SenderType.Group);
    resolve();
  });

  let res: WhatsappMessage | null = null;
  expect(async (): Promise<void> => {
    res = await Promise.all([main, msgs]).then(([msg, _void]) => msg);
  }).not.toThrow();

  expect(res).toBeDefined();
  expect(res).not.toBeNull();
  expect((res as any).INCORRECT).toBe(undefined);
  expect(res).toMatchObject(GroupMsg);
});

it("WaitMsg_WhenGettingIncorrectMsgType_FROMINDIVIDUAL_ShouldIgnoreItUntilGetExpected", async (): Promise<void> => {
  const { chat, mockSocket } = GenerateLocalToolKit_ChatSession_FromIndividual();
  //Temp attaching prop for testing-only purposes
  const incorrectMsg: WhatsappMessage & { INCORRECT: boolean } = { ...IndividualMsg, INCORRECT: true };
  const main: Promise<WhatsappMessage | null> = chat.WaitMsg(MsgType.Video);
  const msgs: Promise<void> = new Promise<void>((resolve) => {
    mockSocket.onIncomingMsg.CallAll(null, IndividualMsg_CHATID, incorrectMsg, MsgType.Image, SenderType.Group);
    mockSocket.onIncomingMsg.CallAll(null, IndividualMsg_CHATID, incorrectMsg, MsgType.Contact, SenderType.Group);
    mockSocket.onIncomingMsg.CallAll(null, IndividualMsg_CHATID, incorrectMsg, MsgType.Text, SenderType.Group);
    mockSocket.onIncomingMsg.CallAll(null, IndividualMsg_CHATID, incorrectMsg, MsgType.Contact, SenderType.Group);
    mockSocket.onIncomingMsg.CallAll(null, IndividualMsg_CHATID, incorrectMsg, MsgType.Sticker, SenderType.Group);
    mockSocket.onIncomingMsg.CallAll(null, IndividualMsg_CHATID, incorrectMsg, MsgType.Poll, SenderType.Group);

    //This should be fetched from waiting process
    mockSocket.onIncomingMsg.CallAll(null, IndividualMsg_CHATID, IndividualMsg, MsgType.Video, SenderType.Group);
    resolve();
  });

  let res: WhatsappMessage | null = null;
  expect(async (): Promise<void> => {
    res = await Promise.all([main, msgs]).then(([msg, _void]) => msg);
  }).not.toThrow();

  expect(res).toBeDefined();
  expect(res).not.toBeNull();
  expect((res as any).INCORRECT).toBeUndefined();
  expect(res).toMatchObject(IndividualMsg);
});

//When getting unknown error
it("WaitMsg_GettingUnknownErrorNotIdentifiedWhileWaiting_FROMGROUP_ShouldRejectCompletely", async (): Promise<void> => {
  const { chat, mockSocket, receiver } = GenerateLocalToolKit_ChatSession_FromGroup();
  const individualWaitingInternal: Mock<typeof receiver.WaitUntilNextRawMsgFromUserIdInPrivateConversation> = spyOn(
    receiver,
    "WaitUntilNextRawMsgFromUserIdInPrivateConversation"
  );
  const groupWaitingInternal: Mock<typeof receiver.WaitUntilNextRawMsgFromUserIDInGroup> = spyOn(receiver, "WaitUntilNextRawMsgFromUserIDInGroup");
  groupWaitingInternal.mockRejectedValueOnce("weird mock error");

  const main: Promise<WhatsappMessage | null> = chat.WaitMsg(MsgType.Text);
  const msg: Promise<void> = new Promise<void>((resolve) => {
    mockSocket.onIncomingMsg.CallAll(GroupMsg_SENDERID, GroupMsg_CHATID, GroupMsg, MsgType.Image, SenderType.Group);
    //Correct type expected!
    mockSocket.onIncomingMsg.CallAll(GroupMsg_SENDERID, GroupMsg_CHATID, GroupMsg, MsgType.Text, SenderType.Group);
    resolve();
  });
  let res: WhatsappMessage | null = null;
  expect(async (): Promise<void> => {
    //Should not catch it normally and return null, instead, it must throw error directly (not a controlled error)
    res = await Promise.all([main, msg]).then(([expectedMsg, _void]) => expectedMsg);
  }).toThrowError("weird mock error");
  expect(res).toBeNull();
  expect(individualWaitingInternal).not.toHaveBeenCalled();
});

it("WaitMsg_GettingUnknownErrorNotIdentifiedWhileWaiting_FROMINDIVIDUAL_ShouldRejectCompletely", async (): Promise<void> => {
  const { chat, mockSocket, receiver } = GenerateLocalToolKit_ChatSession_FromIndividual();

  const groupWaitingInternal: Mock<typeof receiver.WaitUntilNextRawMsgFromUserIDInGroup> = spyOn(receiver, "WaitUntilNextRawMsgFromUserIDInGroup");
  const individualWaitingInternal: Mock<typeof receiver.WaitUntilNextRawMsgFromUserIdInPrivateConversation> = spyOn(
    receiver,
    "WaitUntilNextRawMsgFromUserIdInPrivateConversation"
  );
  individualWaitingInternal.mockRejectedValueOnce("weird mock error");

  const main: Promise<WhatsappMessage | null> = chat.WaitMsg(MsgType.Text);
  const msg: Promise<void> = new Promise<void>((resolve) => {
    mockSocket.onIncomingMsg.CallAll(null, IndividualMsg_CHATID, IndividualMsg, MsgType.Image, SenderType.Individual);
    //Correct type expected!
    mockSocket.onIncomingMsg.CallAll(null, IndividualMsg_CHATID, IndividualMsg, MsgType.Text, SenderType.Individual);
    resolve();
  });
  let res: WhatsappMessage | null = null;
  expect(async (): Promise<void> => {
    //Should not catch it normally and return null, instead, it must throw error directly (not a controlled error)
    res = await Promise.all([main, msg]).then(([expectedMsg, _void]) => expectedMsg);
  }).toThrowError("weird mock error");
  expect(res).toBeNull();
  expect(groupWaitingInternal).not.toHaveBeenCalled();
});

//When getting wait error (rejected by user)
it("WaitMsg_GettingKnownWaitingError_RejectedByUser_FROMGROUP_ShouldIdentifyAndRejectImmediatelyWithError", async (): Promise<void> => {
  const { chat, receiver } = GenerateLocalToolKit_ChatSession_FromGroup();

  const internalWaitSpy = spyOn(receiver, "WaitUntilNextRawMsgFromUserIDInGroup");
  const abortedWaitError: Partial<WhatsSocketReceiverError> = {
    chatId: GroupMsg_CHATID,
    userId: GroupMsg_SENDERID,
    wasAbortedByUser: true,
  };
  internalWaitSpy.mockRejectedValueOnce(abortedWaitError);

  const main = chat.WaitMsg(MsgType.Text);
  let res: WhatsappMessage | null = null;
  try {
    res = await main;
    throw new Error("It's not throwing an error!");
  } catch (e) {
    expect(e).toMatchObject(abortedWaitError);
  }
  expect(res).toBeNull();
  expect(internalWaitSpy).toHaveBeenCalledTimes(1);
});

it("WaitMsg_GettingKnownWaitingError_RejectedByUser_FROMINDIVIDUAL_ShouldIdentifyAndRejectImmediatelyWithError", async (): Promise<void> => {
  const { chat, receiver } = GenerateLocalToolKit_ChatSession_FromIndividual();

  const internalWaitSpy = spyOn(receiver, "WaitUntilNextRawMsgFromUserIdInPrivateConversation");
  const abortedWaitError: Partial<WhatsSocketReceiverError> = {
    chatId: IndividualMsg_CHATID,
    userId: null,
    wasAbortedByUser: true,
    errorMessage: WhatsSocketReceiverMsgError.Timeout,
  };
  internalWaitSpy.mockRejectedValueOnce(abortedWaitError);

  const main = chat.WaitMsg(MsgType.Text);
  let res: WhatsappMessage | null = null;
  try {
    res = await main;
    throw new Error("It's not throwing an error!");
  } catch (e) {
    expect(e).toMatchObject(abortedWaitError);
  }
  expect(res).toBeNull();
  expect(internalWaitSpy).toHaveBeenCalledTimes(1);
});

//When getting wait error by timeout (not rejected by user)
it("WaitMsg_GettingKnownWaitingError_TimeoutExpired_FROMGROUP_ShouldIdentifyAndRejectThrowError", async (): Promise<void> => {
  const { chat, receiver } = GenerateLocalToolKit_ChatSession_FromGroup();

  const internalWaitSpy = spyOn(receiver, "WaitUntilNextRawMsgFromUserIDInGroup");
  const abortedWaitError: WhatsSocketReceiverError = {
    chatId: GroupMsg_CHATID,
    userId: GroupMsg_SENDERID,
    wasAbortedByUser: false,
    errorMessage: WhatsSocketReceiverMsgError.Timeout,
  };
  //Simulating timeout error from receiver internal submodule!
  internalWaitSpy.mockRejectedValueOnce(abortedWaitError);
  const main = chat.WaitMsg(MsgType.Text);
  let res: WhatsappMessage | null = null;
  expect(async () => {
    res = await main;
  }).not.toThrow();
  expect(res).toBeNull();
  expect(internalWaitSpy).toHaveBeenCalledTimes(1);
});

it("WaitMsg_GettingKnownWaitingError_TimeoutExpired_FROMINDIVIDUAL_ShouldIdentifyAndRejectThrowError", async (): Promise<void> => {
  const { chat, receiver } = GenerateLocalToolKit_ChatSession_FromIndividual();

  const internalWaitSpy = spyOn(receiver, "WaitUntilNextRawMsgFromUserIdInPrivateConversation");
  const abortedWaitError: WhatsSocketReceiverError = {
    chatId: IndividualMsg_CHATID,
    userId: null,
    wasAbortedByUser: false,
    errorMessage: WhatsSocketReceiverMsgError.Timeout,
  };
  //Simulating timeout error from receiver internal submodule!
  internalWaitSpy.mockRejectedValueOnce(abortedWaitError);
  const main = chat.WaitMsg(MsgType.Text);
  let res: WhatsappMessage | null = null;
  expect(async () => {
    res = await main;
  }).not.toThrow();
  expect(res).toBeNull();
  expect(internalWaitSpy).toHaveBeenCalledTimes(1);
});

//When using without local config params
it("WhatMsg_WhenNotUsingLocalConfigParams_FROMGROUP_ShouldUseChatContextConfigInstead", async (): Promise<void> => {
  //Im checking its being called with correct params, if its using (Global Config + Local Config) overlap
  const { chat, receiver } = GenerateLocalToolKit_ChatSession_FromGroup();
  const internalWaitSpy = spyOn(receiver, "WaitUntilNextRawMsgFromUserIDInGroup");
  //Doesn't matter if it returns correctly (already tested)
  internalWaitSpy.mockResolvedValue({} as any);
  const expectedType = MsgType.Text;

  // 1st local calling
  const firstChatConfig: ChatContextConfig = {
    cancelKeywords: ["mock", "cancel"],
    ignoreSelfMessages: false,
    timeoutSeconds: 100,
    cancelFeedbackMsg: "cancel feedback mock",
    wrongTypeFeedbackMsg: "wrong type feedback mock",
  };
  await chat.WaitMsg(expectedType, /** local options for this msg only */ firstChatConfig);
  expect(internalWaitSpy).toHaveBeenCalledTimes(1);
  expect(internalWaitSpy).toHaveBeenCalledWith(GroupMsg_SENDERID, GroupMsg_CHATID, expectedType, { ...chat.Config, ...firstChatConfig });

  /// 2nd local calling
  const secondLocalConfig: Partial<ChatContextConfig> = {
    timeoutSeconds: 100000,
  };
  await chat.WaitMsg(expectedType, /** local options for this msg only*/ secondLocalConfig);
  expect(internalWaitSpy).toHaveBeenCalledTimes(2);
  let paramsCalled: ChatContextConfig = internalWaitSpy.mock.lastCall![3];
  expect(paramsCalled).toBeDefined();
  //Should not be the same like last local call
  expect(paramsCalled).not.toMatchObject({ ...chat.Config, ...firstChatConfig });
  //Should be using only secondLocalConfig overwrites
  expect(paramsCalled).toMatchObject({ ...chat.Config, ...secondLocalConfig });

  // Local calling without any
  await chat.WaitMsg(expectedType /**no local config*/);
  expect(internalWaitSpy).toHaveBeenCalledTimes(3);
  paramsCalled = internalWaitSpy.mock.lastCall![3];
  expect(paramsCalled).toBeDefined();
  expect(paramsCalled).not.toMatchObject({ ...chat.Config, ...firstChatConfig });
  expect(paramsCalled).not.toMatchObject({ ...chat.Config, ...secondLocalConfig });
  expect(paramsCalled).toMatchObject(chat.Config);
});

it("WhatMsg_WhenNotUsingLocalConfigParams_FROMINDIVIDUAL_ShouldUseChatContextConfigInstead", async (): Promise<void> => {
  //Im checking its being called with correct params, if its using (Global Config + Local Config) overlap
  const { chat, receiver } = GenerateLocalToolKit_ChatSession_FromIndividual();
  const internalWaitSpy = spyOn(receiver, "WaitUntilNextRawMsgFromUserIdInPrivateConversation");
  //Doesn't matter if it returns correctly (already tested)
  internalWaitSpy.mockResolvedValue({} as any);
  const expectedType = MsgType.Text;

  // 1st local calling
  const firstChatConfig: ChatContextConfig = {
    cancelKeywords: ["mock", "cancel"],
    ignoreSelfMessages: false,
    timeoutSeconds: 100,
    cancelFeedbackMsg: "cancel feedback mock",
    wrongTypeFeedbackMsg: "wrong type feedback mock",
  };
  await chat.WaitMsg(expectedType, /** local options for this msg only */ firstChatConfig);
  expect(internalWaitSpy).toHaveBeenCalledTimes(1);
  expect(internalWaitSpy).toHaveBeenCalledWith(IndividualMsg_CHATID, expectedType, { ...chat.Config, ...firstChatConfig });

  /// 2nd local calling
  const secondLocalConfig: Partial<ChatContextConfig> = {
    timeoutSeconds: 100000,
  };
  await chat.WaitMsg(expectedType, /** local options for this msg only*/ secondLocalConfig);
  expect(internalWaitSpy).toHaveBeenCalledTimes(2);
  let paramsCalled: ChatContextConfig = internalWaitSpy.mock.lastCall![2];
  expect(paramsCalled).toBeDefined();
  //Should not be the same like last local call
  expect(paramsCalled).not.toMatchObject({ ...chat.Config, ...firstChatConfig });
  //Should be using only secondLocalConfig overwrites
  expect(paramsCalled).toMatchObject({ ...chat.Config, ...secondLocalConfig });

  // Local calling without any
  await chat.WaitMsg(expectedType /**no local config*/);
  expect(internalWaitSpy).toHaveBeenCalledTimes(3);
  paramsCalled = internalWaitSpy.mock.lastCall![2];
  expect(paramsCalled).toBeDefined();
  expect(paramsCalled).not.toMatchObject({ ...chat.Config, ...firstChatConfig });
  expect(paramsCalled).not.toMatchObject({ ...chat.Config, ...secondLocalConfig });
  expect(paramsCalled).toMatchObject(chat.Config);
});
