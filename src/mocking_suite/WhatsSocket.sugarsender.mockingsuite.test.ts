import { describe, expect, test } from "bun:test";
import type {
  WhatsMsgAudioOptions,
  WhatsMsgDocumentOptions,
  WhatsMsgMediaOptions,
  WhatsMsgPollOptions,
  WhatsMsgUbicationOptions,
} from "../core/whats_socket/internals/IWhatsSocket.sugarsender.js";
import type { WhatsappMessage } from "../core/whats_socket/types.js";
import { WhatsappGroupIdentifier, WhatsappIndividualIdentifier } from "../Whatsapp.types.js";
import WhatsSocket_Submodule_SugarSender_MockingSuite from "./WhatsSocket.sugarsender.mockingsuite.js";
const RAW_CHAT = "fakeChat";
const CHATID_GROUP: string = RAW_CHAT + WhatsappGroupIdentifier;
const CHATID_INDIVIDUAL: string = RAW_CHAT + WhatsappIndividualIdentifier;

test("Basic_WhenInstatiating_ShouldNotThrowAnyError", () => {
  new WhatsSocket_Submodule_SugarSender_MockingSuite();
});

test("Basic_WhenInstatiating_ShouldBeTotallyEmptyMocks", () => {
  const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
  expect(sender.SentMessages_Audios).toHaveLength(0);
  expect(sender.SentMessages_Contacts).toHaveLength(0);
  expect(sender.SentMessages_Documents).toHaveLength(0);
  expect(sender.SentMessages_Imgs).toHaveLength(0);
  expect(sender.SentMessages_Locations).toHaveLength(0);
  expect(sender.SentMessages_Polls).toHaveLength(0);
  expect(sender.SentMessages_ReactedEmojis).toHaveLength(0);
  expect(sender.SentMessages_Stickers).toHaveLength(0);
  expect(sender.SentMessages_Texts).toHaveLength(0);
  expect(sender.SentMessages_Videos).toHaveLength(0);
});

test("Basic_HavingManyMocksInside_SholdBeAbleToClearMocksItself", async () => {
  const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
  await sender.Audio(CHATID_GROUP, {} as any, {} as any);
  await sender.Contact(CHATID_GROUP, {} as any, {} as any);
  await sender.Document(CHATID_GROUP, {} as any, {} as any);
  await sender.Image(CHATID_GROUP, {} as any, {} as any);
  await sender.Location(CHATID_GROUP, {} as any, {} as any);
  await sender.Poll(CHATID_GROUP, {} as any, {} as any, {} as any);
  await sender.ReactEmojiToMsg(CHATID_GROUP, {} as any, {} as any);
  await sender.Sticker(CHATID_GROUP, {} as any, {} as any);
  await sender.Text(CHATID_GROUP, {} as any, {} as any);
  await sender.Video(CHATID_GROUP, {} as any, {} as any);

  expect(sender.SentMessages_Audios).toHaveLength(1);
  expect(sender.SentMessages_Contacts).toHaveLength(1);
  expect(sender.SentMessages_Documents).toHaveLength(1);
  expect(sender.SentMessages_Imgs).toHaveLength(1);
  expect(sender.SentMessages_Locations).toHaveLength(1);
  expect(sender.SentMessages_Polls).toHaveLength(1);
  expect(sender.SentMessages_ReactedEmojis).toHaveLength(1);
  expect(sender.SentMessages_Stickers).toHaveLength(1);
  expect(sender.SentMessages_Texts).toHaveLength(1);
  expect(sender.SentMessages_Videos).toHaveLength(1);

  sender.ClearMocks();

  expect(sender.SentMessages_Audios).toHaveLength(0);
  expect(sender.SentMessages_Contacts).toHaveLength(0);
  expect(sender.SentMessages_Documents).toHaveLength(0);
  expect(sender.SentMessages_Imgs).toHaveLength(0);
  expect(sender.SentMessages_Locations).toHaveLength(0);
  expect(sender.SentMessages_Polls).toHaveLength(0);
  expect(sender.SentMessages_ReactedEmojis).toHaveLength(0);
  expect(sender.SentMessages_Stickers).toHaveLength(0);
  expect(sender.SentMessages_Texts).toHaveLength(0);
  expect(sender.SentMessages_Videos).toHaveLength(0);
});

