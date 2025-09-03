import { expect, it, spyOn, test, type Mock } from "bun:test";
import WhatsSocketMock from "../../../core/whats_socket/mocks/WhatsSocket.mock";
import { GroupMsg as InitialMsg } from "../../../helpers/Whatsapp.helper.mocks";
import { WhatsappIndividualIdentifier } from "../../../Whatsapp.types";
import { WhatsSocketSugarSender_Submodule, type WhatsMsgSenderSendingOptions } from "../../whats_socket/internals/WhatsSocket.sugarsenders";
import { ChatSession } from "./ChatSession";

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
const CHATID: string = InitialMsg.key.remoteJid!;
const WHATSMSGOPTIONSPARAM: WhatsMsgSenderSendingOptions = {
  sendRawWithoutEnqueue: false,
  mentionsIds: ["testID" + WhatsappIndividualIdentifier, "testID2" + WhatsappIndividualIdentifier],
};

function GenerateLocalToolKit_ChatSession_FromGroup(): { mockSocket: WhatsSocketMock; sender: WhatsSocketSugarSender_Submodule; chat: ChatSession } {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
  const senderDependency = new WhatsSocketSugarSender_Submodule(mockSocket);
  const chatSession = new ChatSession(InitialMsg.key.remoteJid!, InitialMsg, senderDependency);
  return { mockSocket, sender: senderDependency, chat: chatSession };
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
    await chat.SendReactEmojiTo(InitialMsg, emojiToSendTwoCharLength, WHATSMSGOPTIONSPARAM);
    await chat.SendReactEmojiTo(InitialMsg, emojiToSendOneCharLength, WHATSMSGOPTIONSPARAM);
  }).not.toThrow();

  expect(senderReactEmojiToSpy).toHaveBeenCalledTimes(2);
  expect(senderReactEmojiToSpy).toBeCalledWith(CHATID, InitialMsg, emojiToSendTwoCharLength, WHATSMSGOPTIONSPARAM);
  expect(senderReactEmojiToSpy).toBeCalledWith(CHATID, InitialMsg, emojiToSendOneCharLength, WHATSMSGOPTIONSPARAM);
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
  expect(senderReactEmojiToSpy).toBeCalledWith(CHATID, InitialMsg, emojiToSendOneCharLength, WHATSMSGOPTIONSPARAM);
  expect(senderReactEmojiToSpy).toBeCalledWith(CHATID, InitialMsg, emojiToSendTwoCharLength, WHATSMSGOPTIONSPARAM);
});

it("OK_WhenUsingOK_ShouldCorrectlyUseInternalSugarSenderReactEmojiToMsg", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendReactEmojiSpy: Mock<typeof sender.ReactEmojiToMsg> = spyOn(sender, "ReactEmojiToMsg");

  expect(async (): Promise<void> => {
    await chat.Ok(WHATSMSGOPTIONSPARAM);
  }).not.toThrow();

  expect(sendReactEmojiSpy).toHaveBeenCalledTimes(1);
  expect(sendReactEmojiSpy).toHaveBeenCalledWith(CHATID, InitialMsg, "✅", WHATSMSGOPTIONSPARAM);
});

it("OK_WhenUsingOKWithoutOptions_ShouldCorrectlyUseSugarSenderReactEmojiToMsg", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendReactEmojiSpy: Mock<typeof sender.ReactEmojiToMsg> = spyOn(sender, "ReactEmojiToMsg");

  expect(async (): Promise<void> => {
    await chat.Ok();
  }).not.toThrow();

  expect(sendReactEmojiSpy).toHaveBeenCalledTimes(1);
  expect(sendReactEmojiSpy).toHaveBeenCalledWith(CHATID, InitialMsg, "✅", undefined /** Additional param options wasn't provided */);
});

it("Fail_WhenUsingFail_ShouldCorrectlyUseInternalSugarSenderReactEmojiToMsg", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendReactEmojiSpy: Mock<typeof sender.ReactEmojiToMsg> = spyOn(sender, "ReactEmojiToMsg");

  expect(async (): Promise<void> => {
    await chat.Fail(WHATSMSGOPTIONSPARAM);
  }).not.toThrow();

  expect(sendReactEmojiSpy).toHaveBeenCalledTimes(1);
  expect(sendReactEmojiSpy).toHaveBeenCalledWith(CHATID, InitialMsg, "❌", WHATSMSGOPTIONSPARAM);
});

it("Fail_WhenUsingFailWithoutOptions_ShouldCorrectlyUseSugarSenderReactEmojiToMsg", async (): Promise<void> => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const sendReactEmojiSpy: Mock<typeof sender.ReactEmojiToMsg> = spyOn(sender, "ReactEmojiToMsg");

  expect(async (): Promise<void> => {
    await chat.Fail();
  }).not.toThrow();

  expect(sendReactEmojiSpy).toHaveBeenCalledTimes(1);
  expect(sendReactEmojiSpy).toHaveBeenCalledWith(CHATID, InitialMsg, "❌", undefined /** Additional param options wasn't provided */);
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
