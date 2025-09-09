import { afterAll, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
// import { afterAll, afterEach, beforeEach, describe, expect, it, mock, spyOn, type Mock } from "bun:test";
import fs from "fs";
// import mime from "mime-types";
import path from "node:path";
// import { GetPath } from "../../../libs/BunPath";
// import { allMockMsgs } from "../../../mocks/MockManyTypesMsgs.mock";
import { GetPath } from "../../../libs/BunPath";
import { WhatsappGroupIdentifier, WhatsappIndividualIdentifier } from "../../../Whatsapp.types";
import WhatsSocketMock from "../mocks/WhatsSocket.mock";
import { WhatsSocket_Submodule_SugarSender, type WhatsMsgSenderSendingOptions } from "./WhatsSocket.sugarsenders";

//GUIDE to testing
const fakeChatId = "338839029383" + WhatsappGroupIdentifier;

/**
 * Test Guide
 * --- Normal usage ---
 * 1. When ideal conditions and params (simplest) (No error) / Validation socketMock receives correct type and called successfully
 * 2. When ideal conditions and params (many types of params) (No error) / Validation socketMock receives correct type and called successfully
 * -- Normal error handling ---
 * 3. When using bad the function, how to handle errors, and got correct error structure
 */

describe("Text", () => {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0, maxQueueLimit: 10 });
  const sender = new WhatsSocket_Submodule_SugarSender(mockSocket);

  const sendSafeSpy = spyOn(mockSocket, "_SendSafe");
  const sendRawSpy = spyOn(mockSocket, "_SendRaw");

  beforeEach(() => {
    mockSocket.ClearMock();
    mock.clearAllMocks();
    sendSafeSpy.mockClear();
    sendRawSpy.mockClear();
  });

  afterAll(() => {
    sendSafeSpy.mockRestore();
    sendRawSpy.mockRestore();
  });

  // =========== Normal usage (No errors) ====================
  //1. Simplest usage!
  it("WhenSendingSimplestTxtMsg_ShouldSendIt", async () => {
    //first msg
    await sender.Text(fakeChatId, "First msg");
    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(fakeChatId, { mentions: undefined, text: "First msg" }, undefined /** There's no additional params given! */);

    //second msg
    await sender.Text(fakeChatId, "Second msg");
    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(2);
    expect(sendSafeSpy).toHaveBeenCalledTimes(2);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(fakeChatId, { mentions: undefined, text: "Second msg" }, undefined /** No additional params given*/);
  });

  it("WhenSendingSimplestTxtMsgWithAdditionalParams_ShouldSendIt", async (): Promise<void> => {
    const firstParams: WhatsMsgSenderSendingOptions = { mentionsIds: ["idperson" + WhatsappIndividualIdentifier, "idperson2" + WhatsappIndividualIdentifier] };
    //first msg
    await sender.Text(fakeChatId, "First with params", firstParams);
    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(fakeChatId, { mentions: firstParams.mentionsIds, text: "First with params" }, firstParams);

    const secondParams: WhatsMsgSenderSendingOptions = {
      mentionsIds: ["idpeople1" + WhatsappIndividualIdentifier, "idpeople2" + WhatsappIndividualIdentifier],
    };
    await sender.Text(fakeChatId, "Second with params", secondParams);
    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(2);
    expect(sendSafeSpy).toHaveBeenCalledTimes(2);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(fakeChatId, { mentions: secondParams.mentionsIds, text: "Second with params" }, secondParams);
  });

  //TODO: Still try with this one!
  // it("WhenSendingTxtMsgWithNormalizedOption_ShouldSendItNormalized", async () => {
  //   await sender.Text(fakeChatId, "     \n\nFirst Message             \n\n\n", { normalizeMessageText: true });
  //   await sender.Text(fakeChatId, "\n\n                                Second message           \n\n\n\n             Hello", { normalizeMessageText: true });
  //   expect(mockSocket.SentMessagesThroughRaw.length).toBe(2);
  //   expect(mockSocket.SentMessagesThroughQueue.length).toBe(2);
  //   //@ts-expect-error Idk why typescript says .text doesn't exist, when it actually does...
  //   expect(mockSocket.SentMessagesThroughRaw[0]!.content.text).toBe("First Message");
  //   //@ts-expect-error content.text exists
  //   expect(mockSocket.SentMessagesThroughRaw[1]!.content.text).toBe("Second message\n\n\n\nHello");
  // });

  // it("WhenSendingTxtMsgQueuedRaw_ShouldBeSendThroughSendRawFromSocket", async () => {
  //   await sender.Text(fakeChatId, "First msg", { sendRawWithoutEnqueue: true });
  //   await sender.Text(fakeChatId, "Second msg", { sendRawWithoutEnqueue: true });
  //   await sender.Text(fakeChatId, "Third msg", { sendRawWithoutEnqueue: true });
  //   expect(mockSocket.SentMessagesThroughRaw.length).toBe(3);
  //   expect(mockSocket.SentMessagesThroughQueue.length).toBe(0);
  // });

  // it("WhenSendingTxtMsgQueued_ShouldBeSendThroughSendSafeFromSocket", async () => {
  //   await sender.Text(fakeChatId, "First msg", { sendRawWithoutEnqueue: false });
  //   await sender.Text(fakeChatId, "Second msg", { sendRawWithoutEnqueue: false });
  //   await sender.Text(fakeChatId, "Third msg", { sendRawWithoutEnqueue: false });

  //   expect(mockSocket.SentMessagesThroughRaw.length).toBe(3);
  //   expect(mockSocket.SentMessagesThroughQueue.length).toBe(3);
  //   expect(mockSocket.SentMessagesThroughQueue.length).toBe(3);
  // });

  // it("WhenSendingTxtMsgQueuedWithNoExtraOptiosn;Default;_ShouldBeSentThroughSendSafeFromSocket", async () => {
  //   await sender.Text(fakeChatId, "First msg default");
  //   await sender.Text(fakeChatId, "Second msg default");
  //   await sender.Text(fakeChatId, "Third msg default");

  //   expect(mockSocket.SentMessagesThroughRaw.length).toBe(3);
  //   expect(mockSocket.SentMessagesThroughQueue.length).toBe(3);
  // });
});