describe("Text", () => {
  test("should store details and return normalized mock msg", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const result = await sender.Text(RAW_CHAT, "Hello world", { normalizeMessageText: true });

    // array should have one entry
    expect(sender.SentMessages_Texts).toHaveLength(1);

    // entry should match arguments (with normalized chat id)
    expect(sender.SentMessages_Texts[0]).toMatchObject({
      chatId: CHATID_GROUP,
      text: "Hello world",
      options: { normalizeMessageText: true },
    });

    // return value should be a mock WAMessage with remoteJid normalized
    expect(result?.key.remoteJid).toBe(CHATID_GROUP);
    expect(result?.key.fromMe).toBe(false);
  });

  test("should preserve chatId ending with group suffix", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const result = await sender.Text(CHATID_GROUP, "Hello group!");

    expect(sender.SentMessages_Texts).toHaveLength(1);
    expect(sender.SentMessages_Texts[0]!.chatId).toBe(CHATID_GROUP);
    expect(result?.key.remoteJid).toBe(CHATID_GROUP);
  });

  test("should preserve chatId ending with individual suffix", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const result = await sender.Text(CHATID_INDIVIDUAL, "Hello private!");

    expect(sender.SentMessages_Texts).toHaveLength(1);
    expect(sender.SentMessages_Texts[0]!.chatId).toBe(CHATID_INDIVIDUAL);
    expect(result?.key.remoteJid).toBe(CHATID_INDIVIDUAL);
  });

  test("should accumulate multiple calls", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    await sender.Text(CHATID_GROUP, "First");
    await sender.Text(CHATID_GROUP, "Second");
    await sender.Text(CHATID_GROUP, "Third");

    expect(sender.SentMessages_Texts).toHaveLength(3);
    expect(sender.SentMessages_Texts.map((x) => x.text)).toEqual(["First", "Second", "Third"]);
  });

  test("should clear and repopulate correctly", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    await sender.Text(CHATID_GROUP, "Before clear");
    expect(sender.SentMessages_Texts).toHaveLength(1);

    sender.ClearMocks();
    expect(sender.SentMessages_Texts).toHaveLength(0);

    await sender.Text(CHATID_GROUP, "After clear");
    expect(sender.SentMessages_Texts).toHaveLength(1);
    expect(sender.SentMessages_Texts[0]!.text).toBe("After clear");
  });
});

describe("Img", () => {
  test("should store image details and return normalized mock msg", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const imageOpts = { source: "./fake.png", caption: "Check this image!" };
    const result = await sender.Image(RAW_CHAT, imageOpts, { mentionsIds: ["123"] });

    expect(sender.SentMessages_Imgs).toHaveLength(1);

    expect(sender.SentMessages_Imgs[0]!).toMatchObject({
      chatId: CHATID_GROUP,
      imageOptions: imageOpts,
      options: { mentionsIds: ["123"] },
    });

    expect(result?.key.remoteJid).toBe(CHATID_GROUP);
    expect(result?.key.id).toBe("success_id_message_id");
    expect(result?.key.fromMe).toBe(false);
  });

  test("should preserve chatId ending with group suffix", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const imageOpts = { source: "./pic.png" };
    const result = await sender.Image(CHATID_GROUP, imageOpts);

    expect(sender.SentMessages_Imgs).toHaveLength(1);
    expect(sender.SentMessages_Imgs[0]!.chatId).toBe(CHATID_GROUP);
    expect(result?.key.remoteJid).toBe(CHATID_GROUP);
  });

  test("should preserve chatId ending with individual suffix", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const imageOpts = { source: "./selfie.jpg" };
    const result = await sender.Image(CHATID_INDIVIDUAL, imageOpts);

    expect(sender.SentMessages_Imgs).toHaveLength(1);
    expect(sender.SentMessages_Imgs[0]!.chatId).toBe(CHATID_INDIVIDUAL);
    expect(result?.key.remoteJid).toBe(CHATID_INDIVIDUAL);
  });

  test("should accumulate multiple calls", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    await sender.Image(CHATID_GROUP, { source: "1.png" });
    await sender.Image(CHATID_GROUP, { source: "2.png", caption: "Second" });
    await sender.Image(CHATID_GROUP, { source: "3.png" });

    expect(sender.SentMessages_Imgs).toHaveLength(3);
    expect(sender.SentMessages_Imgs.map((x) => x.imageOptions.source)).toEqual(["1.png", "2.png", "3.png"]);
  });

  test("should clear and repopulate correctly", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    await sender.Image(CHATID_GROUP, { source: "before.png" });
    expect(sender.SentMessages_Imgs).toHaveLength(1);

    sender.ClearMocks();
    expect(sender.SentMessages_Imgs).toHaveLength(0);

    await sender.Image(CHATID_GROUP, { source: "after.png" });
    expect(sender.SentMessages_Imgs).toHaveLength(1);
    expect(sender.SentMessages_Imgs[0]!.imageOptions.source).toBe("after.png");
  });
});

