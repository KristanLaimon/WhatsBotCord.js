import { type Mock, beforeEach, describe, expect, it, spyOn, test } from "bun:test";
import {
  MockGroupTxtMsg_CHATID as GroupMsg_CHATID,
  MockGroupTxtMsg_SENDERID as GroupMsg_SENDERID_LID,
  MockGroupTxtMsg as GroupTxtMsg,
  MockIndividualTxtMsg_CHATID as IndividualMsg_CHATID,
  MockIndividualTxtMsg as IndividualTxtMsg,
} from "../../../mocks/MockIndividualGroup.mock.js";
import { MsgType, SenderType } from "../../../Msg.types.js";
import { WhatsappLIDIdentifier, WhatsappPhoneNumberIdentifier } from "../../../Whatsapp.types.js";
import type { WhatsMsgSenderSendingOptions } from "../../whats_socket/internals/IWhatsSocket.sugarsender.js";
import {
  type WhatsSocketReceiverError,
  WhatsSocket_Submodule_Receiver,
  WhatsSocketReceiverMsgError,
} from "../../whats_socket/internals/WhatsSocket.receiver.js";
import { WhatsSocket_Submodule_SugarSender } from "../../whats_socket/internals/WhatsSocket.sugarsenders.js";
import WhatsSocketMock from "../../whats_socket/mocks/WhatsSocket.mock.js";
import type { WhatsappMessage } from "../../whats_socket/types.js";
import { type IChatContextConfig, ChatContext } from "./ChatContext.js";
import type { IChatContext, IChatContext_WaitYesOrNoAnswer_Params } from "./IChatContext.js";

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
const CHATID: string = GroupTxtMsg.key.remoteJid!;
const WHATSMSGOPTIONSPARAM: WhatsMsgSenderSendingOptions = {
  sendRawWithoutEnqueue: false,
  mentionsIds: ["testID" + WhatsappPhoneNumberIdentifier, "testID2" + WhatsappPhoneNumberIdentifier],
};

function GenerateLocalToolKit_ChatSession_FromGroup() {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
  const senderDependency = new WhatsSocket_Submodule_SugarSender(mockSocket);
  const receiverDependency = new WhatsSocket_Submodule_Receiver(mockSocket);
  const chatSession = new ChatContext(
    GroupTxtMsg.key.participant ?? null,
    GroupTxtMsg.key.participantAlt ?? null,
    GroupTxtMsg.key.remoteJid!,
    GroupTxtMsg,
    senderDependency,
    receiverDependency,
    {
      cancelKeywords: ["cancel", "cancelar"],
      ignoreSelfMessages: true,
      timeoutSeconds: 5,
      wrongTypeFeedbackMsg: "❌",
    }
  );
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
  const chatSession = new ChatContext(null, null, IndividualTxtMsg.key.remoteJid!, IndividualTxtMsg, senderDependency, receiverDependency, {
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
  const senderImgSpy: Mock<typeof sender.Image> = spyOn(sender, "Image");
  senderImgSpy.mockResolvedValueOnce({} as any);
  await chat.SendImg("./test_img", WHATSMSGOPTIONSPARAM);

  expect(senderImgSpy).toHaveBeenCalledTimes(1);
  expect(senderImgSpy).toBeCalledWith(CHATID, { source: "./test_img", caption: undefined }, WHATSMSGOPTIONSPARAM);
});

it("Image_WhenUsingSendImgWithCaption_ShouldUseCorrectlySugarSender", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const senderImgSpy: Mock<typeof sender.Image> = spyOn(sender, "Image");
  senderImgSpy.mockResolvedValueOnce({} as any);
  await chat.SendImgWithCaption("./test_img", "img caption", WHATSMSGOPTIONSPARAM);

  expect(senderImgSpy).toHaveBeenCalledTimes(1);
  expect(senderImgSpy).toBeCalledWith(CHATID, { source: "./test_img", caption: "img caption" }, WHATSMSGOPTIONSPARAM);
});