// describe("Image", () => {
//   const mockWhatsSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
//   const sender = new WhatsSocket_Submodule_SugarSender(mockWhatsSocket);
//   const fakeImagePath = GetPath("./test-assets/test-image.jpg");
//   const fakeBuffer = Buffer.from("fake image data");

//   let mockExistsSync: Mock<any>;
//   let mockReadFileSync: Mock<any>;
//   let mockMimeLookup: Mock<any>;

//   beforeEach(() => {
//     mockWhatsSocket.ClearMock();
//     mock.clearAllMocks();

//     mockExistsSync = spyOn(fs, "existsSync").mockReturnValue(true);
//     mockReadFileSync = spyOn(fs, "readFileSync").mockReturnValue(fakeBuffer);
//     mockMimeLookup = spyOn(mime, "lookup").mockReturnValue("image/jpeg");
//   });

//   // 1. Params receiving
//   it("WhenSendingImageWithStringSource_ShouldReceiveAndProcessParams", async () => {
//     await sender.Image(fakeChatId, { source: fakeImagePath });
//     expect(mockExistsSync).toHaveBeenCalledWith(fakeImagePath);
//     expect(mockReadFileSync).toHaveBeenCalledWith(fakeImagePath);
//     expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(1);
//   });

//   it("WhenSendingImageWithBufferSource_ShouldReceiveBufferAndExtension", async () => {
//     await sender.Image(fakeChatId, { source: fakeBuffer, formatExtension: "jpg" });
//     expect(mockExistsSync).not.toHaveBeenCalled();
//     expect(mockReadFileSync).not.toHaveBeenCalled();
//     expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(1);
//   });

//   // 2. Mimetype checking and variations
//   it("WhenSendingImageFile_ShouldDetectCorrectMimeType", async () => {
//     mockMimeLookup.mockReturnValue("image/jpeg");
//     await sender.Image(fakeChatId, { source: fakeImagePath });
//     expect(mockMimeLookup).toHaveBeenCalledWith(fakeImagePath);
//     //@ts-expect-error mimetype exists in content
//     expect(mockWhatsSocket.SentMessagesThroughRaw[0]!.content.mimetype).toBe("image/jpeg");
//   });

//   it("WhenSendingBufferWithExtension_ShouldUseMimeFromExtension", async () => {
//     mockMimeLookup.mockReturnValue("image/png");
//     await sender.Image(fakeChatId, { source: fakeBuffer, formatExtension: "png" });
//     expect(mockMimeLookup).toHaveBeenCalledWith("png");
//     //@ts-expect-error mimetype exists in content
//     expect(mockWhatsSocket.SentMessagesThroughRaw[0]!.content.mimetype).toBe("image/png");
//   });

//   it("WhenMimeTypeNotDetected_ShouldFallbackToOctetStream", async () => {
//     mockMimeLookup.mockReturnValue(false);
//     await sender.Image(fakeChatId, { source: fakeBuffer, formatExtension: "unknown" });
//     //@ts-expect-error mimetype exists in content
//     expect(mockWhatsSocket.SentMessagesThroughRaw[0]!.content.mimetype).toBe("application/octet-stream");
//   });

//   // 3. Send with caption and without caption
//   it("WhenSendingImageWithoutCaption_ShouldSendWithoutCaption", async () => {
//     await sender.Image(fakeChatId, { source: fakeImagePath });
//     //@ts-expect-error caption may exist in content
//     expect(mockWhatsSocket.SentMessagesThroughRaw[0]!.content.caption).toBeUndefined();
//   });

//   it("WhenSendingImageWithCaption_ShouldIncludeCaption", async () => {
//     const testCaption = "Test image caption";
//     await sender.Image(fakeChatId, { source: fakeImagePath, caption: testCaption });
//     //@ts-expect-error caption exists in content
//     expect(mockWhatsSocket.SentMessagesThroughRaw[0]!.content.caption).toBe(testCaption);
//   });

//   // 4. Send with caption normalized option
//   it("WhenSendingImageWithCaptionNormalizationEnabled_ShouldNormalizeCaption", async () => {
//     await sender.Image(
//       fakeChatId,
//       {
//         source: fakeImagePath,
//         caption: "     \n\nTest caption             \n\n\n",
//       },
//       { normalizeMessageText: true }
//     );
//     //@ts-expect-error caption exists in content
//     expect(mockWhatsSocket.SentMessagesThroughRaw[0]!.content.caption).toBe("Test caption");
//   });