describe("ReactEmojiMsgTo", () => {
  const makeMockMsg = (id: string): WhatsappMessage => ({ key: { id } } as unknown as WhatsappMessage);

  test("should store reaction details and return normalized mock msg", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const mockMsg = makeMockMsg("msg123");

    const result = await sender.ReactEmojiToMsg(RAW_CHAT, mockMsg, "❤️", { ephemeralExpiration: 60 });

    expect(sender.SentMessages_ReactedEmojis).toHaveLength(1);

    expect(sender.SentMessages_ReactedEmojis[0]!).toMatchObject({
      chatId: CHATID_GROUP,
      emojiStr: "❤️",
      rawMsgReactedTo: mockMsg,
      options: { ephemeralExpiration: 60 },
    });

    expect(result?.key.remoteJid).toBe(CHATID_GROUP);
    expect(result?.key.id).toBe("success_id_message_id");
    expect(result?.key.fromMe).toBe(false);
  });

  test("should preserve chatId ending with group suffix", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const mockMsg = makeMockMsg("groupMsg");

    const result = await sender.ReactEmojiToMsg(CHATID_GROUP, mockMsg, "👍");

    expect(sender.SentMessages_ReactedEmojis).toHaveLength(1);
    expect(sender.SentMessages_ReactedEmojis[0]!.chatId).toBe(CHATID_GROUP);
    expect(result?.key.remoteJid).toBe(CHATID_GROUP);
  });

  test("should preserve chatId ending with individual suffix", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const mockMsg = makeMockMsg("privateMsg");

    const result = await sender.ReactEmojiToMsg(CHATID_INDIVIDUAL, mockMsg, "😂");

    expect(sender.SentMessages_ReactedEmojis).toHaveLength(1);
    expect(sender.SentMessages_ReactedEmojis[0]!.chatId).toBe(CHATID_INDIVIDUAL);
    expect(result?.key.remoteJid).toBe(CHATID_INDIVIDUAL);
  });

  test("should accumulate multiple reactions", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const msgA = makeMockMsg("a");
    const msgB = makeMockMsg("b");

    await sender.ReactEmojiToMsg(CHATID_GROUP, msgA, "🔥");
    await sender.ReactEmojiToMsg(CHATID_GROUP, msgB, "😎");

    expect(sender.SentMessages_ReactedEmojis).toHaveLength(2);
    expect(sender.SentMessages_ReactedEmojis[0]!.emojiStr).toBe("🔥");
    expect(sender.SentMessages_ReactedEmojis[1]!.emojiStr).toBe("😎");
  });

  test("should clear and repopulate correctly", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const msg = makeMockMsg("toClear");

    await sender.ReactEmojiToMsg(CHATID_GROUP, msg, "💀");
    expect(sender.SentMessages_ReactedEmojis).toHaveLength(1);

    sender.ClearMocks();
    expect(sender.SentMessages_ReactedEmojis).toHaveLength(0);

    const newMsg = makeMockMsg("afterClear");
    await sender.ReactEmojiToMsg(CHATID_GROUP, newMsg, "✅");

    expect(sender.SentMessages_ReactedEmojis).toHaveLength(1);
    expect(sender.SentMessages_ReactedEmojis[0]!.emojiStr).toBe("✅");
    expect(sender.SentMessages_ReactedEmojis[0]!.rawMsgReactedTo).toBe(newMsg);
  });
});