it("ReactionEmoji_WhenUsingSendReactEmojiTo_ShouldUseCorrectlySugarSender", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const senderReactEmojiToSpy: Mock<typeof sender.ReactEmojiToMsg> = spyOn(sender, "ReactEmojiToMsg");
  const emojiToSendTwoCharLength = "🦊"; //Two javascript chars length
  const emojiToSendOneCharLength = "✨"; //One javascript char length
  expect(async () => {
    await chat.SendReactEmojiTo(GroupTxtMsg, emojiToSendTwoCharLength, WHATSMSGOPTIONSPARAM);
    await chat.SendReactEmojiTo(GroupTxtMsg, emojiToSendOneCharLength, WHATSMSGOPTIONSPARAM);
  }).not.toThrow();

  expect(senderReactEmojiToSpy).toHaveBeenCalledTimes(2);
  expect(senderReactEmojiToSpy).toBeCalledWith(CHATID, GroupTxtMsg, emojiToSendTwoCharLength, WHATSMSGOPTIONSPARAM);
  expect(senderReactEmojiToSpy).toBeCalledWith(CHATID, GroupTxtMsg, emojiToSendOneCharLength, WHATSMSGOPTIONSPARAM);
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
  expect(senderReactEmojiToSpy).toBeCalledWith(CHATID, GroupTxtMsg, emojiToSendOneCharLength, WHATSMSGOPTIONSPARAM);
  expect(senderReactEmojiToSpy).toBeCalledWith(CHATID, GroupTxtMsg, emojiToSendTwoCharLength, WHATSMSGOPTIONSPARAM);
});

it("OK_WhenUsingOK_ShouldCorrectlyUseInternalSugarSenderReactEmojiToMsg", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendReactEmojiSpy: Mock<typeof sender.ReactEmojiToMsg> = spyOn(sender, "ReactEmojiToMsg");

  expect(async (): Promise<void> => {
    await chat.Ok(WHATSMSGOPTIONSPARAM);
  }).not.toThrow();

  expect(sendReactEmojiSpy).toHaveBeenCalledTimes(1);
  expect(sendReactEmojiSpy).toHaveBeenCalledWith(CHATID, GroupTxtMsg, "✅", WHATSMSGOPTIONSPARAM);
});

it("OK_WhenUsingOKWithoutOptions_ShouldCorrectlyUseSugarSenderReactEmojiToMsg", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendReactEmojiSpy: Mock<typeof sender.ReactEmojiToMsg> = spyOn(sender, "ReactEmojiToMsg");

  expect(async (): Promise<void> => {
    await chat.Ok();
  }).not.toThrow();

  expect(sendReactEmojiSpy).toHaveBeenCalledTimes(1);
  expect(sendReactEmojiSpy).toHaveBeenCalledWith(CHATID, GroupTxtMsg, "✅", undefined /** Additional param options wasn't provided */);
});

it("Fail_WhenUsingFail_ShouldCorrectlyUseInternalSugarSenderReactEmojiToMsg", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendReactEmojiSpy: Mock<typeof sender.ReactEmojiToMsg> = spyOn(sender, "ReactEmojiToMsg");

  expect(async (): Promise<void> => {
    await chat.Fail(WHATSMSGOPTIONSPARAM);
  }).not.toThrow();

  expect(sendReactEmojiSpy).toHaveBeenCalledTimes(1);
  expect(sendReactEmojiSpy).toHaveBeenCalledWith(CHATID, GroupTxtMsg, "❌", WHATSMSGOPTIONSPARAM);
});

it("Fail_WhenUsingFailWithoutOptions_ShouldCorrectlyUseSugarSenderReactEmojiToMsg", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendReactEmojiSpy: Mock<typeof sender.ReactEmojiToMsg> = spyOn(sender, "ReactEmojiToMsg");

  expect(async (): Promise<void> => {
    await chat.Fail();
  }).not.toThrow();

  expect(sendReactEmojiSpy).toHaveBeenCalledTimes(1);
  expect(sendReactEmojiSpy).toHaveBeenCalledWith(CHATID, GroupTxtMsg, "❌", undefined /** Additional param options wasn't provided */);
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
  expect(sendAudioSenderSpy).toHaveBeenCalledWith(
    CHATID,
    {
      source: "./mockAudio.mp3",
    },
    WHATSMSGOPTIONSPARAM
  );
});