//   it("WhenSendingImageWithCaptionNormalizationDisabled_ShouldKeepOriginalCaption", async () => {
//     const originalCaption = "     \n\nTest caption             \n\n\n";
//     await sender.Image(
//       fakeChatId,
//       {
//         source: fakeImagePath,
//         caption: originalCaption,
//       },
//       { normalizeMessageText: false }
//     );
//     //@ts-expect-error caption exists in content
//     expect(mockWhatsSocket.SentMessagesThroughRaw[0]!.content.caption).toBe(originalCaption);
//   });

//   // 5. Send with invalid options, throw error
//   it("WhenSendingImageWithBufferButNoExtension_ShouldThrowError", async () => {
//     expect(async () => {
//       //@ts-expect-error Testing invalid params
//       await sender.Image(fakeChatId, { source: fakeBuffer });
//     }).toThrow();
//   });

//   it("WhenSendingImageWithInvalidPath_ShouldThrowError", async () => {
//     mockExistsSync.mockReturnValue(false);
//     expect(async () => {
//       await sender.Image(fakeChatId, { source: "/invalid/path/image.jpg" });
//     }).toThrow();
//   });

//   it("WhenSendingImageWithEmptySource_ShouldThrowError", async () => {
//     expect(async () => {
//       await sender.Image(fakeChatId, { source: "" });
//     }).toThrow();
//   });

//   // 6. Possible errors
//   it("WhenFileReadFails_ShouldThrowError", async () => {
//     mockReadFileSync.mockImplementation(() => {
//       throw new Error("File read error");
//     });
//     expect(async () => {
//       await sender.Image(fakeChatId, { source: fakeImagePath });
//     }).toThrow("File read error");
//   });

//   it("WhenSocketSendFails_ShouldPropagateError", async () => {
//     mockWhatsSocket._SendSafe = mock(() => {
//       throw new Error("Socket send error");
//     });
//     expect(async () => {
//       await sender.Image(fakeChatId, { source: fakeImagePath });
//     }).toThrow("Socket send error");
//   });

//   // 7. Check if distinct fs are or aren't used
//   it("WhenSendingImageWithStringPath_ShouldUseFsOperations", async () => {
//     await sender.Image(fakeChatId, { source: fakeImagePath });
//     expect(mockExistsSync).toHaveBeenCalledTimes(1);
//     expect(mockReadFileSync).toHaveBeenCalledTimes(1);
//   });

//   it("WhenSendingImageWithBuffer_ShouldNotUseFsOperations", async () => {
//     await sender.Image(fakeChatId, { source: fakeBuffer, formatExtension: "jpg" });
//     expect(mockExistsSync).not.toHaveBeenCalled();
//     expect(mockReadFileSync).not.toHaveBeenCalled();
//   });

//   it("WhenSendingMultipleImagesWithMixedSources_ShouldUseFsSelectively", async () => {
//     await sender.Image(fakeChatId, { source: fakeImagePath });
//     await sender.Image(fakeChatId, { source: fakeBuffer, formatExtension: "jpg" });
//     await sender.Image(fakeChatId, { source: fakeImagePath });

//     expect(mockExistsSync).toHaveBeenCalledTimes(2);
//     expect(mockReadFileSync).toHaveBeenCalledTimes(2);
//   });

//   it("WhenSendingImageRawWithoutEnqueue_ShouldBeSentThroughRaw", async () => {
//     await sender.Image(fakeChatId, { source: fakeImagePath }, { sendRawWithoutEnqueue: true });
//     expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(1);
//     expect(mockWhatsSocket.SentMessagesThroughQueue.length).toBe(0);
//   });

//   it("WhenSendingImageQueued_ShouldBeSentThroughQueue", async () => {
//     await sender.Image(fakeChatId, { source: fakeImagePath }, { sendRawWithoutEnqueue: false });
//     expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(1);
//     expect(mockWhatsSocket.SentMessagesThroughQueue.length).toBe(1);
//   });
// });

// describe("ReactEmojiToMsg", () => {
//   const mockWhatsSender = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
//   const sender = new WhatsSocket_Submodule_SugarSender(mockWhatsSender);

//   it("WhenGivenIdealParams_ShouldSendItCorrectly", async () => {
//     const emoji = "✨";
//     let i = 0;
//     for (const mockMsg of allMockMsgs) {
//       await sender.ReactEmojiToMsg(fakeChatId, mockMsg, emoji);
//       expect(mockWhatsSender.SentMessagesThroughQueue[i]).toBeDefined();
//       expect(mockWhatsSender.SentMessagesThroughQueue[i]?.content).toMatchObject({
//         react: {
//           text: emoji,
//         },
//       });
//       i++;
//     }
//   });

//   it("WhenGivenEmptyString_ShouldThrowError", async () => {
//     const emojiWrong = "";
//     for (const mockMsg of allMockMsgs) {
//       expect(async () => {
//         await sender.ReactEmojiToMsg(fakeChatId, mockMsg, emojiWrong);
//       }).toThrowError();
//     }
//   });