describe("Sticker", () => {
  test("should store sticker details and return mock msg (BUG: raw chatId in return)", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const stickerBuf = Buffer.from("sticker-data");

    const result = await sender.Sticker(RAW_CHAT, stickerBuf, { ephemeralExpiration: 120 });

    expect(sender.SentMessages_Stickers).toHaveLength(1);

    expect(sender.SentMessages_Stickers[0]!).toMatchObject({
      chatId: CHATID_GROUP, // normalized
      stickerUrlSource: stickerBuf,
      options: { ephemeralExpiration: 120 },
    });

    // BUG: currently returns raw chatId, not normalized
    expect(result?.key.remoteJid).toBe(RAW_CHAT + WhatsappGroupIdentifier);
    expect(result?.key.id).toBe("success_id_message_id");
    expect(result?.key.fromMe).toBe(false);
  });

  test("should preserve chatId ending with group suffix", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const result = await sender.Sticker(CHATID_GROUP, "https://example.com/sticker.webp");

    expect(sender.SentMessages_Stickers).toHaveLength(1);
    expect(sender.SentMessages_Stickers[0]!.chatId).toBe(CHATID_GROUP);

    // Again BUG: return is not normalized, but raw input
    expect(result?.key.remoteJid).toBe(CHATID_GROUP);
  });

  test("should preserve chatId ending with individual suffix", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const result = await sender.Sticker(CHATID_INDIVIDUAL, "sticker.webp");

    expect(sender.SentMessages_Stickers).toHaveLength(1);
    expect(sender.SentMessages_Stickers[0]!.chatId).toBe(CHATID_INDIVIDUAL);

    expect(result?.key.remoteJid).toBe(CHATID_INDIVIDUAL); // still raw
  });

  test("should accumulate multiple stickers", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    await sender.Sticker(CHATID_GROUP, "sticker1.webp");
    await sender.Sticker(CHATID_GROUP, "sticker2.webp");
    await sender.Sticker(CHATID_GROUP, "sticker3.webp");

    expect(sender.SentMessages_Stickers).toHaveLength(3);
    expect(sender.SentMessages_Stickers.map((x) => x.stickerUrlSource)).toEqual(["sticker1.webp", "sticker2.webp", "sticker3.webp"]);
  });

  test("should clear and repopulate correctly", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    await sender.Sticker(CHATID_GROUP, "stickerBefore.webp");
    expect(sender.SentMessages_Stickers).toHaveLength(1);

    sender.ClearMocks();
    expect(sender.SentMessages_Stickers).toHaveLength(0);

    await sender.Sticker(CHATID_GROUP, "stickerAfter.webp");
    expect(sender.SentMessages_Stickers).toHaveLength(1);
    expect(sender.SentMessages_Stickers[0]!.stickerUrlSource).toBe("stickerAfter.webp");
  });
});