it("Video_WhenUsingSendVideoWithoutCaption_ShouldCorrectlyUseSugarSenderVideo", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendVideoSenderSpy: Mock<typeof sender.Video> = spyOn(sender, "Video");
  sendVideoSenderSpy.mockResolvedValueOnce({} as any);
  expect(async (): Promise<void> => {
    await chat.SendVideo("./fake_video.mp4", WHATSMSGOPTIONSPARAM);
  }).not.toThrow();
  expect(sendVideoSenderSpy).toHaveBeenCalledTimes(1);
  expect(sendVideoSenderSpy).toHaveBeenCalledWith(CHATID, { source: "./fake_video.mp4", caption: undefined }, WHATSMSGOPTIONSPARAM);
});

it("Video_WhenUsingSendVideoWithCaption_ShouldCorrectlyUseSugarSenderVideo", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendVideoSenderSpy: Mock<typeof sender.Video> = spyOn(sender, "Video");
  sendVideoSenderSpy.mockResolvedValueOnce({} as any);
  expect(async (): Promise<void> => {
    await chat.SendVideoWithCaption("./fake_video_with_caption.mp4", "video caption", WHATSMSGOPTIONSPARAM);
  }).not.toThrow();
  expect(sendVideoSenderSpy).toHaveBeenCalledTimes(1);
  expect(sendVideoSenderSpy).toHaveBeenCalledWith(CHATID, { source: "./fake_video_with_caption.mp4", caption: "video caption" }, WHATSMSGOPTIONSPARAM);
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
  const sendUbicationSenderSpy: Mock<typeof sender.Location> = spyOn(sender, "Location");
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
  const sendUbicationSenderSpy: Mock<typeof sender.Location> = spyOn(sender, "Location");
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
    mockSocket.onIncomingMsg.CallAll(GroupMsg_SENDERID_LID, null, GroupMsg_CHATID, GroupTxtMsg, MsgType.Text, SenderType.Group);
    resolve();
  });

  let res: WhatsappMessage | null = null;
  expect(async (): Promise<void> => {
    res = await Promise.all([main, msging]).then(([msg, _void]) => msg);
  }).not.toThrow();

  expect(res).toBeDefined();
  expect(res).not.toBeNull();
  expect(res).toMatchObject(GroupTxtMsg);
});

it("WaitMsg_WhenExpectingForMsg_FROMINDIVIDUAL_ShouldReceiveIt", async (): Promise<void> => {
  const { chat, mockSocket } = GenerateLocalToolKit_ChatSession_FromIndividual();

  const main: Promise<WhatsappMessage | null> = chat.WaitMsg(MsgType.Text);
  const msging: Promise<void> = new Promise<void>((resolve) => {
    mockSocket.onIncomingMsg.CallAll(null, null, IndividualMsg_CHATID, IndividualTxtMsg, MsgType.Text, SenderType.Individual);
    resolve();
  });

  let res: WhatsappMessage | null = null;
  expect(async (): Promise<void> => {
    res = await Promise.all([main, msging]).then(([msg, _void]) => msg);
  }).not.toThrow();

  expect(res).toBeDefined();
  expect(res).not.toBeNull();
  expect(res!).toMatchObject(IndividualTxtMsg);
});