//   it("WhenGivenTwoCharactersEmoji_ShouldAcceptIt", async () => {
//     const emojis = "🦊";
//     for (const mockMsg of allMockMsgs) {
//       expect(async () => {
//         await sender.ReactEmojiToMsg(fakeChatId, mockMsg, emojis);
//       }).not.toThrowError();
//     }
//   });

//   it("WhenGivenTwoEmojis_ShouldRejectIt", async (): Promise<void> => {
//     const emojis = "😯🦊";
//     for (const mockMsg of allMockMsgs) {
//       expect(async () => {
//         await sender.ReactEmojiToMsg(fakeChatId, mockMsg, emojis);
//       }).toThrowError();
//     }
//   });

//   it("WhenGivenCorrectLengthAndStringButNotEmoji_ShouldThrowError", async () => {
//     const nonEmoji = "K";
//     for (const mockMsg of allMockMsgs) {
//       expect(async () => {
//         await sender.ReactEmojiToMsg(fakeChatId, mockMsg, nonEmoji);
//       }).toThrowError("WhatsSocketSugarSender.ReactEmojiToMsg() received a non emoji reaction. Received instead: " + nonEmoji);
//     }
//   });
// });

const mockDataFolderPath = GetPath("src", "core", "whats_socket", "internals", "mock_data");
describe("Sticker", () => {
  const mockWhatsSender = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
  const sender = new WhatsSocket_Submodule_SugarSender(mockWhatsSender);

  //Getting all real stickers examples in webp from mocks folder
  const stickerFilesPaths = fs
    .readdirSync(mockDataFolderPath)
    .filter((fileName) => fileName.endsWith(".webp"))
    .map((webpFile) => path.join(mockDataFolderPath, webpFile));

  it("WhenIdealConditions_ShouldSimpleSendIt", async () => {
    for (const realStickerPath of stickerFilesPaths) {
      expect(async () => {
        await sender.Sticker(fakeChatId, realStickerPath);
      }).not.toThrow();
    }
  });

  it("WhenProvidingNonExistentSource_ShouldThrowError", async () => {
    const invalidStickerPath = "./invalid/path/doesnt/exist";
    expect(async () => {
      await sender.Sticker(fakeChatId, invalidStickerPath);
    }).toThrow("WhatsSocketSugarSender.Sticker() coudn't find stickerUrlSource or it's invalid..." + "Url: " + invalidStickerPath);
  });

  it("WhenProvidingRealStickersPathsAsBuffer_ShouldSendIt", async () => {
    for (const realStickerPath of stickerFilesPaths) {
      const stickerBuffer = fs.readFileSync(realStickerPath);
      expect(async () => {
        await sender.Sticker(fakeChatId, stickerBuffer);
      }).not.toThrow();
    }
  });
  //TODO: Check if mock sending msg receives correct parameters
});

// //TODO: Improve this suite test to check what's sent to mockWhatsSocket
// describe("Audio", () => {
//   const mockWhatsSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
//   const sender = new WhatsSocket_Submodule_SugarSender(mockWhatsSocket);
//   const fakeAudioPath = GetPath("./test-assets/test-audio.mp3");
//   const fakeBuffer = Buffer.from("fake audio data");

//   let mockExistsSync: Mock<any>;
//   let mockReadFileSync: Mock<any>;
//   let mockMimeLookup: Mock<any>;

//   beforeEach(() => {
//     mockWhatsSocket.ClearMock();
//     mock.clearAllMocks();

//     mockExistsSync = spyOn(fs, "existsSync").mockReturnValue(true);
//     mockReadFileSync = spyOn(fs, "readFileSync").mockReturnValue(fakeBuffer);
//     mockMimeLookup = spyOn(mime, "lookup").mockReturnValue("audio/mpeg");
//   });

//   it("WhenSendingSimplestAudioMsg_ShouldSendIt", async () => {
//     await sender.Audio(fakeChatId, { source: fakeAudioPath });
//     await sender.Audio(fakeChatId, { source: fakeBuffer, formatExtension: "mp3" });
//     expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(2);
//     expect(mockWhatsSocket.SentMessagesThroughQueue.length).toBe(2);
//   });

//   it("WhenSendingAudioWithStringSource_ShouldReceiveAndProcessParams", async () => {
//     await sender.Audio(fakeChatId, { source: fakeAudioPath });
//     expect(mockExistsSync).toHaveBeenCalledWith(fakeAudioPath);
//     expect(mockReadFileSync).toHaveBeenCalledWith(fakeAudioPath);
//     expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(1);
//   });

//   it("WhenSendingAudioWithBufferSource_ShouldReceiveBufferAndExtension", async () => {
//     await sender.Audio(fakeChatId, { source: fakeBuffer, formatExtension: "wav" });
//     expect(mockExistsSync).not.toHaveBeenCalled();
//     expect(mockReadFileSync).not.toHaveBeenCalled();
//     expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(1);
//   });

//   it("WhenSendingAudioFile_ShouldDetectCorrectMimeType", async () => {
//     mockMimeLookup.mockReturnValue("audio/mpeg");
//     await sender.Audio(fakeChatId, { source: fakeAudioPath });
//     expect(mockMimeLookup).toHaveBeenCalledWith(fakeAudioPath);
//     //@ts-expect-error mimetype exists in content
//     expect(mockWhatsSocket.SentMessagesThroughRaw[0]!.content.mimetype).toBe("audio/mpeg");
//   });