describe("Audio", () => {
  test("should store audio message and normalize chatId", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const audioOpts: WhatsMsgAudioOptions = { source: "./voice.ogg", formatExtension: ".ogg" };

    const result = await sender.Audio(RAW_CHAT, audioOpts);

    expect(result).not.toBeNull();
    expect(sender.SentMessages_Audios).toHaveLength(1);
    expect(sender.SentMessages_Audios[0]!).toMatchObject({
      chatId: CHATID_GROUP, // normalized
      audioParams: audioOpts,
      options: undefined,
    });

    // Ensure mock WAMessage has normalized chatId
    expect(result?.key.remoteJid).toBe(CHATID_GROUP);
    expect(result?.key.id).toBe("success_id_message_id");
    expect(result?.key.fromMe).toBe(false);
  });

  test("should support Buffer source with formatExtension", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const audioOpts: WhatsMsgAudioOptions = { source: Buffer.from("audio"), formatExtension: ".mp3" };

    await sender.Audio("12345", audioOpts);

    expect(sender.SentMessages_Audios[0]!.audioParams.source).toBeInstanceOf(Buffer);
    //@ts-expect-error formatExtension actually exists
    expect(sender.SentMessages_Audios[0]!.audioParams.formatExtension).toBe(".mp3");
  });

  test("should allow multiple audios to be stored independently", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const opts1: WhatsMsgAudioOptions = { source: "./file1.ogg", formatExtension: ".ogg" };
    const opts2: WhatsMsgAudioOptions = { source: "./file2.mp3", formatExtension: ".mp3" };

    await sender.Audio("11111", opts1);
    await sender.Audio("22222", opts2);

    expect(sender.SentMessages_Audios).toHaveLength(2);
    expect(sender.SentMessages_Audios[0]!.chatId).toBe("11111" + WhatsappGroupIdentifier);
    expect(sender.SentMessages_Audios[1]!.chatId).toBe("22222" + WhatsappGroupIdentifier);
  });

  test("should persist options if provided", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const audioOpts: WhatsMsgAudioOptions = { source: "./voice.ogg", formatExtension: ".ogg" };
    const options = { quoted: { key: { id: "quoted123" } } };

    await sender.Audio("99999", audioOpts, options);

    expect(sender.SentMessages_Audios[0]!.options).toEqual(options);
  });

  test("should handle individual chatIds correctly", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const audioOpts: WhatsMsgAudioOptions = { source: "./private.ogg", formatExtension: ".ogg" };

    const result = await sender.Audio(CHATID_INDIVIDUAL, audioOpts);

    expect(sender.SentMessages_Audios[0]!.chatId).toBe(CHATID_INDIVIDUAL);
    expect(result?.key.remoteJid).toBe(CHATID_INDIVIDUAL);
  });

  test("should clear and repopulate mocks correctly", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    await sender.Audio(CHATID_GROUP, { source: "./temp.ogg", formatExtension: ".ogg" });
    expect(sender.SentMessages_Audios).toHaveLength(1);

    sender.ClearMocks();
    expect(sender.SentMessages_Audios).toHaveLength(0);

    await sender.Audio(CHATID_GROUP, { source: "./new.ogg", formatExtension: ".ogg" });
    expect(sender.SentMessages_Audios).toHaveLength(1);
    expect(sender.SentMessages_Audios[0]!.audioParams.source).toBe("./new.ogg");
  });
});

describe("WhatsSocket_Submodule_SugarSender_MockingSuite.Video()", () => {
  test("should store video message and normalize chatId", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const videoOpts: WhatsMsgMediaOptions = { source: "./clip.mp4", caption: "Watch this!" };

    const result = await sender.Video(RAW_CHAT, videoOpts);

    expect(result).not.toBeNull();
    expect(sender.SentMessages_Videos).toHaveLength(1);
    expect(sender.SentMessages_Videos[0]!).toMatchObject({
      chatId: CHATID_GROUP,
      videoParams: videoOpts,
      options: undefined,
    });

    expect(result?.key.remoteJid).toBe(CHATID_GROUP);
    expect(result?.key.id).toBe("success_id_message_id");
    expect(result?.key.fromMe).toBe(false);
  });

  test("should allow multiple videos to be stored independently", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const opts1: WhatsMsgMediaOptions = { source: "./video1.mp4", caption: "First video" };
    const opts2: WhatsMsgMediaOptions = { source: "./video2.mp4", caption: "Second video" };

    await sender.Video("11111", opts1);
    await sender.Video("22222", opts2);

    expect(sender.SentMessages_Videos).toHaveLength(2);
    expect(sender.SentMessages_Videos[0]!.chatId).toBe("11111" + WhatsappGroupIdentifier);
    expect(sender.SentMessages_Videos[1]!.chatId).toBe("22222" + WhatsappGroupIdentifier);
  });

  test("should persist options if provided", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const videoOpts: WhatsMsgMediaOptions = { source: "./clip.mp4", caption: "Hello!" };
    const options = { quoted: { key: { id: "quotedMsg" } } };

    await sender.Video("33333", videoOpts, options);

    expect(sender.SentMessages_Videos[0]!.options).toEqual(options);
  });

  test("should handle individual chatIds correctly", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const videoOpts: WhatsMsgMediaOptions = { source: "./private.mp4", caption: "Private video" };

    const result = await sender.Video(CHATID_INDIVIDUAL, videoOpts);

    expect(sender.SentMessages_Videos[0]!.chatId).toBe(CHATID_INDIVIDUAL);
    expect(result?.key.remoteJid).toBe(CHATID_INDIVIDUAL);
  });

  test("should clear and repopulate mocks correctly", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    await sender.Video(CHATID_GROUP, { source: "./temp.mp4", caption: "Temp" });
    expect(sender.SentMessages_Videos).toHaveLength(1);

    sender.ClearMocks();
    expect(sender.SentMessages_Videos).toHaveLength(0);

    await sender.Video(CHATID_GROUP, { source: "./new.mp4", caption: "New video" });
    expect(sender.SentMessages_Videos).toHaveLength(1);
    expect(sender.SentMessages_Videos[0]!.videoParams.source).toBe("./new.mp4");
  });
});