//When getting bad msg type
it("WaitMsg_WhenGettingIncorrectMsgType_FROMGROUP_ShouldIgnoreItUntilGetExpected", async (): Promise<void> => {
  const { chat, mockSocket } = GenerateLocalToolKit_ChatSession_FromGroup();
  //Temp attaching prop for testing-only purposes
  const incorrectMsg: WhatsappMessage & { INCORRECT: boolean } = { ...GroupTxtMsg, INCORRECT: true };
  const main: Promise<WhatsappMessage | null> = chat.WaitMsg(MsgType.Video);
  const msgs: Promise<void> = new Promise<void>((resolve) => {
    mockSocket.onIncomingMsg.CallAll(GroupMsg_SENDERID_LID, null, GroupMsg_CHATID, incorrectMsg, MsgType.Image, SenderType.Group);
    mockSocket.onIncomingMsg.CallAll(GroupMsg_SENDERID_LID, null, GroupMsg_CHATID, incorrectMsg, MsgType.Contact, SenderType.Group);
    mockSocket.onIncomingMsg.CallAll(GroupMsg_SENDERID_LID, null, GroupMsg_CHATID, incorrectMsg, MsgType.Text, SenderType.Group);
    mockSocket.onIncomingMsg.CallAll(GroupMsg_SENDERID_LID, null, GroupMsg_CHATID, incorrectMsg, MsgType.Contact, SenderType.Group);
    mockSocket.onIncomingMsg.CallAll(GroupMsg_SENDERID_LID, null, GroupMsg_CHATID, incorrectMsg, MsgType.Sticker, SenderType.Group);
    mockSocket.onIncomingMsg.CallAll(GroupMsg_SENDERID_LID, null, GroupMsg_CHATID, incorrectMsg, MsgType.Poll, SenderType.Group);

    //This should be fetched from waiting process
    mockSocket.onIncomingMsg.CallAll(GroupMsg_SENDERID_LID, null, GroupMsg_CHATID, GroupTxtMsg, MsgType.Video, SenderType.Group);
    resolve();
  });

  let res: WhatsappMessage | null = null;
  expect(async (): Promise<void> => {
    res = await Promise.all([main, msgs]).then(([msg, _void]) => msg);
  }).not.toThrow();

  expect(res).toBeDefined();
  expect(res).not.toBeNull();
  expect((res as any).INCORRECT).toBe(undefined);
  expect(res).toMatchObject(GroupTxtMsg);
});