//   it("WhenSendingBufferWithExtension_ShouldUseMimeFromExtension", async () => {
//     mockMimeLookup.mockReturnValue("audio/wav");
//     await sender.Audio(fakeChatId, { source: fakeBuffer, formatExtension: "wav" });
//     expect(mockMimeLookup).toHaveBeenCalledWith(".wav");
//     //@ts-expect-error mimetype exists in content
//     expect(mockWhatsSocket.SentMessagesThroughRaw[0]!.content.mimetype).toBe("audio/wav");
//   });

//   it("WhenMimeTypeNotDetected_ShouldFallbackToOctetStream", async () => {
//     mockMimeLookup.mockReturnValue(false);
//     await sender.Audio(fakeChatId, { source: fakeBuffer, formatExtension: "unknown" });
//     //@ts-expect-error mimetype exists in content
//     expect(mockWhatsSocket.SentMessagesThroughRaw[0]!.content.mimetype).toBe("application/octet-stream");
//   });

//   it("WhenSendingAudioWithBufferButNoExtension_ShouldThrowError", async () => {
//     expect(async () => {
//       //@ts-expect-error Testing invalid params
//       await sender.Audio(fakeChatId, { source: fakeBuffer });
//     }).toThrow();
//   });

//   it("WhenSendingAudioWithInvalidPath_ShouldThrowError", async () => {
//     mockExistsSync.mockReturnValue(false);
//     expect(async () => {
//       await sender.Audio(fakeChatId, { source: "/invalid/path/audio.mp3" });
//     }).toThrow();
//   });

//   it("WhenFileReadFails_ShouldThrowError", async () => {
//     mockReadFileSync.mockImplementation(() => {
//       throw new Error("File read error");
//     });
//     expect(async () => {
//       await sender.Audio(fakeChatId, { source: fakeAudioPath });
//     }).toThrow("File read error");
//   });

//   it("WhenSendingAudioWithStringPath_ShouldUseFsOperations", async () => {
//     await sender.Audio(fakeChatId, { source: fakeAudioPath });
//     expect(mockExistsSync).toHaveBeenCalledTimes(1);
//     expect(mockReadFileSync).toHaveBeenCalledTimes(1);
//   });

//   it("WhenSendingAudioWithBuffer_ShouldNotUseFsOperations", async () => {
//     await sender.Audio(fakeChatId, { source: fakeBuffer, formatExtension: "mp3" });
//     expect(mockExistsSync).not.toHaveBeenCalled();
//     expect(mockReadFileSync).not.toHaveBeenCalled();
//   });

//   it("WhenSendingAudioRawWithoutEnqueue_ShouldBeSentThroughRaw", async () => {
//     await sender.Audio(fakeChatId, { source: fakeAudioPath }, { sendRawWithoutEnqueue: true });
//     expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(1);
//     expect(mockWhatsSocket.SentMessagesThroughQueue.length).toBe(0);
//   });

//   it("WhenSendingAudioQueued_ShouldBeSentThroughQueue", async () => {
//     await sender.Audio(fakeChatId, { source: fakeAudioPath }, { sendRawWithoutEnqueue: false });
//     expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(1);
//     expect(mockWhatsSocket.SentMessagesThroughQueue.length).toBe(1);
//   });

//   it("WhenSendingAudioQueuedWithNoExtraOptions;Default;_ShouldBeSentThroughSafeFromSocket", async () => {
//     await sender.Audio(fakeChatId, { source: fakeAudioPath });
//     await sender.Audio(fakeChatId, { source: fakeBuffer, formatExtension: "mp3" });
//     await sender.Audio(fakeChatId, { source: fakeAudioPath });

//     expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(3);
//     expect(mockWhatsSocket.SentMessagesThroughQueue.length).toBe(3);
//   });

//   it("WhenSendingMultipleAudioFormats_ShouldDetectCorrectMimeTypes", async () => {
//     const testCases = [
//       { ext: "mp3", expectedMime: "audio/mpeg" },
//       { ext: "wav", expectedMime: "audio/wav" },
//       { ext: "ogg", expectedMime: "audio/ogg" },
//       { ext: "m4a", expectedMime: "audio/mp4" },
//     ];

//     for (const testCase of testCases) {
//       mockMimeLookup.mockReturnValue(testCase.expectedMime);
//       mockWhatsSocket.ClearMock();

//       await sender.Audio(fakeChatId, { source: fakeBuffer, formatExtension: testCase.ext });
//       //@ts-expect-error mimetype exists in content
//       expect(mockWhatsSocket.SentMessagesThroughRaw[0]!.content.mimetype).toBe(testCase.expectedMime);
//       expect(mockWhatsSocket.SentMessagesThroughQueue.at(0)).toMatchObject({
//         audio: fakeBuffer,
//         mimetype: testCase.expectedMime,
//         mentions: undefined,
//       });
//     }
//   });