describe("Document", () => {
  test("should store document message and normalize chatId", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const docOpts: WhatsMsgDocumentOptions = { source: "./report.pdf", fileNameToDisplay: "Report 2025" };

    const result = await sender.Document(RAW_CHAT, docOpts);

    expect(result).not.toBeNull();
    expect(sender.SentMessages_Documents).toHaveLength(1);
    expect(sender.SentMessages_Documents[0]!).toMatchObject({
      chatId: CHATID_GROUP,
      docParams: docOpts,
      options: undefined,
    });

    expect(result?.key.remoteJid).toBe(CHATID_GROUP);
    expect(result?.key.id).toBe("success_id_message_id");
  });

  test("should allow multiple documents to be stored independently", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const opts1: WhatsMsgDocumentOptions = { source: "./file1.pdf", fileNameToDisplay: "File 1" };
    const opts2: WhatsMsgDocumentOptions = { source: "./file2.docx", fileNameToDisplay: "File 2" };

    await sender.Document("11111", opts1);
    await sender.Document("22222", opts2);

    expect(sender.SentMessages_Documents).toHaveLength(2);
    expect(sender.SentMessages_Documents[0]!.chatId).toBe("11111" + WhatsappGroupIdentifier);
    expect(sender.SentMessages_Documents[1]!.chatId).toBe("22222" + WhatsappGroupIdentifier);
  });

  test("should persist options if provided", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const docOpts: WhatsMsgDocumentOptions = { source: "./report.pdf", fileNameToDisplay: "Report" };
    const options = { quoted: { key: { id: "quotedMsg" } } };

    await sender.Document("33333", docOpts, options);

    expect(sender.SentMessages_Documents[0]!.options).toEqual(options);
  });

  test("should handle individual chatIds correctly", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const docOpts: WhatsMsgDocumentOptions = { source: "./private.docx", fileNameToDisplay: "Private Doc" };

    const result = await sender.Document(CHATID_INDIVIDUAL, docOpts);

    expect(sender.SentMessages_Documents[0]!.chatId).toBe(CHATID_INDIVIDUAL);
    expect(result?.key.remoteJid).toBe(CHATID_INDIVIDUAL);
  });

  test("should clear and repopulate mocks correctly", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    await sender.Document(CHATID_GROUP, { source: "./temp.pdf", fileNameToDisplay: "Temp" });
    expect(sender.SentMessages_Documents).toHaveLength(1);

    sender.ClearMocks();
    expect(sender.SentMessages_Documents).toHaveLength(0);

    await sender.Document(CHATID_GROUP, { source: "./new.pdf", fileNameToDisplay: "New" });
    expect(sender.SentMessages_Documents).toHaveLength(1);
    expect(sender.SentMessages_Documents[0]!.docParams.source).toBe("./new.pdf");
  });
});