it("WaitMsg_WhenGettingIncorrectMsgType_FROMINDIVIDUAL_ShouldIgnoreItUntilGetExpected", async (): Promise<void> => {
  const { chat, mockSocket } = GenerateLocalToolKit_ChatSession_FromIndividual();
  //Temp attaching prop for testing-only purposes
  const incorrectMsg: WhatsappMessage & { INCORRECT: boolean } = { ...IndividualTxtMsg, INCORRECT: true };
  const main: Promise<WhatsappMessage | null> = chat.WaitMsg(MsgType.Video);
  const msgs: Promise<void> = new Promise<void>((resolve) => {
    mockSocket.onIncomingMsg.CallAll(null, null, IndividualMsg_CHATID, incorrectMsg, MsgType.Image, SenderType.Group);
    mockSocket.onIncomingMsg.CallAll(null, null, IndividualMsg_CHATID, incorrectMsg, MsgType.Contact, SenderType.Group);
    mockSocket.onIncomingMsg.CallAll(null, null, IndividualMsg_CHATID, incorrectMsg, MsgType.Text, SenderType.Group);
    mockSocket.onIncomingMsg.CallAll(null, null, IndividualMsg_CHATID, incorrectMsg, MsgType.Contact, SenderType.Group);
    mockSocket.onIncomingMsg.CallAll(null, null, IndividualMsg_CHATID, incorrectMsg, MsgType.Sticker, SenderType.Group);
    mockSocket.onIncomingMsg.CallAll(null, null, IndividualMsg_CHATID, incorrectMsg, MsgType.Poll, SenderType.Group);

    //This should be fetched from waiting process
    mockSocket.onIncomingMsg.CallAll(null, null, IndividualMsg_CHATID, IndividualTxtMsg, MsgType.Video, SenderType.Group);
    resolve();
  });

  let res: WhatsappMessage | null = null;
  expect(async (): Promise<void> => {
    res = await Promise.all([main, msgs]).then(([msg, _void]) => msg);
  }).not.toThrow();

  expect(res).toBeDefined();
  expect(res).not.toBeNull();
  expect((res as any).INCORRECT).toBeUndefined();
  expect(res).toMatchObject(IndividualTxtMsg);
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
    mockSocket.onIncomingMsg.CallAll(GroupMsg_SENDERID_LID, null, GroupMsg_CHATID, GroupTxtMsg, MsgType.Image, SenderType.Group);
    //Correct type expected!
    mockSocket.onIncomingMsg.CallAll(GroupMsg_SENDERID_LID, null, GroupMsg_CHATID, GroupTxtMsg, MsgType.Text, SenderType.Group);
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
    mockSocket.onIncomingMsg.CallAll(null, null, IndividualMsg_CHATID, IndividualTxtMsg, MsgType.Image, SenderType.Individual);
    //Correct type expected!
    mockSocket.onIncomingMsg.CallAll(null, null, IndividualMsg_CHATID, IndividualTxtMsg, MsgType.Text, SenderType.Individual);
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
    participantId_LID: GroupMsg_SENDERID_LID,
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
    participantId_LID: null,
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
it("WaitMsg_GettingKnownWaitingError_TimeoutExpired_FROMGROUP_ShouldIdentifyErrorWithoutRejectItToGlobalCaller", async (): Promise<void> => {
  const { chat, receiver } = GenerateLocalToolKit_ChatSession_FromGroup();

  const internalWaitSpy = spyOn(receiver, "WaitUntilNextRawMsgFromUserIDInGroup");
  const abortedWaitError: WhatsSocketReceiverError = {
    chatId: GroupMsg_CHATID,
    participantId_LID: GroupMsg_SENDERID_LID,
    participantId_PN: null,
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

it("WaitMsg_GettingKnownWaitingError_TimeoutExpired_FROMINDIVIDUAL_ShouldIdentifyErrorWithoutRejectItToGlobalCaller", async (): Promise<void> => {
  const { chat, receiver } = GenerateLocalToolKit_ChatSession_FromIndividual();

  const internalWaitSpy = spyOn(receiver, "WaitUntilNextRawMsgFromUserIdInPrivateConversation");
  const abortedWaitError: WhatsSocketReceiverError = {
    chatId: IndividualMsg_CHATID,
    participantId_LID: null,
    participantId_PN: null,
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
  const firstChatConfig: IChatContextConfig = {
    cancelKeywords: ["mock", "cancel"],
    ignoreSelfMessages: false,
    timeoutSeconds: 100,
    cancelFeedbackMsg: "cancel feedback mock",
    wrongTypeFeedbackMsg: "wrong type feedback mock",
  };
  await chat.WaitMsg(expectedType, /** local options for this msg only */ firstChatConfig);
  expect(internalWaitSpy).toHaveBeenCalledTimes(1);
  expect(internalWaitSpy).toHaveBeenCalledWith(GroupMsg_SENDERID_LID, null, GroupMsg_CHATID, expectedType, { ...chat.Config, ...firstChatConfig });

  /// 2nd local calling
  const secondLocalConfig: Partial<IChatContextConfig> = {
    timeoutSeconds: 100000,
  };
  await chat.WaitMsg(expectedType, /** local options for this msg only*/ secondLocalConfig);
  expect(internalWaitSpy).toHaveBeenCalledTimes(2);
  let paramsCalled: IChatContextConfig = internalWaitSpy.mock.lastCall![4];
  expect(paramsCalled).toBeDefined();
  //Should not be the same like last local call
  expect(paramsCalled).not.toMatchObject({ ...chat.Config, ...firstChatConfig });
  //Should be using only secondLocalConfig overwrites
  expect(paramsCalled).toMatchObject({ ...chat.Config, ...secondLocalConfig });

  // Local calling without any
  await chat.WaitMsg(expectedType /**no local config*/);
  expect(internalWaitSpy).toHaveBeenCalledTimes(3);
  paramsCalled = internalWaitSpy.mock.lastCall![4];
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
  const firstChatConfig: IChatContextConfig = {
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
  const secondLocalConfig: Partial<IChatContextConfig> = {
    timeoutSeconds: 100000,
  };
  await chat.WaitMsg(expectedType, /** local options for this msg only*/ secondLocalConfig);
  expect(internalWaitSpy).toHaveBeenCalledTimes(2);
  let paramsCalled: IChatContextConfig = internalWaitSpy.mock.lastCall![2];
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

//=========================================================== CLONING/FORKING =======================================================
// Assuming necessary imports and mock setup functions are in place
// e.g., jest, ChatContext, GenerateLocalToolKit_..., mock message objects, etc.

describe("ChatContext Cloning Methods", () => {
  // Helper function to create mock messages for testing
  function createMockMessage(keyData: { remoteJid: string; participant?: string; participantAlt?: string }): WhatsappMessage {
    return {
      key: {
        remoteJid: keyData.remoteJid,
        participant: keyData.participant,
        participantAlt: keyData.participantAlt,
        id: "mock_id",
        fromMe: false,
      },
      message: { conversation: "mock message" },
      // ... other properties as needed
    } satisfies WhatsappMessage;
  }

  // --- Test for the simple Clone() method ---
  describe("Clone()", () => {
    it("should create an exact, independent copy of the context", () => {
      const { chat: originalChat } = GenerateLocalToolKit_ChatSession_FromGroup();
      const clonedChat = originalChat.Clone();

      // Ensure it's a new instance, not the same object reference
      expect(clonedChat).not.toBe(originalChat);

      // All properties should be identical
      expect(clonedChat.FixedChatId).toBe(originalChat.FixedChatId);
      expect(clonedChat.FixedParticipantLID).toBe(originalChat.FixedParticipantLID);
      expect(clonedChat.FixedParticipantPN).toBe(originalChat.FixedParticipantPN);
      expect(clonedChat.InitialMsg).toBe(originalChat.InitialMsg);
      expect(clonedChat.Config).toEqual(originalChat.Config);

      // Internal dependencies should be the same instance
      const original = originalChat as any;
      const cloned = clonedChat as any;
      expect(cloned._internalSend).toBe(original._internalSend);
      expect(cloned._internalReceive).toBe(original._internalReceive);
    });
  });

  // --- Tests for cloning with a new initial message ---
  describe("CloneButTargetedToWithInitialMsg()", () => {
    let originalChat: IChatContext;
    const newChatId = "new_remote_jid@g.us";

    beforeEach(() => {
      // Create a base context to clone from
      originalChat = GenerateLocalToolKit_ChatSession_FromIndividual().chat;
    });

    it("should correctly extract PN and LID from key.participant", () => {
      const mockMsg = createMockMessage({
        remoteJid: newChatId,
        participant: "participant_pn" + WhatsappPhoneNumberIdentifier,
        participantAlt: "participant_lid" + WhatsappLIDIdentifier,
      });

      const forkedChat = originalChat.CloneButTargetedToWithInitialMsg({ initialMsg: mockMsg });

      expect(forkedChat.FixedChatId).toBe(newChatId);
      expect(forkedChat.InitialMsg).toBe(mockMsg);
      // It should prioritize key.participant
      expect(forkedChat.FixedParticipantPN).toBe(mockMsg.key.participant!);
      expect(forkedChat.FixedParticipantLID).toBe(mockMsg.key.participantAlt!);
    });

    it("should use a new config if provided", () => {
      const newConfig: IChatContextConfig = { timeoutSeconds: 999, cancelKeywords: [], ignoreSelfMessages: true };
      const mockMsg = createMockMessage({ remoteJid: newChatId });

      const forkedChat = originalChat.CloneButTargetedToWithInitialMsg({
        initialMsg: mockMsg,
        newConfig: newConfig,
      });

      expect(forkedChat.Config).toEqual(newConfig);
      expect(originalChat.Config).not.toEqual(newConfig); // Ensure original is unchanged
    });

    it("should fall back to the original config if none is provided", () => {
      const mockMsg = createMockMessage({ remoteJid: newChatId });
      const forkedChat = originalChat.CloneButTargetedToWithInitialMsg({ initialMsg: mockMsg });

      expect(forkedChat.Config).toEqual(originalChat.Config);
    });
  });

  // --- Tests for retargeting to an individual chat ---
  describe("CloneButTargetedToIndividualChat()", () => {
    let groupChat: IChatContext;
    const newIndividualChatId = "new_individual@s.whatsapp.net";

    beforeEach(() => {
      groupChat = GenerateLocalToolKit_ChatSession_FromGroup().chat;
    });

    it("should retarget from a group context to a new individual context", () => {
      const forkedChat = groupChat.CloneButTargetedToIndividualChat({
        userChatId: newIndividualChatId,
      });

      expect(forkedChat.FixedChatId).toBe(newIndividualChatId);
      expect(forkedChat.FixedSenderType).toBe(SenderType.Individual);
      expect(forkedChat.InitialMsg).toBe(groupChat.InitialMsg); // Reuses original message
      // Participant IDs are cleared for individual chats
      expect(forkedChat.FixedParticipantLID).toBeNull();
      expect(forkedChat.FixedParticipantPN).toBeNull();
    });

    it("should apply a new config and set explicit sender type", () => {
      const newConfig: IChatContextConfig = { timeoutSeconds: 123, cancelKeywords: ["hello"], ignoreSelfMessages: true };
      const forkedChat = groupChat.CloneButTargetedToIndividualChat({
        userChatId: newIndividualChatId,
        newConfig: newConfig,
      });

      expect(forkedChat.Config.timeoutSeconds).toBe(123);
      // The implementation explicitly overrides this property
      expect(forkedChat.Config.explicitSenderType).toBe(SenderType.Individual);
    });
  });

  // --- Tests for retargeting to a group chat ---
  describe("CloneButTargetedToGroupChat()", () => {
    let individualChat: IChatContext;
    const newGroupChatId = "new_group@g.us";

    beforeEach(() => {
      individualChat = GenerateLocalToolKit_ChatSession_FromIndividual().chat;
    });

    it("should retarget from an individual context to a new group context with new participants", () => {
      const newParticipantLID = "new_lid" + WhatsappLIDIdentifier;
      const newParticipantPN = "new_pn" + WhatsappPhoneNumberIdentifier;

      const forkedChat = individualChat.CloneButTargetedToGroupChat({
        groupChatId: newGroupChatId,
        participant_LID: newParticipantLID,
        participant_PN: newParticipantPN,
      });

      expect(forkedChat.FixedChatId).toBe(newGroupChatId);
      expect(forkedChat.FixedSenderType).toBe(SenderType.Group);
      expect(forkedChat.FixedParticipantLID).toBe(newParticipantLID);
      expect(forkedChat.FixedParticipantPN).toBe(newParticipantPN);
    });

    it("should fall back to original participant IDs if new ones are not provided", () => {
      const forkedChat = individualChat.CloneButTargetedToGroupChat({
        groupChatId: newGroupChatId,
      });

      // Assumes the original 'individualChat' was part of a group context before,
      // hence it has participant info to fall back to.
      expect(forkedChat.FixedChatId).toBe(newGroupChatId);
      expect(forkedChat.FixedParticipantLID).toBe(individualChat.FixedParticipantLID);
      expect(forkedChat.FixedParticipantPN).toBe(individualChat.FixedParticipantPN);
    });
  });
});

describe("WaitYesOrNoAnswer", () => {
  let chat: IChatContext;
  let waitTextSpy: Mock<typeof chat.WaitText>;

  beforeEach(() => {
    const toolkit = GenerateLocalToolKit_ChatSession_FromGroup();
    chat = toolkit.chat;
    waitTextSpy = spyOn(chat, "WaitText");
  });

  describe("with default keywords", () => {
    it("should return true for default positive answers (case-insensitive)", async () => {
      const positiveAnswers = ["yes", "y", "si", "s", "ok", "vale", "sí", "YEs", "OK"];
      for (const answer of positiveAnswers) {
        waitTextSpy.mockResolvedValueOnce(answer);
        const result = await chat.WaitYesOrNoAnswer();
        expect(result).toBe(true);
      }
    });

    it("should return false for default negative answers (case-insensitive)", async () => {
      const negativeAnswers = ["no", "n", "NO", "N"];
      for (const answer of negativeAnswers) {
        waitTextSpy.mockResolvedValueOnce(answer);
        const result: boolean | null = await chat.WaitYesOrNoAnswer();
        expect(result).toBe(false);
      }
    });

    it("should return null for ambiguous answers", async () => {
      waitTextSpy.mockResolvedValueOnce("maybe");
      const result: boolean | null = await chat.WaitYesOrNoAnswer();
      expect(result).toBeNull();
    });

    it("should return null if WaitText returns null (e.g., timeout)", async () => {
      waitTextSpy.mockResolvedValueOnce(null);
      const result = await chat.WaitYesOrNoAnswer();
      expect(result).toBeNull();
    });
  });

  describe("with global config override", () => {
    beforeEach(() => {
      chat.Config.positiveAnswerOptions = ["confirm", "accept"];
      chat.Config.negativeAnswerOptions = ["deny", "reject"];
    });

    it("should return true for globally configured positive answers", async () => {
      waitTextSpy.mockResolvedValueOnce("confirm");
      expect(await chat.WaitYesOrNoAnswer()).toBe(true);
    });

    it("should return false for globally configured negative answers", async () => {
      waitTextSpy.mockResolvedValueOnce("reject");
      expect(await chat.WaitYesOrNoAnswer()).toBe(false);
    });

    it("should return null for default keywords that are no longer valid", async () => {
      waitTextSpy.mockResolvedValueOnce("yes");
      expect(await chat.WaitYesOrNoAnswer()).toBeNull();

      waitTextSpy.mockResolvedValueOnce("no");
      expect(await chat.WaitYesOrNoAnswer()).toBeNull();
    });
  });

  describe("with local options override", () => {
    const localOptions: IChatContext_WaitYesOrNoAnswer_Params = {
      waitYesOrNoOptions: {
        positiveAnswerOptions: ["proceed", "go"],
        negativeAnswerOptions: ["stop", "halt"],
      },
      normalConfig: { timeoutSeconds: 10 },
    };

    it("should return true for locally configured positive answers", async () => {
      waitTextSpy.mockResolvedValueOnce("proceed");
      const result = await chat.WaitYesOrNoAnswer(localOptions);
      expect(result).toBe(true);
    });

    it("should return false for locally configured negative answers", async () => {
      waitTextSpy.mockResolvedValueOnce("halt");
      const result = await chat.WaitYesOrNoAnswer(localOptions);
      expect(result).toBe(false);
    });

    it("should return null for default and global keywords", async () => {
      // Override global config to ensure local takes precedence
      chat.Config.positiveAnswerOptions = ["confirm"];
      chat.Config.negativeAnswerOptions = ["deny"];

      // Test default keyword
      waitTextSpy.mockResolvedValueOnce("yes");
      expect(await chat.WaitYesOrNoAnswer(localOptions)).toBeNull();

      // Test global keyword
      waitTextSpy.mockResolvedValueOnce("confirm");
      expect(await chat.WaitYesOrNoAnswer(localOptions)).toBeNull();
    });

    it("should pass normalConfig down to WaitText", async () => {
      waitTextSpy.mockResolvedValueOnce("go");
      await chat.WaitYesOrNoAnswer(localOptions);
      expect(waitTextSpy).toHaveBeenCalledWith(localOptions.normalConfig);
    });

    it("should use an empty object for normalConfig if not provided", async () => {
      const localOptsWithoutNormalConfig: IChatContext_WaitYesOrNoAnswer_Params = {
        waitYesOrNoOptions: {
          positiveAnswerOptions: ["a"],
          negativeAnswerOptions: ["b"],
        },
        normalConfig: {}, // Explicitly empty
      };
      waitTextSpy.mockResolvedValueOnce("a");
      await chat.WaitYesOrNoAnswer(localOptsWithoutNormalConfig);
      expect(waitTextSpy).toHaveBeenCalledWith({});
    });
  });
});