//   it("WhenSocketSendFails_ShouldPropagateError", async () => {
//     mockWhatsSocket._SendSafe = mock(() => {
//       throw new Error("Socket send error");
//     });
//     expect(async () => {
//       await sender.Audio(fakeChatId, { source: fakeAudioPath });
//     }).toThrow("Socket send error");
//   });
// });

// describe("Video", () => {
//   const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
//   const sender = new WhatsSocket_Submodule_SugarSender(mockSocket);

//   let FS_existsSync: Mock<typeof fs.existsSync>;
//   let FS_readFileSync: Mock<typeof fs.readFileSync>;

//   beforeEach(() => {
//     mockSocket.ClearMock();
//     FS_existsSync = spyOn(fs, "existsSync");
//     FS_readFileSync = spyOn(fs, "readFileSync");
//   });

//   afterEach(() => {
//     FS_existsSync.mockClear();
//     FS_readFileSync.mockClear();
//   });

//   afterAll(() => {
//     FS_existsSync.mockRestore();
//     FS_readFileSync.mockRestore();
//   });

//   it("WhenSendingVideoFromLocalPath_ShouldSendIt", async () => {
//     const videoPath = "./real/and/valid/video.mp4";
//     const videoContent = Buffer.from("VideoContentBinaryMock");
//     FS_existsSync.mockReturnValue(true);
//     FS_readFileSync.mockReturnValue(videoContent);

//     await sender.Video(fakeChatId, { source: videoPath /** With no caption */ });
//     await sender.Video(fakeChatId, { source: videoPath, caption: "This video has caption" /** With caption */ });

//     expect(FS_existsSync).toBeCalledTimes(2);
//     expect(mockSocket.SentMessagesThroughQueue.length).toBe(2);
//     expect(mockSocket.SentMessagesThroughRaw.length).toBe(2);

//     //@ts-expect-error Content.video does exist!
//     expect(mockSocket.SentMessagesThroughRaw[0]!.content.video).toBe(videoContent);
//     //@ts-expect-error Content.caption does exist!
//     expect(mockSocket.SentMessagesThroughRaw[0]!.content.caption).toBe("");
//     //@ts-expect-error Content.video does exist!
//     expect(mockSocket.SentMessagesThroughRaw[1]!.content.video).toBe(videoContent);
//     //@ts-expect-error Content.caption does exist!
//     expect(mockSocket.SentMessagesThroughRaw[1]!.content.caption).toBe("This video has caption");
//   });

//   it("WhenSendingFromBuffer_ShouldSendIt", async () => {
//     const videoAsBuffer = Buffer.from("VideoContentBinayMock");

//     await sender.Video(fakeChatId, { source: videoAsBuffer, formatExtension: "mp4" });
//     await sender.Video(fakeChatId, { source: videoAsBuffer, formatExtension: "mp4", caption: "Msg Video from Buffer" });

//     expect(FS_existsSync).not.toHaveBeenCalled();
//     expect(FS_readFileSync).not.toHaveBeenCalled();

//     expect(mockSocket.SentMessagesThroughQueue.length).toBe(2);
//     expect(mockSocket.SentMessagesThroughRaw.length).toBe(2);

//     expect(mockSocket.SentMessagesThroughRaw.at(0)!.content).toMatchObject({
//       video: videoAsBuffer,
//       caption: "",
//       mimetype: "application/mp4",
//     });
//     expect(mockSocket.SentMessagesThroughRaw.at(1)!.content).toMatchObject({
//       video: videoAsBuffer,
//       caption: "Msg Video from Buffer",
//       mimetype: "application/mp4",
//     });
//   });

//   it("WhenSendingWithNormalizeCaptionOption_ShouldNormalizeInternally", async () => {
//     const videoPath = "./real/and/valid/video.mp4";
//     const videoContent = Buffer.from("VideoContentBinaryMock");
//     FS_existsSync.mockReturnValue(true);
//     FS_readFileSync.mockReturnValue(videoContent);

//     await sender.Video(fakeChatId, { source: videoPath, caption: "        First Video       " }, { normalizeMessageText: true });
//     await sender.Video(fakeChatId, { source: videoPath, caption: " \n\n       Second Video     \n\n\n  " }, { normalizeMessageText: true });

//     expect(mockSocket.SentMessagesThroughQueue.length).toBe(2);
//     expect(mockSocket.SentMessagesThroughRaw.length).toBe(2);
//     expect(mockSocket.SentMessagesThroughRaw.at(0)!.content).toMatchObject({
//       caption: "First Video",
//     });
//     expect(mockSocket.SentMessagesThroughRaw.at(1)!.content).toMatchObject({
//       caption: "Second Video",
//     });
//   });

//   it("WhenSendingVideoWithDifferentExtensions_ShouldDetectMimeType", async () => {
//     const videoContent = Buffer.from("VideoContentBinaryMock");
//     FS_existsSync.mockReturnValue(true);
//     FS_readFileSync.mockReturnValue(videoContent);

//     const cases = [
//       { path: "./clip.mp4", expected: "application/mp4" },
//       { path: "./movie.mov", expected: "video/quicktime" },
//       { path: "./demo.avi", expected: "video/x-msvideo" },
//     ];

//     for (const { path, expected } of cases) {
//       await sender.Video(fakeChatId, { source: path });
//       //@ts-expect-error content exists
//       expect(mockSocket.SentMessagesThroughRaw.at(-1)!.content.mimetype).toBe(expected);
//     }
//   });

