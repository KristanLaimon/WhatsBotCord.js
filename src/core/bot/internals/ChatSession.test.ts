import { it, test, expect, spyOn, type Mock } from "bun:test";
import { WhatsSocketSugarSender_Submodule, type WhatsMsgSenderSendingOptions } from 'src/core/whats_socket/internals/WhatsSocket.sugarsenders';
import WhatsSocketMock from 'src/core/whats_socket/mocks/WhatsSocket.mock';
import { ChatSession } from './ChatSession';
import { GroupMsg as InitialMsg } from 'src/helpers/Whatsapp.helper.mocks';
import { WhatsappIndividualIdentifier } from 'src/Whatsapp.types';

/**
 * ChatSession Testing Suite
 * * Here we only test how 'ChatSession' (Object) delegates correclty to its internal 
 * * WhatsSocketsugarSender(_Submodule) object with correct params.
 * 
 * All testing corresponding about how msgs are going through socket or any 
 * low-level testing, it's already made on the following files:
 *
 * 1. src/core/whats_socket/internals/WhatsSocket.sugarsenders.test.ts
 * 2. src/core/whats_socket/WhatsSocket.mock.test.ts
 * 3. src/core/wahts_socket/mocks/Whatssocket.mock.test.ts
 */

// ========= Utilities ===========
const CHATID: string = InitialMsg.key.remoteJid!;
const WHATSMSGOPTIONSPARAM: WhatsMsgSenderSendingOptions = {
  sendRawWithoutEnqueue: false,
  mentionsIds: ["testID" + WhatsappIndividualIdentifier, "testID2" + WhatsappIndividualIdentifier]
};

function GenerateLocalToolKit_ChatSession_FromGroup(): { mockSocket: WhatsSocketMock, sender: WhatsSocketSugarSender_Submodule, chat: ChatSession } {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
  const senderDependency = new WhatsSocketSugarSender_Submodule(mockSocket);
  const chatSession = new ChatSession(InitialMsg.key.remoteJid!, InitialMsg, senderDependency);
  return { mockSocket, sender: senderDependency, chat: chatSession }
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
})

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
  const senderReactEmojiToSpy: Mock<typeof sender.ReactEmojiToMsg> = spyOn(sender, 'ReactEmojiToMsg');
  const emojiToSendTwoCharLength = "🦊"; //Two javascript chars length
  const emojiToSendOneCharLength = "✨"; //One javascript char length

  expect(async (): Promise<void> => {
    //Without needing to refer to original msg
    await chat.SendReactEmojiToInitialMsg(emojiToSendOneCharLength, WHATSMSGOPTIONSPARAM);
    await chat.SendReactEmojiToInitialMsg(emojiToSendTwoCharLength, WHATSMSGOPTIONSPARAM);
  }).not.toThrow();;

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
  // const { chat, sender }
});