describe("Poll", () => {
  test("should store poll message and normalize chatId", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const pollOpts: WhatsMsgPollOptions = { withMultiSelect: false };

    const result = await sender.Poll(RAW_CHAT, "Favorite color?", ["Red", "Blue"], pollOpts);

    expect(result).not.toBeNull();
    expect(sender.SentMessages_Polls).toHaveLength(1);
    expect(sender.SentMessages_Polls[0]!).toMatchObject({
      chatId: CHATID_GROUP,
      pollTitle: "Favorite color?",
      selections: ["Red", "Blue"],
      pollParams: pollOpts,
      moreOptions: undefined,
    });

    expect(result?.key.remoteJid).toBe(CHATID_GROUP);
    expect(result?.key.id).toBe("success_id_message_id");
  });

  test("should store multiple polls independently", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const poll1: WhatsMsgPollOptions = { withMultiSelect: true };
    const poll2: WhatsMsgPollOptions = { withMultiSelect: false };

    await sender.Poll("11111", "Poll 1?", ["A", "B"], poll1);
    await sender.Poll("22222", "Poll 2?", ["X", "Y", "Z"], poll2);

    expect(sender.SentMessages_Polls).toHaveLength(2);
    expect(sender.SentMessages_Polls[0]!.chatId).toBe("11111" + WhatsappGroupIdentifier);
    expect(sender.SentMessages_Polls[1]!.chatId).toBe("22222" + WhatsappGroupIdentifier);
  });

  test("should persist optional moreOptions", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const pollOpts: WhatsMsgPollOptions = { withMultiSelect: false };
    const moreOpts = { quoted: { key: { id: "quotedMsg" } } };

    await sender.Poll("33333", "Poll 3?", ["Yes", "No"], pollOpts, moreOpts);

    expect(sender.SentMessages_Polls[0]!.moreOptions).toEqual(moreOpts);
  });

  test("should handle individual chatIds correctly", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const pollOpts: WhatsMsgPollOptions = { withMultiSelect: true };

    const result = await sender.Poll(CHATID_INDIVIDUAL, "Private poll?", ["One", "Two"], pollOpts);

    expect(sender.SentMessages_Polls[0]!.chatId).toBe(CHATID_INDIVIDUAL);
    expect(result?.key.remoteJid).toBe(CHATID_INDIVIDUAL);
  });

  test("should clear and repopulate mocks correctly", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    await sender.Poll(CHATID_GROUP, "Temp poll?", ["A"], { withMultiSelect: false });
    expect(sender.SentMessages_Polls).toHaveLength(1);

    sender.ClearMocks();
    expect(sender.SentMessages_Polls).toHaveLength(0);

    await sender.Poll(CHATID_GROUP, "New poll?", ["B", "C"], { withMultiSelect: true });
    expect(sender.SentMessages_Polls).toHaveLength(1);
    expect(sender.SentMessages_Polls[0]!.pollTitle).toBe("New poll?");
  });
});

describe("Location", () => {
  test("should store location message and normalize chatId", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const locParams: WhatsMsgUbicationOptions = { degreesLatitude: 40.7128, degreesLongitude: -74.006, name: "NYC" };

    const result = await sender.Location(RAW_CHAT, locParams);

    expect(result).not.toBeNull();
    expect(sender.SentMessages_Locations).toHaveLength(1);
    expect(sender.SentMessages_Locations[0]!).toMatchObject({
      chatId: CHATID_GROUP,
      ubicationParams: locParams,
      options: undefined,
    });
    expect(result?.key.remoteJid).toBe(CHATID_GROUP);
    expect(result?.key.id).toBe("success_id_message_id");
  });

  test("should store multiple locations independently", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const loc1: WhatsMsgUbicationOptions = { degreesLatitude: 1, degreesLongitude: 2, name: "Place 1" };
    const loc2: WhatsMsgUbicationOptions = { degreesLatitude: 3, degreesLongitude: 4, name: "Place 2" };

    await sender.Location("11111", loc1);
    await sender.Location("22222", loc2);

    expect(sender.SentMessages_Locations).toHaveLength(2);
    expect(sender.SentMessages_Locations[0]!.chatId).toBe("11111" + WhatsappGroupIdentifier);
    expect(sender.SentMessages_Locations[1]!.chatId).toBe("22222" + WhatsappGroupIdentifier);
  });

  test("should persist optional sending options", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const locParams: WhatsMsgUbicationOptions = { degreesLatitude: 10, degreesLongitude: 20, name: "Option Place" };
    const options = { quoted: { key: { id: "quotedMsg" } } };

    await sender.Location(RAW_CHAT, locParams, options);

    expect(sender.SentMessages_Locations[0]!.options).toEqual(options);
  });

  test("should handle individual chatIds correctly", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const locParams: WhatsMsgUbicationOptions = { degreesLatitude: 50, degreesLongitude: 50, name: "Private Place" };

    const result = await sender.Location(CHATID_INDIVIDUAL, locParams);

    expect(sender.SentMessages_Locations[0]!.chatId).toBe(CHATID_INDIVIDUAL);
    expect(result?.key.remoteJid).toBe(CHATID_INDIVIDUAL);
  });

  test("should clear and repopulate mocks correctly", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    await sender.Location(CHATID_GROUP, { degreesLatitude: 1, degreesLongitude: 1, name: "Temp" });
    expect(sender.SentMessages_Locations).toHaveLength(1);

    sender.ClearMocks();
    expect(sender.SentMessages_Locations).toHaveLength(0);

    await sender.Location(CHATID_GROUP, { degreesLatitude: 2, degreesLongitude: 2, name: "New" });
    expect(sender.SentMessages_Locations).toHaveLength(1);
    expect(sender.SentMessages_Locations[0]!.ubicationParams.name).toBe("New");
  });
});