//   it("WhenSendingBufferWithFormatExtension_ShouldUseItForMimeType", async () => {
//     const videoBuffer = Buffer.from("BinaryBufferVideoMock");
//     await sender.Video(fakeChatId, { source: "holis", formatExtension: "mp3" });
//     await sender.Video(fakeChatId, { source: videoBuffer, formatExtension: "avi" });
//     //@ts-expect-error content exists
//     expect(mockSocket.SentMessagesThroughRaw.at(0)!.content.mimetype).toBe("video/x-msvideo");
//   });
// });

// describe("Poll", () => {
//   const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
//   const sender = new WhatsSocket_Submodule_SugarSender(mockSocket);

//   beforeEach(() => {
//     mockSocket.ClearMock();
//   });

//   it("WhenGivenMinimalParams_ShouldWorkAndNotThrowAnything", async () => {
//     const pollTitleHeader = "Poll Title Example";
//     const options = ["Option 1", "Option 2", "Option 3"];

//     expect(async () => {
//       await sender.Poll(fakeChatId, pollTitleHeader, options, { withMultiSelect: true });
//     }).not.toThrow();

//     expect(mockSocket.SentMessagesThroughQueue.length).toBe(1);
//     expect(mockSocket.SentMessagesThroughRaw.length).toBe(1);
//     expect(mockSocket.SentMessagesThroughRaw.at(0)!.content).toMatchObject({
//       poll: {
//         name: "Poll Title Example",
//         values: options,
//         selectableCount: options.length,
//       },
//     });
//   });
// });

// describe("Ubication", () => {
//   const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
//   const sender = new WhatsSocket_Submodule_SugarSender(mockSocket);

//   beforeEach(() => {
//     mockSocket.ClearMock();
//   });

//   it("WhenProvidingIdealParams_ShouldWork", async () => {
//     expect(async () => {
//       await sender.Ubication(fakeChatId, { degreesLatitude: -85, degreesLongitude: 125, addressText: "Address Text Example", name: "Ubication Name Example" });
//     }).not.toThrow();

//     expect(mockSocket.SentMessagesThroughQueue.length).toBe(1);
//     expect(mockSocket.SentMessagesThroughRaw.length).toBe(1);
//     expect(mockSocket.SentMessagesThroughRaw.at(0)!.content).toMatchObject({
//       location: {
//         degreesLongitude: 125,
//         degreesLatitude: -85,
//         name: "Ubication Name Example",
//         address: "Address Text Example",
//       },
//     });
//   });

//   it("WhenProvidingInvalidLatitude_ShouldThrowError", async () => {
//     const badLatitude = -100;
//     const goodLongitude = 120;
//     expect(async () => {
//       await sender.Ubication(fakeChatId, { degreesLatitude: badLatitude, degreesLongitude: goodLongitude });
//     }).toThrowError(
//       `WhatsSocketSugarSender.Ubication() => Invalid coordinates: (${badLatitude}, ${goodLongitude}).Latitude must be between -90 and 90, longitude between -180 and 180.`
//     );
//   });

//   it("WhenProvidingInvalidLongitude_ShouldThrowError", async () => {
//     const goodLatitude = 80;
//     const badLongitude = -200;
//     expect(async () => {
//       await sender.Ubication(fakeChatId, { degreesLatitude: goodLatitude, degreesLongitude: badLongitude });
//     }).toThrowError(
//       `WhatsSocketSugarSender.Ubication() => Invalid coordinates: (${goodLatitude}, ${badLongitude}).Latitude must be between -90 and 90, longitude between -180 and 180.`
//     );
//   });
// });

// describe("Contacts", () => {
//   const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
//   const sender = new WhatsSocket_Submodule_SugarSender(mockSocket);

//   beforeEach(() => {
//     mockSocket.ClearMock();
//   });

//   it("WhenProvidingMinimumIdealParams_ShouldWork", async () => {
//     await sender.Contact(fakeChatId, { name: "Chrismorris", phone: "521612938493020" });

//     expect(mockSocket.SentMessagesThroughQueue.length).toBe(1);
//     expect(mockSocket.SentMessagesThroughRaw.length).toBe(1);

//     //@ts-expect-error Content in fact containts "contacts" object
//     const msg = mockSocket.SentMessagesThroughRaw[0].content.contacts;
//     expect(msg.displayName).toBe("Chrismorris");
//     expect(msg.contacts[0].vcard).toContain("BEGIN:VCARD");
//     expect(msg.contacts[0].vcard).toContain("FN:Chrismorris");
//     expect(msg.contacts[0].vcard).toContain("waid=521612938493020");
//   });

//   it("WhenSendingMultipleContacts_ShouldAggregateThem", async () => {
//     const contacts = [
//       { name: "Alice", phone: "5211111111111" },
//       { name: "Bob", phone: "5212222222222" },
//     ];

//     await sender.Contact(fakeChatId, contacts);

//     expect(mockSocket.SentMessagesThroughQueue.length).toBe(1);
//     expect(mockSocket.SentMessagesThroughRaw.length).toBe(1);

//     //@ts-expect-error Content in fact containts "contacts" object
//     const msg = mockSocket.SentMessagesThroughRaw[0]!.content.contacts;
//     expect(msg.displayName).toBe("2 contacts");
//     expect(msg.contacts).toHaveLength(2);
//     expect(msg.contacts[0].vcard).toContain("FN:Alice");
//     expect(msg.contacts[1].vcard).toContain("FN:Bob");
//   });

//   it("WhenMissingPhone_ShouldThrowError", async () => {
//     expect(async () => {
//       await sender.Contact(fakeChatId, { name: "NoPhone" } as any);
//     }).toThrowError("Invalid contact: name and phone are required");
//   });

//   it("WhenMissingName_ShouldThrowError", async () => {
//     expect(async () => {
//       await sender.Contact(fakeChatId, { phone: "5211234567890" } as any);
//     }).toThrowError("Invalid contact: name and phone are required");
//   });

//   it("WhenPassingSendRawWithoutEnqueue_ShouldStillSendCorrectly", async () => {
//     await sender.Contact(fakeChatId, { name: "RawSend", phone: "5219876543210" }, { sendRawWithoutEnqueue: true });

//     expect(mockSocket.SentMessagesThroughQueue.length).toBe(0);
//     expect(mockSocket.SentMessagesThroughRaw.length).toBe(1);
//     expect(mockSocket.SentMessagesThroughRaw[0]!.content).toMatchObject({
//       contacts: {
//         displayName: "RawSend",
//       },
//     });
//   });
// });

// describe("Document", () => {
//   const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
//   const sender = new IWhatsSocket_Submodule_SugarSender(mockSocket);

//   let FS_existsSync: Mock<(typeof fs)["existsSync"]>;
//   let FS_readFileSync: Mock<(typeof fs)["readFileSync"]>;

//   beforeEach(() => {
//     mockSocket.ClearMock();
//     FS_existsSync = spyOn(fs, "existsSync");
//     FS_readFileSync = spyOn(fs, "readFileSync");
//   });

//   afterEach(() => {
//     FS_existsSync.mockClear();
//     FS_readFileSync.mockClear();
//   });

//   afterAll(() => {
//     FS_existsSync.mockRestore();
//     FS_readFileSync.mockRestore();
//   });

//   it("WhenSendingDocumentFromLocalPath_ShouldSendIt", async () => {
//     const docPath = "./real/and/valid/document.pdf";
//     const docContent = Buffer.from("DocumentContentBinaryMock");

//     FS_existsSync.mockReturnValue(true);
//     FS_readFileSync.mockReturnValue(docContent);

//     await sender.Document(fakeChatId, { displayNameFile: "document.pdf", source: docPath });

//     expect(FS_existsSync).toBeCalledTimes(1);
//     expect(FS_readFileSync).toBeCalledTimes(1);

//     expect(mockSocket.SentMessagesThroughQueue.length).toBe(1);
//     expect(mockSocket.SentMessagesThroughRaw.length).toBe(1);

//     //@ts-expect-error Content.document does exist!
//     expect(mockSocket.SentMessagesThroughRaw[0]!.content.document).toBe(docContent);
//     //@ts-expect-error Content.fileName does exist!
//     expect(mockSocket.SentMessagesThroughRaw[0]!.content.fileName).toBe("document.pdf");
//     //@ts-expect-error Content.fileName does exist!
//     console.log(mockSocket.SentMessagesThroughRaw[0]!.content.mimetype);
//   });

//   it("WhenSendingDocumentFromBuffer_ShouldSendIt", async () => {
//     const docAsBuffer = Buffer.from("BinaryMockContentForDocument");

//     await sender.Document(fakeChatId, { source: docAsBuffer, displayNameFile: "genericcontent" });

//     expect(FS_existsSync).not.toHaveBeenCalled();
//     expect(FS_readFileSync).not.toHaveBeenCalled();

//     expect(mockSocket.SentMessagesThroughQueue.length).toBe(1);
//     expect(mockSocket.SentMessagesThroughRaw.length).toBe(1);

//     expect(mockSocket.SentMessagesThroughRaw[0]!.content).toMatchObject({
//       document: docAsBuffer,
//     });
//   });

//   it("WhenFilePathDoesNotExist_ShouldThrowError", async () => {
//     const fakePath = "./not/existing/file.docx";
//     FS_existsSync.mockReturnValue(false);

//     await expect(sender.Document(fakeChatId, fakePath)).rejects.toThrowError(
//       "WhatsSocketSugarSender.Document() expected file path but doesn't exist. Given: " + fakePath
//     );

//     expect(mockSocket.SentMessagesThroughQueue.length).toBe(0);
//     expect(mockSocket.SentMessagesThroughRaw.length).toBe(0);
//   });

//   it("WhenPassingSendRawWithoutEnqueue_ShouldStillSendCorrectly", async () => {
//     const docBuffer = Buffer.from("DocBufferContentForRaw");
//     await sender.Document(fakeChatId, docBuffer, { sendRawWithoutEnqueue: true });

//     expect(mockSocket.SentMessagesThroughQueue.length).toBe(0);
//     expect(mockSocket.SentMessagesThroughRaw.length).toBe(1);

//     expect(mockSocket.SentMessagesThroughRaw[0]!.content).toMatchObject({
//       document: docBuffer,
//     });
//   });
// });