describe("Contact", () => {
  const RAW_CHAT = "fakeChat";
  const CHATID_GROUP = RAW_CHAT + WhatsappGroupIdentifier;
  const CHATID_INDIVIDUAL = RAW_CHAT + WhatsappIndividualIdentifier;

  test("should store a single contact message with normalized chatId", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const contact = { name: "John Doe", phone: "1234567890" };

    const result = await sender.Contact(RAW_CHAT, contact);

    expect(result).not.toBeNull();
    expect(sender.SentMessages_Contacts).toHaveLength(1);
    expect(sender.SentMessages_Contacts[0]!).toMatchObject({
      chatId: CHATID_GROUP,
      contacts: contact,
      options: undefined,
    });
    expect(result?.key.remoteJid).toBe(CHATID_GROUP);
    expect(result?.key.id).toBe("success_id_message_id");
  });

  test("should store multiple contacts as array", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const contacts = [
      { name: "Alice", phone: "11111" },
      { name: "Bob", phone: "22222" },
    ];

    await sender.Contact(RAW_CHAT, contacts);

    expect(sender.SentMessages_Contacts).toHaveLength(1);
    expect(sender.SentMessages_Contacts[0]!.contacts).toEqual(contacts);
  });

  test("should handle multiple messages independently", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const contact1 = { name: "Alice", phone: "11111" };
    const contact2 = { name: "Bob", phone: "22222" };

    await sender.Contact("11111", contact1);
    await sender.Contact("22222", contact2);

    expect(sender.SentMessages_Contacts).toHaveLength(2);
    expect(sender.SentMessages_Contacts[0]!.chatId).toBe("11111" + WhatsappGroupIdentifier);
    expect(sender.SentMessages_Contacts[1]!.chatId).toBe("22222" + WhatsappGroupIdentifier);
  });

  test("should store optional sending options", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const contact = { name: "Charlie", phone: "33333" };
    const options = { quoted: { key: { id: "quotedMsg" } } };

    await sender.Contact(RAW_CHAT, contact, options);

    expect(sender.SentMessages_Contacts[0]!.options).toEqual(options);
  });

  test("should correctly handle individual chatIds", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    const contact = { name: "Private", phone: "99999" };

    const result = await sender.Contact(CHATID_INDIVIDUAL, contact);

    expect(sender.SentMessages_Contacts[0]!.chatId).toBe(CHATID_INDIVIDUAL);
    expect(result?.key.remoteJid).toBe(CHATID_INDIVIDUAL);
  });

  test("should clear and repopulate mocks correctly", async () => {
    const sender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    await sender.Contact(CHATID_GROUP, { name: "Temp", phone: "123" });
    expect(sender.SentMessages_Contacts).toHaveLength(1);

    sender.ClearMocks();
    expect(sender.SentMessages_Contacts).toHaveLength(0);

    await sender.Contact(CHATID_GROUP, { name: "New", phone: "456" });
    expect(sender.SentMessages_Contacts).toHaveLength(1);
    expect(sender.SentMessages_Contacts[0]!.contacts).toEqual({ name: "New", phone: "456" });
  });
});
