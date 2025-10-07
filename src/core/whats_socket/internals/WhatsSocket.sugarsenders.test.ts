import { type Mock, beforeEach, describe, expect, it, spyOn } from "bun:test";
import mime from "mime";
import fs from "node:fs";
import path from "node:path";
import { afterEach } from "node:test";
import { allMockMsgs } from "src/mocks/MockManyTypesMsgs.mock";
import { Str_NormalizeLiteralString } from "../../../helpers/Strings.helper.js";
import { WhatsappGroupIdentifier, WhatsappPhoneNumberIdentifier } from "../../../Whatsapp.types.js";
import WhatsSocketMock from "../mocks/WhatsSocket.mock.js";
import type {
  WhatsMsgPollOptions,
  WhatsMsgSenderSendingOptions,
  WhatsMsgSenderSendingOptionsMINIMUM,
  WhatsMsgUbicationOptions,
} from "./IWhatsSocket.sugarsender.js";
import { WhatsSocket_Submodule_SugarSender } from "./WhatsSocket.sugarsenders.js";

//GUIDE to testing
const fakeChatId = "338839029383" + WhatsappGroupIdentifier;

// =============== Testing dependencies! ========================
let mockSocket: WhatsSocketMock;
let sender: WhatsSocket_Submodule_SugarSender;
let fs_readFileSyncSpy: Mock<typeof fs.readFileSync> = spyOn(fs, "readFileSync");
let fs_existsSync: Mock<typeof fs.existsSync> = spyOn(fs, "existsSync");
let sendSafeSpy: Mock<typeof WhatsSocketMock.prototype._SendSafe>;
let sendRawSpy: Mock<typeof WhatsSocketMock.prototype._SendRaw>;

beforeEach(() => {
  mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0, maxQueueLimit: 10 });
  sender = new WhatsSocket_Submodule_SugarSender(mockSocket);
  fs_readFileSyncSpy = spyOn(fs, "readFileSync");
  fs_existsSync = spyOn(fs, "existsSync");
  sendSafeSpy = spyOn(mockSocket, "_SendSafe");
  sendRawSpy = spyOn(mockSocket, "_SendRaw");
});

afterEach(() => {
  fs_existsSync.mockRestore();
  fs_readFileSyncSpy.mockRestore();
  sendSafeSpy.mockRestore();
  sendRawSpy.mockRestore();
});

/**
 * Test Guide
 * --- Normal usage ---
 * 1. When ideal conditions and params (simplest) (No error) / Validation socketMock receives correct type and called successfully
 * 2. When ideal conditions and params (many types of params) (No error) / Validation socketMock receives correct type and called successfully
 * -- Normal error handling ---
 * 3. When using bad the function, how to handle errors, and got correct error structure
 */

// ====================================== TEXT ===================================
describe("Text", () => {
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
    const firstParams: WhatsMsgSenderSendingOptions = {
      mentionsIds: ["idperson" + WhatsappPhoneNumberIdentifier, "idperson2" + WhatsappPhoneNumberIdentifier],
    };
    //first msg
    await sender.Text(fakeChatId, "First with params", firstParams);
    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(fakeChatId, { mentions: firstParams.mentionsIds, text: "First with params" }, firstParams);

    const secondParams: WhatsMsgSenderSendingOptions = {
      mentionsIds: ["idpeople1" + WhatsappPhoneNumberIdentifier, "idpeople2" + WhatsappPhoneNumberIdentifier],
    };
    await sender.Text(fakeChatId, "Second with params", secondParams);
    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(2);
    expect(sendSafeSpy).toHaveBeenCalledTimes(2);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(fakeChatId, { mentions: secondParams.mentionsIds, text: "Second with params" }, secondParams);
  });

  it("WhenSendingTxtMsgWithNormalizeParams_ShouldNormalizeIt", async (): Promise<void> => {
    const DESNORMALIZED_MSG: string = "             text   \n             \n\n desnormalized! \n\n    \n";

    const firstParams: WhatsMsgSenderSendingOptions = { normalizeMessageText: true };
    await sender.Text(fakeChatId, DESNORMALIZED_MSG, firstParams);
    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(fakeChatId, { mentions: undefined, text: Str_NormalizeLiteralString(DESNORMALIZED_MSG) }, firstParams);

    const secondParams: WhatsMsgSenderSendingOptions = { normalizeMessageText: false };
    await sender.Text(fakeChatId, DESNORMALIZED_MSG, secondParams);
    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(2);
    expect(sendSafeSpy).toHaveBeenCalledTimes(2);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(fakeChatId, { mentions: undefined, text: DESNORMALIZED_MSG }, secondParams);
  });

  it("WhenSendingANonStringObjInsteadOfText_ShouldThrowError", async (): Promise<void> => {
    expect(async (): Promise<void> => {
      await sender.Text(fakeChatId, { non: "text" } as unknown as string);
    }).toThrow();
  });

  it("WhenSendingAnEmptyString_ShouldThrowError", async (): Promise<void> => {
    const EMPTY_STRING = "";
    expect(async (): Promise<void> => {
      await sender.Text(fakeChatId, EMPTY_STRING);
    }).toThrow();
  });
});

// ================================= IMAGE ===================================
const DEFAULT_MIMETYPE = "application/octet-stream";
describe("Image", () => {
  //HERE START (read test guide at the start of this file!)
  it("StringPath_Simple_NoOptionsParams", async () => {
    //Prepare
    const imagePath: string = "./fakeSource.png";
    const fakeSourceImgContent: Buffer<ArrayBuffer> = Buffer.from("fakeSourceImgContent");
    // IMG FROM STRING PATH (relative or absolute)
    //1. Should verify the file exists with fs_existsSync
    fs_existsSync.mockReturnValueOnce(true);
    //2. If exists, read it and extract its content as buffer
    fs_readFileSyncSpy.mockReturnValueOnce(fakeSourceImgContent);

    //Execute
    expect(async () => {
      await sender.Image(fakeChatId, { source: imagePath });
    }).not.toThrow();

    //Assert
    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        image: fakeSourceImgContent,
        caption: undefined,
        mentions: undefined,
        mimetype: mime.getType(imagePath),
      },
      undefined /** no aditional obj with params provded */
    );
  });

  it("Buffer_WithFormatExtension_NODOT_NoOptionsParams", async (): Promise<void> => {
    //Prepare
    const imgAsBuffer: Buffer<ArrayBuffer> = Buffer.from("-------img-------");
    const fileFormatWithoutDot: string = "mp3";

    //Execute
    expect(async (): Promise<void> => {
      //Without using .mp3, using mp3 instead (ideal form)
      await sender.Image(fakeChatId, { source: imgAsBuffer, formatExtension: fileFormatWithoutDot });
    }).not.toThrow();

    //Assert
    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    //Should be sent to internal socket in this form
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        image: imgAsBuffer,
        caption: undefined,
        mentions: undefined,
        mimetype: mime.getType(fileFormatWithoutDot),
      },
      undefined
    );

    // No I/O operations should be executed at all. We're reading from ram only data (thanks to buffer)
    expect(fs_existsSync).not.toHaveBeenCalled();
    expect(fs_readFileSyncSpy).not.toHaveBeenCalled();
  });

  it("Buffer_WithformatExtension_WITHDOT_NoOptionsParams", async (): Promise<void> => {
    //Prepare
    const imgAsBuffer: Buffer<ArrayBuffer> = Buffer.from("--- img ---");
    const fileFormatWithDot = ".jpg";

    //Execute
    expect(async (): Promise<void> => {
      await sender.Image(fakeChatId, { source: imgAsBuffer, formatExtension: fileFormatWithDot });
    }).not.toThrow();

    //Assert
    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        image: imgAsBuffer,
        caption: undefined,
        mentions: undefined,
        mimetype: mime.getType(fileFormatWithDot),
      },
      undefined /** no aditional param obj provided */
    );

    //There shouldn't be any I/O operations, we're using buffers and only
    //RAM memory access.
    expect(fs_existsSync).not.toHaveBeenCalled();
    expect(fs_readFileSyncSpy).not.toHaveBeenCalled();
  });

  it("StringPath_WithFormatExtension_ShouldPrioritizeFormatExtension", async (): Promise<void> => {
    const imgContent: Buffer<ArrayBuffer> = Buffer.from("--- img ---");
    const imgNamePath: string = "./image.jpg";
    const customFormatExtension: string = ".png";

    fs_existsSync.mockReturnValueOnce(true);
    fs_readFileSyncSpy.mockReturnValueOnce(imgContent);

    expect(async (): Promise<void> => {
      await sender.Image(fakeChatId, { source: imgNamePath, formatExtension: customFormatExtension }, undefined);
    }).not.toThrow();

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        image: imgContent,
        caption: undefined,
        mentions: undefined,
        mimetype: mime.getType(customFormatExtension),
      },
      undefined /* no aditional param obj provided */
    );
  });

  it("Buffer_WithoutFormatExtension_ShouldReturnDefaultMimeType", async (): Promise<void> => {
    const imgBuffer = Buffer.from([1, 2, 3, 4]);

    await sender.Image(fakeChatId, { source: imgBuffer, formatExtension: "" }, undefined);

    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        image: imgBuffer,
        caption: undefined,
        mentions: undefined,
        mimetype: DEFAULT_MIMETYPE,
      },
      undefined /** No additional params obj provided */
    );
  });

  it("BufferAndStringPath_IfNormalizeCaptionUsed_ShouldNormalizeItWhenSent", async (): Promise<void> => {
    const imgBuffer = Buffer.from([1, 2, 3]);
    const options: WhatsMsgSenderSendingOptions = { mentionsIds: ["helloworld@id"], normalizeMessageText: false };
    await sender.Image(fakeChatId, { source: imgBuffer, formatExtension: "png", caption: "   hola mundo   " }, options);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        image: imgBuffer,
        caption: "   hola mundo   ",
        mentions: ["helloworld@id"],
        mimetype: mime.getType("png"),
      },
      options
    );

    const imgBuffer2 = Buffer.from("temp");
    const imgPath2: string = "./path/to/img.png";
    const options2: WhatsMsgSenderSendingOptions = { normalizeMessageText: true };
    fs_existsSync.mockReturnValueOnce(true);
    fs_readFileSyncSpy.mockReturnValueOnce(imgBuffer2);
    await sender.Image(fakeChatId, { source: imgPath2, caption: "   hola mundo   " }, options2);
    expect(sendSafeSpy).toHaveBeenCalledTimes(2);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        image: imgBuffer2,
        caption: "hola mundo",
        mentions: undefined,
        mimetype: mime.getType(path.basename(imgPath2)),
      },
      options2
    );
  });

  it("WhenTryingToSendANonImgFormat_ShouldThrowError", async (): Promise<void> => {
    const imgToSend: string = "./valid/non/img.pdf";
    expect(async (): Promise<void> => {
      await sender.Image(fakeChatId, { source: imgToSend });
    }).toThrow();
  });

  it("WhenSendingCorrectImgButWithNONIMAGECustomExtensionType_ShouldThro", async (): Promise<void> => {
    const imgToSend: string = "./valid/img/type.png";
    expect(async (): Promise<void> => {
      await sender.Image(fakeChatId, { source: imgToSend, formatExtension: ".pdf" });
    }).toThrow();
  });
});

describe("ReactEmojiToMsg", () => {
  it("WhenGivenIdealParams_ShouldSendItCorrectly", async () => {
    const emoji = "✨";
    let i = 0;
    for (const mockMsg of allMockMsgs) {
      await sender.ReactEmojiToMsg(fakeChatId, mockMsg, emoji);
      expect(mockSocket.SentMessagesThroughQueue[i]).toBeDefined();
      expect(mockSocket.SentMessagesThroughQueue[i]?.content).toMatchObject({
        react: {
          text: emoji,
        },
      });
      i++;
    }
  });

  it("WhenGivenEmptyString_ShouldThrowError", async () => {
    const emojiWrong = "";
    for (const mockMsg of allMockMsgs) {
      expect(async () => {
        await sender.ReactEmojiToMsg(fakeChatId, mockMsg, emojiWrong);
      }).toThrowError();
    }
  });

  it("WhenGivenTwoCharactersEmoji_ShouldAcceptIt", async () => {
    const emojis = "🦊";
    for (const mockMsg of allMockMsgs) {
      expect(async () => {
        await sender.ReactEmojiToMsg(fakeChatId, mockMsg, emojis);
      }).not.toThrowError();
    }
  });

  it("WhenGivenTwoEmojis_ShouldRejectIt", async (): Promise<void> => {
    const emojis = "😯🦊";
    for (const mockMsg of allMockMsgs) {
      expect(async () => {
        await sender.ReactEmojiToMsg(fakeChatId, mockMsg, emojis);
      }).toThrowError();
    }
  });

  it("WhenGivenCorrectLengthAndStringButNotEmoji_ShouldThrowError", async () => {
    const nonEmoji = "K";
    for (const mockMsg of allMockMsgs) {
      expect(async () => {
        await sender.ReactEmojiToMsg(fakeChatId, mockMsg, nonEmoji);
      }).toThrowError("WhatsSocketSugarSender.ReactEmojiToMsg() received a non emoji reaction. Received instead: " + nonEmoji);
    }
  });
});

// const mockDataFolderPath = Get("src", "core", "whats_socket", "internals", "mock_data");
describe("Sticker", () => {
  it("WhenSendingFromRealPath_ShouldSendItSimple", async () => {
    const stickerSource = "./real/mock/path/to/sticker.webp";
    fs_existsSync.mockReturnValueOnce(true);

    await sender.Sticker(fakeChatId, stickerSource);

    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        sticker: {
          url: stickerSource,
        },
        mentions: undefined,
      },
      undefined /** No additional params obj provided */
    );
  });

  it("WhenSendingInvalidFormat_ShouldThrowError", async () => {
    expect(async (): Promise<void> => {
      await sender.Sticker(fakeChatId, "./path/to/sticker/with/wrong/format.png");
    }).toThrow();
  });

  it("WhenSendingFromNonExistentPath_ShouldThrowError", async (): Promise<void> => {
    fs_existsSync.mockReturnValueOnce(false);
    expect(async (): Promise<void> => {
      await sender.Sticker(fakeChatId, "./path/to/non/existing/file.webp");
    }).toThrow();
  });

  it("WhenSendingFromBuffer_ShouldSendIt", async (): Promise<void> => {
    const stickerBuffer = Buffer.from([1, 2, 3]);

    await sender.Sticker(fakeChatId, stickerBuffer, undefined);

    expect(fs_existsSync).not.toHaveBeenCalled();
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenCalledWith(
      fakeChatId,
      {
        sticker: stickerBuffer,
        mentions: undefined,
      },
      undefined /** No additional options provided */
    );
  });
});

// =============================================================================================================================================
describe("Audio", () => {
  // =========== Normal usage (No errors) ====================
  it("StringPath_Simple_NoOptionsParams", async () => {
    // Prepare
    const audioPath: string = "./fakeSource.mp3";
    const fakeAudioContent: Buffer = Buffer.from("fakeAudioContent");

    fs_existsSync.mockReturnValueOnce(true);
    fs_readFileSyncSpy.mockReturnValueOnce(fakeAudioContent as any);

    // Execute
    expect(async () => {
      sender.Audio(fakeChatId, { source: audioPath });
    }).not.toThrow();

    // Assert
    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        audio: fakeAudioContent,
        mimetype: mime.getType(audioPath),
        mentions: undefined,
      },
      undefined
    );
  });

  it("Buffer_WithFormatExtension_NODOT_NoOptionsParams", async () => {
    // Prepare
    const audioBuffer: Buffer = Buffer.from("audio buffer content");
    const formatExtension = "mp3";

    // Execute
    expect(async () => {
      sender.Audio(fakeChatId, { source: audioBuffer, formatExtension });
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        audio: audioBuffer,
        mimetype: mime.getType(formatExtension),
        mentions: undefined,
      },
      undefined
    );

    // No I/O operations should be executed
    expect(fs_existsSync).not.toHaveBeenCalled();
    expect(fs_readFileSyncSpy).not.toHaveBeenCalled();
  });

  it("Buffer_WithFormatExtension_WITHDOT_NoOptionsParams", async () => {
    // Prepare
    const audioBuffer: Buffer = Buffer.from("audio buffer content");
    const formatExtension = ".m4a";

    // Execute
    expect(async (): Promise<void> => {
      sender.Audio(fakeChatId, { source: audioBuffer, formatExtension });
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        audio: audioBuffer,
        mimetype: mime.getType(formatExtension),
        mentions: undefined,
      },
      undefined
    );

    // No I/O operations
    expect(fs_existsSync).not.toHaveBeenCalled();
    expect(fs_readFileSyncSpy).not.toHaveBeenCalled();
  });

  it("StringPath_WithFormatExtension_ShouldPrioritizeFormatExtension", async () => {
    // Prepare
    const audioPath: string = "./audio.wav";
    const customFormatExtension = "mp3";
    const fakeAudioContent: Buffer = Buffer.from("fake audio content");

    fs_existsSync.mockReturnValueOnce(true);
    fs_readFileSyncSpy.mockReturnValueOnce(fakeAudioContent as any);

    // Execute
    expect(async () => {
      await sender.Audio(fakeChatId, {
        source: audioPath,
        formatExtension: customFormatExtension,
      });
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        audio: fakeAudioContent,
        mimetype: mime.getType(customFormatExtension),
        mentions: undefined,
      },
      undefined
    );
  });

  it("WithMentionsOptions_ShouldIncludeMentions", async () => {
    // Prepare
    const audioBuffer: Buffer = Buffer.from("audio content");
    const formatExtension = "ogg";
    const options = {
      mentionsIds: ["user1" + WhatsappPhoneNumberIdentifier, "user2" + WhatsappPhoneNumberIdentifier],
    };

    // Execute
    expect(async () => {
      sender.Audio(
        fakeChatId,
        {
          source: audioBuffer,
          formatExtension,
        },
        options
      );
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        audio: audioBuffer,
        mimetype: mime.getType(formatExtension),
        mentions: options.mentionsIds,
      },
      options
    );
  });

  // =========== Error handling ====================
  it("StringPath_NonExistentFile_ShouldThrowError", async () => {
    // Prepare
    const nonExistentPath = "./non/existent/file.mp3";
    fs_existsSync.mockReturnValueOnce(false);

    // Execute & Assert
    await expect(sender.Audio(fakeChatId, { source: nonExistentPath })).rejects.toThrow(
      "Bad arguments: WhatsSocketSugarSender tried to send an img with incorrect path!"
    );
  });

  it("Buffer_WithoutFormatExtension_ShouldThrowError", async () => {
    // Prepare
    const audioBuffer: Buffer = Buffer.from("audio content");

    // Execute & Assert
    await expect(sender.Audio(fakeChatId, { source: audioBuffer } as any)).rejects.toThrow(
      "SugarSender.Audio bad args, expected audio source in buffer or stringpath format"
    );
  });

  it("StringPath_NonAudioFile_ShouldThrowError", async () => {
    // Prepare
    const nonAudioPath = "./file.txt";
    fs_existsSync.mockReturnValueOnce(true);

    // Execute & Assert
    await expect(sender.Audio(fakeChatId, { source: nonAudioPath })).rejects.toThrow(
      "Bad arguments: WhatsSocketSugarSender.Audio() received a non audio file to send"
    );
  });

  it("StringPath_WithNonAudioFormatExtension_ShouldThrowError", async () => {
    // Prepare
    const audioPath = "./audio.mp3";
    const nonAudioExtension = "txt";
    fs_existsSync.mockReturnValueOnce(true);

    // Execute & Assert
    await expect(
      sender.Audio(fakeChatId, {
        source: audioPath,
        formatExtension: nonAudioExtension,
      })
    ).rejects.toThrow("Bad arguments: WhatsSocketSugarSender.Audio() received a non audio custom extension");
  });

  it("Buffer_WithNonAudioFormatExtension_ShouldThrowError", async () => {
    // Prepare
    const audioBuffer: Buffer = Buffer.from("audio content");
    const nonAudioExtension = "pdf";

    // Execute & Assert
    expect(async () => {
      await sender.Audio(fakeChatId, {
        source: audioBuffer,
        formatExtension: nonAudioExtension,
      });
    }).toThrow();
  });

  it("InvalidSourceType_ShouldThrowError", async () => {
    // Prepare
    const invalidSource = 12345;

    // Execute & Assert
    await expect(sender.Audio(fakeChatId, { source: invalidSource as any })).rejects.toThrow(
      "SugarSender.Audio bad args, expected audio source in buffer or stringpath format"
    );
  });

  // =========== Edge cases ====================
  it("MultipleFormats_ShouldHandleDifferentAudioTypes", async () => {
    const formats = ["mp3", "ogg", "m4a", "wav", "flac"];

    for (const format of formats) {
      const audioBuffer: Buffer = Buffer.from(`audio content for ${format}`);

      expect(async () => {
        await sender.Audio(fakeChatId, {
          source: audioBuffer,
          formatExtension: format,
        });
      }).not.toThrow();

      expect(sendSafeSpy).toHaveBeenCalledWith(
        fakeChatId,
        {
          audio: audioBuffer,
          mimetype: mime.getType(format),
          mentions: undefined,
        },
        undefined
      );
    }

    expect(sendSafeSpy).toHaveBeenCalledTimes(formats.length);
  });

  it("WithSendRawWithoutEnqueueOption_ShouldPassThrough", async () => {
    // Prepare
    const audioBuffer: Buffer = Buffer.from("audio content");
    const formatExtension = "mp3";
    const options = {
      sendRawWithoutEnqueue: true,
    };

    // Execute
    expect(async () => {
      await sender.Audio(
        fakeChatId,
        {
          source: audioBuffer,
          formatExtension,
        },
        options
      );
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(0);
    expect(sendRawSpy).toHaveBeenCalledTimes(1);
    expect(sendRawSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        audio: audioBuffer,
        mimetype: mime.getType(formatExtension),
        mentions: undefined,
      },
      options
    );
  });
});

describe("Video", () => {
  // =========== Normal usage (No errors) ====================
  it("StringPath_Simple_NoOptionsParams", async () => {
    // Prepare
    const videoPath: string = "./fakeSource.mp4";
    const fakeVideoContent: Buffer = Buffer.from("fakeVideoContent");

    fs_existsSync.mockReturnValueOnce(true);
    fs_readFileSyncSpy.mockReturnValueOnce(fakeVideoContent as any);

    // Execute
    expect(async () => {
      await sender.Video(fakeChatId, { source: videoPath });
    }).not.toThrow();

    // Assert
    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        video: fakeVideoContent,
        caption: "",
        mimetype: mime.getType(videoPath),
        mentions: undefined,
      },
      undefined
    );
  });

  it("StringPath_WithCaption_NoOptionsParams", async () => {
    // Prepare
    const videoPath: string = "./fakeSource.mov";
    const caption = "This is a video caption";
    const fakeVideoContent: Buffer = Buffer.from("fakeVideoContent");

    fs_existsSync.mockReturnValueOnce(true);
    fs_readFileSyncSpy.mockReturnValueOnce(fakeVideoContent as any);

    // Execute
    expect(async () => {
      await sender.Video(fakeChatId, { source: videoPath, caption });
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        video: fakeVideoContent,
        caption: caption,
        mimetype: mime.getType(videoPath),
        mentions: undefined,
      },
      undefined
    );
  });

  it("Buffer_WithFormatExtension_NODOT_NoOptionsParams", async () => {
    // Prepare
    const videoBuffer: Buffer = Buffer.from("video buffer content");
    const formatExtension = "mp4";

    // Execute
    expect(async () => {
      await sender.Video(fakeChatId, { source: videoBuffer, formatExtension });
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        video: videoBuffer,
        caption: "",
        mimetype: mime.getType(formatExtension),
        mentions: undefined,
      },
      undefined
    );

    // No I/O operations should be executed
    expect(fs_existsSync).not.toHaveBeenCalled();
    expect(fs_readFileSyncSpy).not.toHaveBeenCalled();
  });

  it("Buffer_WithFormatExtension_WITHDOT_NoOptionsParams", async () => {
    // Prepare
    const videoBuffer: Buffer = Buffer.from("video buffer content");
    const formatExtension = ".mov";

    // Execute
    expect(async () => {
      await sender.Video(fakeChatId, { source: videoBuffer, formatExtension });
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        video: videoBuffer,
        caption: "",
        mimetype: mime.getType(formatExtension),
        mentions: undefined,
      },
      undefined
    );

    // No I/O operations
    expect(fs_existsSync).not.toHaveBeenCalled();
    expect(fs_readFileSyncSpy).not.toHaveBeenCalled();
  });

  it("StringPath_WithFormatExtension_ShouldPrioritizeFormatExtension", async () => {
    // Prepare
    const videoPath: string = "./video.avi";
    const customFormatExtension = "mp4";
    const fakeVideoContent: Buffer = Buffer.from("fake video content");

    fs_existsSync.mockReturnValueOnce(true);
    fs_readFileSyncSpy.mockReturnValueOnce(fakeVideoContent as any);

    // Execute
    expect(async () => {
      await sender.Video(fakeChatId, {
        source: videoPath,
        formatExtension: customFormatExtension,
      });
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        video: fakeVideoContent,
        caption: "",
        mimetype: mime.getType(customFormatExtension),
        mentions: undefined,
      },
      undefined
    );
  });

  it("WithMentionsOptions_ShouldIncludeMentions", async () => {
    // Prepare
    const videoBuffer: Buffer = Buffer.from("video content");
    const formatExtension = "mov";
    const options = {
      mentionsIds: ["user1" + WhatsappPhoneNumberIdentifier, "user2" + WhatsappPhoneNumberIdentifier],
    };

    // Execute
    expect(async () => {
      await sender.Video(
        fakeChatId,
        {
          source: videoBuffer,
          formatExtension,
        },
        options
      );
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        video: videoBuffer,
        caption: "",
        mimetype: mime.getType(formatExtension),
        mentions: options.mentionsIds,
      },
      options
    );
  });

  it("WithNormalizeCaptionOption_ShouldNormalizeCaption", async () => {
    // Prepare
    const videoBuffer: Buffer = Buffer.from("video content");
    const formatExtension = "mp4";
    const caption = "   unnormalized   caption   ";
    const options = {
      normalizeMessageText: true,
    };

    // Execute
    expect(async () => {
      await sender.Video(
        fakeChatId,
        {
          source: videoBuffer,
          formatExtension,
          caption,
        },
        options
      );
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        video: videoBuffer,
        caption: Str_NormalizeLiteralString(caption),
        mimetype: mime.getType(formatExtension),
        mentions: undefined,
      },
      options
    );
  });

  it("WithNormalizeCaptionOptionFalse_ShouldNotNormalizeCaption", async () => {
    // Prepare
    const videoBuffer: Buffer = Buffer.from("video content");
    const formatExtension = "mp4";
    const caption = "   unnormalized   caption   ";
    const options = {
      normalizeMessageText: false,
    };

    // Execute
    expect(async () => {
      await sender.Video(
        fakeChatId,
        {
          source: videoBuffer,
          formatExtension,
          caption,
        },
        options
      );
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        video: videoBuffer,
        caption: caption,
        mimetype: mime.getType(formatExtension),
        mentions: undefined,
      },
      options
    );
  });

  // =========== Error handling ====================
  it("StringPath_NonExistentFile_ShouldThrowError", async () => {
    const nonExistentPath = "./non/existent/file.mp4";

    // Spy correctly
    const existsSpy = spyOn(fs, "existsSync").mockReturnValue(false);
    expect(sender.Video(fakeChatId, { source: nonExistentPath })).rejects.toThrow();
    // Restore after test (optional, but good practice)
    existsSpy.mockRestore();
  });

  it("Buffer_WithoutFormatExtension_ShouldThrowError", async () => {
    // Prepare
    const videoBuffer: Buffer = Buffer.from("video content");

    // Execute & Assert
    await expect(sender.Video(fakeChatId, { source: videoBuffer } as any)).rejects.toThrow(
      "SugarSender.Video bad args, expected video source in buffer or stringpath format"
    );
  });

  it("StringPath_NonVideoFile_ShouldThrowError", async () => {
    // Prepare
    const nonVideoPath = "./file.txt";
    fs_existsSync.mockReturnValueOnce(true);

    // Execute & Assert
    await expect(sender.Video(fakeChatId, { source: nonVideoPath })).rejects.toThrow("Bad args: WhatsSugarSender.Video() received a non video file to send");
  });

  it("StringPath_WithNonVideoFormatExtension_ShouldThrowError", async () => {
    // Prepare
    const videoPath = "./video.mp4";
    const nonVideoExtension = "txt";
    fs_existsSync.mockReturnValueOnce(true);

    // Execute & Assert
    await expect(
      sender.Video(fakeChatId, {
        source: videoPath,
        formatExtension: nonVideoExtension,
      })
    ).rejects.toThrow("Bad args: WhatsSugarSender.Video() received a NON custom video file format");
  });

  it("Buffer_WithNonVideoFormatExtension_ShouldThrowError", async () => {
    // Prepare
    const videoBuffer: Buffer = Buffer.from("video content");
    const nonVideoExtension = "pdf";

    // Execute & Assert
    expect(async () => {
      await sender.Video(fakeChatId, {
        source: videoBuffer,
        formatExtension: nonVideoExtension,
      });
    }).toThrow();
  });

  it("InvalidSourceType_ShouldThrowError", async () => {
    // Prepare
    const invalidSource = 12345;

    // Execute & Assert
    await expect(sender.Video(fakeChatId, { source: invalidSource as any })).rejects.toThrow(
      "SugarSender.Video bad args, expected video source in buffer or stringpath format"
    );
  });

  // =========== Edge cases ====================
  it("MultipleFormats_ShouldHandleDifferentVideoTypes", async () => {
    const formats = ["mp4", "mov", "avi", "webm", "mkv"];

    for (const format of formats) {
      const videoBuffer: Buffer = Buffer.from(`video content for ${format}`);

      expect(async () => {
        await sender.Video(fakeChatId, {
          source: videoBuffer,
          formatExtension: format,
        });
      }).not.toThrow();

      expect(sendSafeSpy).toHaveBeenCalledWith(
        fakeChatId,
        {
          video: videoBuffer,
          caption: "",
          mimetype: mime.getType(format),
          mentions: undefined,
        },
        undefined
      );
    }

    expect(sendSafeSpy).toHaveBeenCalledTimes(formats.length);
  });

  it("WithSendRawWithoutEnqueueOption_ShouldUseSendRaw", async () => {
    // Prepare
    const videoBuffer: Buffer = Buffer.from("video content");
    const formatExtension = "mp4";
    const options = {
      sendRawWithoutEnqueue: true,
    };

    // Execute
    expect(async () => {
      await sender.Video(
        fakeChatId,
        {
          source: videoBuffer,
          formatExtension,
        },
        options
      );
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(0);
    expect(sendRawSpy).toHaveBeenCalledTimes(1);
    expect(sendRawSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        video: videoBuffer,
        caption: "",
        mimetype: mime.getType(formatExtension),
        mentions: undefined,
      },
      options
    );
  });

  it("WithoutCaption_ShouldSendEmptyString", async () => {
    // Prepare
    const videoBuffer: Buffer = Buffer.from("video content");
    const formatExtension = "mp4";

    // Execute
    expect(async () => {
      await sender.Video(fakeChatId, {
        source: videoBuffer,
        formatExtension,
      });
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        video: videoBuffer,
        caption: "",
        mimetype: mime.getType(formatExtension),
        mentions: undefined,
      },
      undefined
    );
  });
});

describe("Document", () => {
  // =========== Normal usage (No errors) ====================
  it("StringPath_Simple_NoOptionsParams", async () => {
    // Prepare
    const docPath: string = "./fakeSource.pdf";
    const fakeDocContent: Buffer = Buffer.from("fakeDocContent");
    const expectedFileName = path.basename(docPath);

    fs_existsSync.mockReturnValueOnce(true);
    fs_readFileSyncSpy.mockReturnValueOnce(fakeDocContent as any);

    // Execute
    expect(async () => {
      await sender.Document(fakeChatId, { source: docPath });
    }).not.toThrow();

    // Assert
    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        document: fakeDocContent,
        mimetype: mime.getType(docPath),
        fileName: expectedFileName,
        mentions: undefined,
      },
      undefined
    );
  });

  it("StringPath_WithCustomDisplayName_ShouldUseCustomName", async () => {
    // Prepare
    const docPath: string = "./fakeSource.pdf";
    const customDisplayName = "custom-name.pdf";
    const fakeDocContent: Buffer = Buffer.from("fakeDocContent");

    fs_existsSync.mockReturnValueOnce(true);
    fs_readFileSyncSpy.mockReturnValueOnce(fakeDocContent as any);

    // Execute
    expect(async () => {
      await sender.Document(fakeChatId, {
        source: docPath,
        fileNameToDisplay: customDisplayName,
      });
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        document: fakeDocContent,
        mimetype: mime.getType(docPath),
        fileName: customDisplayName,
        mentions: undefined,
      },
      undefined
    );
  });

  it("Buffer_WithFormatExtension_NoOptionsParams", async () => {
    // Prepare
    const docBuffer: Buffer = Buffer.from("document buffer content");
    const formatExtension = "pdf";
    const fileNameWithoutExtension = "document";
    const expectedFileName = "document.pdf";

    // Execute
    expect(async () => {
      await sender.Document(fakeChatId, {
        source: docBuffer,
        formatExtension,
        fileNameWithoutExtension,
      });
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        document: docBuffer,
        mimetype: mime.getType(formatExtension),
        fileName: expectedFileName,
        mentions: undefined,
      },
      undefined
    );

    // No I/O operations should be executed
    expect(fs_existsSync).not.toHaveBeenCalled();
    expect(fs_readFileSyncSpy).not.toHaveBeenCalled();
  });

  it("Buffer_WithFormatExtensionWithDot_ShouldRemoveDot", async () => {
    // Prepare
    const docBuffer: Buffer = Buffer.from("document buffer content");
    const formatExtension = ".pdf";
    const fileNameWithoutExtension = "document";
    const expectedFileName = "document.pdf";

    // Execute
    expect(async () => {
      await sender.Document(fakeChatId, {
        source: docBuffer,
        formatExtension,
        fileNameWithoutExtension,
      });
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        document: docBuffer,
        mimetype: mime.getType(formatExtension),
        fileName: expectedFileName,
        mentions: undefined,
      },
      undefined
    );

    // No I/O operations
    expect(fs_existsSync).not.toHaveBeenCalled();
    expect(fs_readFileSyncSpy).not.toHaveBeenCalled();
  });

  it("WithMentionsOptions_ShouldIncludeMentions", async () => {
    // Prepare
    const docBuffer: Buffer = Buffer.from("document content");
    const formatExtension = "pdf";
    const fileNameWithoutExtension = "report";
    const options = {
      mentionsIds: ["user1" + WhatsappPhoneNumberIdentifier, "user2" + WhatsappPhoneNumberIdentifier],
    };

    // Execute
    expect(async () => {
      await sender.Document(
        fakeChatId,
        {
          source: docBuffer,
          formatExtension,
          fileNameWithoutExtension,
        },
        options
      );
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        document: docBuffer,
        mimetype: mime.getType(formatExtension),
        fileName: "report.pdf",
        mentions: options.mentionsIds,
      },
      options
    );
  });

  it("StringPath_WithSendRawWithoutEnqueueOption_ShouldUseSendRaw", async () => {
    // Prepare
    const docPath: string = "./document.zip";
    const fakeDocContent: Buffer = Buffer.from("fake zip content");
    const expectedFileName = path.basename(docPath);
    const options = {
      sendRawWithoutEnqueue: true,
    };

    fs_existsSync.mockReturnValueOnce(true);
    fs_readFileSyncSpy.mockReturnValueOnce(fakeDocContent as any);

    // Execute
    expect(async () => {
      await sender.Document(fakeChatId, { source: docPath }, options);
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(0);
    expect(sendRawSpy).toHaveBeenCalledTimes(1);
    expect(sendRawSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        document: fakeDocContent,
        mimetype: mime.getType(docPath),
        fileName: expectedFileName,
        mentions: undefined,
      },
      options
    );
  });

  // =========== Error handling ====================
  it("StringPath_NonExistentFile_ShouldThrowError", async () => {
    // Prepare
    const nonExistentPath = "./non/existent/file.pdf";
    fs_existsSync.mockReturnValueOnce(false);

    // Execute & Assert
    await expect(sender.Document(fakeChatId, { source: nonExistentPath })).rejects.toThrow("SugarSender.Document(), received path document");
  });

  it("Buffer_WithoutFormatExtension_ShouldThrowError", async () => {
    // Prepare
    const docBuffer: Buffer = Buffer.from("document content");

    // Execute & Assert
    await expect(sender.Document(fakeChatId, { source: docBuffer } as any)).rejects.toThrow(
      "SugarSender.Document bad args, expected document source in buffer or stringpath format"
    );
  });

  it("Buffer_WithoutFileNameWithoutExtension_ShouldThrowError", async () => {
    // Prepare
    const docBuffer: Buffer = Buffer.from("document content");
    const formatExtension = "pdf";

    // Execute & Assert
    expect(async () => {
      sender.Document(fakeChatId, {
        source: docBuffer,
        formatExtension,
      } as any);
    }).not.toThrow("SugarSender.Document bad args, expected document source in buffer or stringpath format");
  });

  it("InvalidSourceType_ShouldThrowError", async () => {
    // Prepare
    const invalidSource = 12345;

    // Execute & Assert
    await expect(sender.Document(fakeChatId, { source: invalidSource as any })).rejects.toThrow(
      "SugarSender.Document bad args, expected document source in buffer or stringpath format"
    );
  });

  // =========== Edge cases ====================
  it("MultipleDocumentTypes_ShouldHandleDifferentFormats", async () => {
    const formats = ["pdf", "docx", "xlsx", "zip", "txt"];

    for (const format of formats) {
      const docBuffer: Buffer = Buffer.from(`document content for ${format}`);
      const fileNameWithoutExtension = `file_${format}`;

      expect(async () => {
        await sender.Document(fakeChatId, {
          source: docBuffer,
          formatExtension: format,
          fileNameWithoutExtension,
        });
      }).not.toThrow();

      expect(sendSafeSpy).toHaveBeenCalledWith(
        fakeChatId,
        {
          document: docBuffer,
          mimetype: mime.getType(format),
          fileName: `${fileNameWithoutExtension}.${format}`,
          mentions: undefined,
        },
        undefined
      );
    }

    expect(sendSafeSpy).toHaveBeenCalledTimes(formats.length);
  });

  it("StringPath_EmptyFileNameToDisplay_ShouldUseBasename", async () => {
    // Prepare
    const docPath: string = "./path/to/document.pdf";
    const fakeDocContent: Buffer = Buffer.from("fake content");
    const expectedFileName = path.basename(docPath);

    fs_existsSync.mockReturnValueOnce(true);
    fs_readFileSyncSpy.mockReturnValueOnce(fakeDocContent as any);

    // Execute
    expect(async () => {
      await sender.Document(fakeChatId, {
        source: docPath,
        fileNameToDisplay: "",
      });
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        document: fakeDocContent,
        mimetype: mime.getType(docPath),
        fileName: expectedFileName,
        mentions: undefined,
      },
      undefined
    );
  });

  it("Buffer_ComplexFileNameConstruction_ShouldWorkCorrectly", async () => {
    // Prepare
    const docBuffer: Buffer = Buffer.from("complex document content");
    const formatExtension = "docx";
    const fileNameWithoutExtension = "report_final_version";
    const expectedFileName = "report_final_version.docx";

    // Execute
    expect(async () => {
      await sender.Document(fakeChatId, {
        source: docBuffer,
        formatExtension,
        fileNameWithoutExtension,
      });
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        document: docBuffer,
        mimetype: mime.getType(formatExtension),
        fileName: expectedFileName,
        mentions: undefined,
      },
      undefined
    );
  });

  it("StringPath_WithUndefinedFileNameToDisplay_ShouldUseBasename", async () => {
    // Prepare
    const docPath: string = "./documents/contract.docx";
    const fakeDocContent: Buffer = Buffer.from("contract content");
    const expectedFileName = path.basename(docPath);

    fs_existsSync.mockReturnValueOnce(true);
    fs_readFileSyncSpy.mockReturnValueOnce(fakeDocContent as any);

    // Execute
    expect(async () => {
      await sender.Document(fakeChatId, {
        source: docPath,
        fileNameToDisplay: undefined,
      });
    }).not.toThrow();

    // Assert
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        document: fakeDocContent,
        mimetype: mime.getType(docPath),
        fileName: expectedFileName,
        mentions: undefined,
      },
      undefined
    );
  });
});

describe("Poll", () => {
  let mockSocket: WhatsSocketMock;
  let sender: WhatsSocket_Submodule_SugarSender;
  let sendSafeSpy: Mock<typeof WhatsSocketMock.prototype._SendSafe>;

  beforeEach(() => {
    mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0, maxQueueLimit: 10 });
    sender = new WhatsSocket_Submodule_SugarSender(mockSocket);
    sendSafeSpy = spyOn(mockSocket, "_SendSafe");
  });

  afterEach(() => {
    sendSafeSpy.mockRestore();
  });

  // Normal usage (No errors)
  it("WhenSendingSimplestPollWithSingleSelect_ShouldSendIt", async () => {
    const pollTitle = "Favorite Color";
    const selections = ["Red", "Blue", "Green"];
    const pollParams: WhatsMsgPollOptions = { withMultiSelect: false };

    await sender.Poll(fakeChatId, pollTitle, selections, pollParams);

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        poll: {
          name: pollTitle,
          values: selections,
          selectableCount: 3,
        },
        mentions: undefined,
      },
      undefined
    );
  });

  it("WhenSendingSimplestPollWithMultiSelect_ShouldSendIt", async () => {
    const pollTitle = "Favorite Hobbies";
    const selections = ["Reading", "Gaming", "Sports"];
    const pollParams: WhatsMsgPollOptions = { withMultiSelect: true };

    await sender.Poll(fakeChatId, pollTitle, selections, pollParams);

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        poll: {
          name: pollTitle,
          values: selections,
          selectableCount: 3,
        },
        mentions: undefined,
      },
      undefined
    );
  });

  it("WhenSendingPollWithAdditionalParams_ShouldSendIt", async () => {
    const pollTitle = "Best Food";
    const selections = ["Pizza", "Burger", "Salad"];
    const pollParams: WhatsMsgPollOptions = {
      withMultiSelect: true,
      normalizeTitleText: false,
      normalizeOptionsText: false,
    };
    const moreOptions: WhatsMsgSenderSendingOptions = {
      mentionsIds: ["idperson1" + WhatsappGroupIdentifier, "idperson2" + WhatsappGroupIdentifier],
    };

    await sender.Poll(fakeChatId, pollTitle, selections, pollParams, moreOptions);

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        poll: {
          name: pollTitle,
          values: selections,
          selectableCount: 3,
        },
        mentions: moreOptions.mentionsIds,
      },
      moreOptions
    );
  });

  it("WhenSendingPollWithNormalizeParams_ShouldNormalizeTitleAndOptions", async () => {
    const pollTitle = "   Favorite  \n Game   ";
    const selections = ["  Chess  \n", "\n  Checkers  ", "   Go   \n"];
    const pollParams: WhatsMsgPollOptions = {
      withMultiSelect: false,
      normalizeTitleText: true,
      normalizeOptionsText: true,
    };

    await sender.Poll(fakeChatId, pollTitle, selections, pollParams);

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        poll: {
          name: Str_NormalizeLiteralString(pollTitle),
          values: selections.map((opt) => Str_NormalizeLiteralString(opt)),
          selectableCount: 3,
        },
        mentions: undefined,
      },
      undefined
    );
  });

  // Error handling
  it("WhenSendingPollWithNoSelections_ShouldThrowError", async () => {
    const pollTitle = "Test Poll";
    const selections: string[] = [];
    const pollParams: WhatsMsgPollOptions = { withMultiSelect: false };

    await expect(async () => {
      await sender.Poll(fakeChatId, pollTitle, selections, pollParams);
    }).toThrow("WhatsSocketSugarSender.Poll() received less than 1 options or greather than 12, must be in range 1-12. Received: 0 options...");
  });

  it("WhenSendingPollWithMoreThan12Selections_ShouldThrowError", async () => {
    const pollTitle = "Test Poll";
    const selections = Array(13)
      .fill("Option")
      .map((opt, i) => `${opt} ${i + 1}`);
    const pollParams: WhatsMsgPollOptions = { withMultiSelect: true };

    await expect(async () => {
      await sender.Poll(fakeChatId, pollTitle, selections, pollParams);
    }).toThrow("WhatsSocketSugarSender.Poll() received less than 1 options or greather than 12, must be in range 1-12. Received: 13 options...");
  });

  it("WhenSendingPollWithEmptyTitle_ShouldNotThrowError", async () => {
    const pollTitle = "";
    const selections = ["Option 1", "Option 2"];
    const pollParams: WhatsMsgPollOptions = { withMultiSelect: false };

    await expect(async () => {
      await sender.Poll(fakeChatId, pollTitle, selections, pollParams);
    }).not.toThrow();

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        poll: {
          name: "",
          values: selections,
          selectableCount: 2, // Single select
        },
        mentions: undefined,
      },
      undefined
    );
  });

  it("WhenSendingPollWithEmptySelections_ShouldThrowError", async () => {
    const pollTitle = "Test Poll";
    const selections = ["Option 1", ""];
    const pollParams: WhatsMsgPollOptions = { withMultiSelect: true };

    await expect(async () => {
      await sender.Poll(fakeChatId, pollTitle, selections, pollParams);
    }).toThrow();

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(0);

    expect(sendSafeSpy).toHaveBeenCalledTimes(0);
  });
});

describe("Location", () => {
  let mockSocket: WhatsSocketMock;
  let sender: WhatsSocket_Submodule_SugarSender;
  let sendSafeSpy: Mock<typeof WhatsSocketMock.prototype._SendSafe>;
  let sendRawSpy: Mock<typeof WhatsSocketMock.prototype._SendRaw>;

  beforeEach(() => {
    mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0, maxQueueLimit: 10 });
    sender = new WhatsSocket_Submodule_SugarSender(mockSocket);
    sendSafeSpy = spyOn(mockSocket, "_SendSafe");
    sendRawSpy = spyOn(mockSocket, "_SendRaw");
  });

  afterEach(() => {
    sendSafeSpy.mockRestore();
    sendRawSpy.mockRestore();
  });

  // Normal usage (No errors)
  it("WhenSendingSimplestLocation_ShouldSendIt", async () => {
    const ubicationParams: WhatsMsgUbicationOptions = {
      degreesLatitude: 40.7128,
      degreesLongitude: -74.006,
    };

    await sender.Location(fakeChatId, ubicationParams);

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        location: {
          degreesLatitude: 40.7128,
          degreesLongitude: -74.006,
          name: undefined,
          address: undefined,
        },
        mentions: undefined,
      },
      undefined
    );
    expect(sendRawSpy).not.toHaveBeenCalled();
  });

  it("WhenSendingLocationWithAllParams_ShouldSendIt", async () => {
    const ubicationParams: WhatsMsgUbicationOptions = {
      degreesLatitude: 51.5074,
      degreesLongitude: -0.1278,
      name: "Big Ben",
      addressText: "Westminster, London",
    };
    const options: WhatsMsgSenderSendingOptionsMINIMUM = {
      mentionsIds: ["idperson1" + WhatsappGroupIdentifier, "idperson2" + WhatsappGroupIdentifier],
      sendRawWithoutEnqueue: false,
    };

    await sender.Location(fakeChatId, ubicationParams, options);

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        location: {
          degreesLatitude: 51.5074,
          degreesLongitude: -0.1278,
          name: "Big Ben",
          address: "Westminster, London",
        },
        mentions: options.mentionsIds,
      },
      options
    );
    expect(sendRawSpy).not.toHaveBeenCalled();
  });

  it("WhenSendingLocationWithSendRawWithoutEnqueue_ShouldUseRawSend", async () => {
    const ubicationParams: WhatsMsgUbicationOptions = {
      degreesLatitude: 34.0522,
      degreesLongitude: -118.2437,
      name: "Los Angeles",
    };
    const options: WhatsMsgSenderSendingOptionsMINIMUM = {
      sendRawWithoutEnqueue: true,
    };

    await sender.Location(fakeChatId, ubicationParams, options);

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(0); // Raw send bypasses queue
    expect(sendSafeSpy).not.toHaveBeenCalled();
    expect(sendRawSpy).toHaveBeenCalledTimes(1);
    expect(sendRawSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        location: {
          degreesLatitude: 34.0522,
          degreesLongitude: -118.2437,
          name: "Los Angeles",
          address: undefined,
        },
        mentions: undefined,
      },
      options
    );
  });

  it("WhenSendingLocationWithMiscOptions_ShouldPassThemThrough", async () => {
    const ubicationParams: WhatsMsgUbicationOptions = {
      degreesLatitude: -33.8688,
      degreesLongitude: 151.2093,
    };
    const options: WhatsMsgSenderSendingOptionsMINIMUM = {
      mentionsIds: ["idperson1" + WhatsappGroupIdentifier],
      timestamp: new Date("2025-09-17T15:00:00Z"),
      ephemeralExpiration: 86400,
    };

    await sender.Location(fakeChatId, ubicationParams, options);

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        location: {
          degreesLatitude: -33.8688,
          degreesLongitude: 151.2093,
          name: undefined,
          address: undefined,
        },
        mentions: options.mentionsIds,
      },
      options
    );
    expect(sendRawSpy).not.toHaveBeenCalled();
  });

  // Error handling
  it("WhenSendingLocationWithInvalidLatitude_ShouldThrowError", async () => {
    const ubicationParams: WhatsMsgUbicationOptions = {
      degreesLatitude: 91, // Invalid latitude
      degreesLongitude: 0,
    };

    await expect(async () => {
      await sender.Location(fakeChatId, ubicationParams);
    }).toThrow(
      `WhatsSocketSugarSender.Ubication() => Invalid coordinates: (${ubicationParams.degreesLatitude}, ${ubicationParams.degreesLongitude}).Latitude must be between -90 and 90, longitude between -180 and 180.`
    );

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(0);
    expect(sendSafeSpy).not.toHaveBeenCalled();
    expect(sendRawSpy).not.toHaveBeenCalled();
  });

  it("WhenSendingLocationWithInvalidLongitude_ShouldThrowError", async () => {
    const ubicationParams: WhatsMsgUbicationOptions = {
      degreesLatitude: 0,
      degreesLongitude: -181, // Invalid longitude
    };

    await expect(async () => {
      await sender.Location(fakeChatId, ubicationParams);
    }).toThrow(
      `WhatsSocketSugarSender.Ubication() => Invalid coordinates: (${ubicationParams.degreesLatitude}, ${ubicationParams.degreesLongitude}).Latitude must be between -90 and 90, longitude between -180 and 180.`
    );

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(0);
    expect(sendSafeSpy).not.toHaveBeenCalled();
    expect(sendRawSpy).not.toHaveBeenCalled();
  });

  it("WhenSendingLocationWithNonNumericLatitude_ShouldThrowError", async () => {
    const ubicationParams: WhatsMsgUbicationOptions = {
      degreesLatitude: "invalid" as any, // Non-numeric latitude
      degreesLongitude: 0,
    };

    await expect(async () => {
      await sender.Location(fakeChatId, ubicationParams);
    }).toThrow(
      `WhatsSocketSugarSender.Ubication() => Invalid coordinates: (${ubicationParams.degreesLatitude}, ${ubicationParams.degreesLongitude}).Latitude must be between -90 and 90, longitude between -180 and 180.`
    );

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(0);
    expect(sendSafeSpy).not.toHaveBeenCalled();
    expect(sendRawSpy).not.toHaveBeenCalled();
  });

  it("WhenSendingLocationWithNonNumericLongitude_ShouldThrowError", async () => {
    const ubicationParams: WhatsMsgUbicationOptions = {
      degreesLatitude: 0,
      degreesLongitude: null as any, // Non-numeric longitude
    };

    await expect(async () => {
      await sender.Location(fakeChatId, ubicationParams);
    }).toThrow(
      `WhatsSocketSugarSender.Ubication() => Invalid coordinates: (${ubicationParams.degreesLatitude}, ${ubicationParams.degreesLongitude}).Latitude must be between -90 and 90, longitude between -180 and 180.`
    );

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(0);
    expect(sendSafeSpy).not.toHaveBeenCalled();
    expect(sendRawSpy).not.toHaveBeenCalled();
  });

  it("WhenSendingLocationWithEdgeCaseCoordinates_ShouldSendIt", async () => {
    const ubicationParams: WhatsMsgUbicationOptions = {
      degreesLatitude: 90, // Edge case: max latitude
      degreesLongitude: -180, // Edge case: min longitude
      name: "North Pole",
      addressText: "Arctic Ocean",
    };

    await expect(async () => {
      await sender.Location(fakeChatId, ubicationParams);
    }).not.toThrow();

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        location: {
          degreesLatitude: 90,
          degreesLongitude: -180,
          name: "North Pole",
          address: "Arctic Ocean",
        },
        mentions: undefined,
      },
      undefined
    );
    expect(sendRawSpy).not.toHaveBeenCalled();
  });

  it("WhenSendingLocationWithNegativeEdgeCaseCoordinates_ShouldSendIt", async () => {
    const ubicationParams: WhatsMsgUbicationOptions = {
      degreesLatitude: -90, // Edge case: min latitude
      degreesLongitude: 180, // Edge case: max longitude
      name: "South Pole",
      addressText: "Antarctica",
    };

    await expect(async () => {
      await sender.Location(fakeChatId, ubicationParams);
    }).not.toThrow();

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        location: {
          degreesLatitude: -90,
          degreesLongitude: 180,
          name: "South Pole",
          address: "Antarctica",
        },
        mentions: undefined,
      },
      undefined
    );
    expect(sendRawSpy).not.toHaveBeenCalled();
  });
});

describe("Contact", () => {
  let mockSocket: WhatsSocketMock;
  let sender: WhatsSocket_Submodule_SugarSender;
  let sendSafeSpy: Mock<typeof WhatsSocketMock.prototype._SendSafe>;
  let sendRawSpy: Mock<typeof WhatsSocketMock.prototype._SendRaw>;

  beforeEach(() => {
    mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0, maxQueueLimit: 10 });
    sender = new WhatsSocket_Submodule_SugarSender(mockSocket);
    sendSafeSpy = spyOn(mockSocket, "_SendSafe");
    sendRawSpy = spyOn(mockSocket, "_SendRaw");
  });

  afterEach(() => {
    sendSafeSpy.mockRestore();
    sendRawSpy.mockRestore();
  });

  // Normal usage (No errors)
  it("WhenSendingSingleContact_ShouldSendIt", async () => {
    const contact = { name: "John Doe", phone: "1234567890" };
    const expectedVCard = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
TEL;type=CELL;type=VOICE;waid=1234567890:1234567890
END:VCARD`;

    await sender.Contact(fakeChatId, contact);

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        contacts: {
          displayName: "John Doe",
          contacts: [{ vcard: expectedVCard }],
        },
        mentions: undefined,
      },
      undefined
    );
    expect(sendRawSpy).not.toHaveBeenCalled();
  });

  it("WhenSendingMultipleContacts_ShouldSendIt", async () => {
    const contacts = [
      { name: "Alice Smith", phone: "2345678901" },
      { name: "Bob Jones", phone: "3456789012" },
    ];
    const expectedVCards = contacts.map(
      (c) => `BEGIN:VCARD
VERSION:3.0
FN:${c.name}
TEL;type=CELL;type=VOICE;waid=${c.phone}:${c.phone}
END:VCARD`
    );

    await sender.Contact(fakeChatId, contacts);

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        contacts: {
          displayName: "2 contacts",
          contacts: expectedVCards.map((vc) => ({ vcard: vc })),
        },
        mentions: undefined,
      },
      undefined
    );
    expect(sendRawSpy).not.toHaveBeenCalled();
  });

  it("WhenSendingContactWithAdditionalParams_ShouldSendIt", async () => {
    const contact = { name: "Jane Roe", phone: "4567890123" };
    const options: WhatsMsgSenderSendingOptionsMINIMUM = {
      mentionsIds: ["idperson1" + WhatsappGroupIdentifier, "idperson2" + WhatsappGroupIdentifier],
      sendRawWithoutEnqueue: false,
    };
    const expectedVCard = `BEGIN:VCARD
VERSION:3.0
FN:Jane Roe
TEL;type=CELL;type=VOICE;waid=4567890123:4567890123
END:VCARD`;

    await sender.Contact(fakeChatId, contact, options);

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        contacts: {
          displayName: "Jane Roe",
          contacts: [{ vcard: expectedVCard }],
        },
        mentions: options.mentionsIds,
      },
      options
    );
    expect(sendRawSpy).not.toHaveBeenCalled();
  });

  it("WhenSendingContactWithSendRawWithoutEnqueue_ShouldUseRawSend", async () => {
    const contact = { name: "Mike Brown", phone: "5678901234" };
    const options: WhatsMsgSenderSendingOptionsMINIMUM = {
      sendRawWithoutEnqueue: true,
    };
    const expectedVCard = `BEGIN:VCARD
VERSION:3.0
FN:Mike Brown
TEL;type=CELL;type=VOICE;waid=5678901234:5678901234
END:VCARD`;

    await sender.Contact(fakeChatId, contact, options);

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(0); // Raw send bypasses queue
    expect(sendSafeSpy).not.toHaveBeenCalled();
    expect(sendRawSpy).toHaveBeenCalledTimes(1);
    expect(sendRawSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        contacts: {
          displayName: "Mike Brown",
          contacts: [{ vcard: expectedVCard }],
        },
        mentions: undefined,
      },
      options
    );
  });

  it("WhenSendingContactWithMiscOptions_ShouldPassThemThrough", async () => {
    const contact = { name: "Sarah Green", phone: "6789012345" };
    const options: WhatsMsgSenderSendingOptionsMINIMUM = {
      mentionsIds: ["idperson1" + WhatsappGroupIdentifier],
      timestamp: new Date("2025-09-17T15:00:00Z"),
      ephemeralExpiration: 86400,
    };
    const expectedVCard = `BEGIN:VCARD
VERSION:3.0
FN:Sarah Green
TEL;type=CELL;type=VOICE;waid=6789012345:6789012345
END:VCARD`;

    await sender.Contact(fakeChatId, contact, options);

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        contacts: {
          displayName: "Sarah Green",
          contacts: [{ vcard: expectedVCard }],
        },
        mentions: options.mentionsIds,
      },
      options
    );
    expect(sendRawSpy).not.toHaveBeenCalled();
  });

  // Error handling
  it("WhenSendingContactWithMissingName_ShouldThrowError", async () => {
    const contact = { name: "", phone: "1234567890" };

    await expect(async () => {
      await sender.Contact(fakeChatId, contact);
    }).toThrow("Invalid contact: name and phone are required");

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(0);
    expect(sendSafeSpy).not.toHaveBeenCalled();
    expect(sendRawSpy).not.toHaveBeenCalled();
  });

  it("WhenSendingContactWithMissingPhone_ShouldThrowError", async () => {
    const contact = { name: "John Doe", phone: "" };

    await expect(async () => {
      await sender.Contact(fakeChatId, contact);
    }).toThrow("Invalid contact: name and phone are required");

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(0);
    expect(sendSafeSpy).not.toHaveBeenCalled();
    expect(sendRawSpy).not.toHaveBeenCalled();
  });

  it("WhenSendingMultipleContactsWithOneInvalid_ShouldThrowError", async () => {
    const contacts = [
      { name: "Alice Smith", phone: "2345678901" },
      { name: "Bob Jones", phone: "" }, // Invalid: empty phone
    ];

    await expect(async () => {
      await sender.Contact(fakeChatId, contacts);
    }).toThrow("Invalid contact: name and phone are required");

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(0);
    expect(sendSafeSpy).not.toHaveBeenCalled();
    expect(sendRawSpy).not.toHaveBeenCalled();
  });

  // Edge cases
  it("WhenSendingContactWithMinimalValidInput_ShouldSendIt", async () => {
    const contact = { name: "A", phone: "1" };
    const expectedVCard = `BEGIN:VCARD
VERSION:3.0
FN:A
TEL;type=CELL;type=VOICE;waid=1:1
END:VCARD`;

    await expect(async () => {
      await sender.Contact(fakeChatId, contact);
    }).not.toThrow();

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        contacts: {
          displayName: "A",
          contacts: [{ vcard: expectedVCard }],
        },
        mentions: undefined,
      },
      undefined
    );
    expect(sendRawSpy).not.toHaveBeenCalled();
  });

  it("WhenSendingMultipleContactsWithMinimalValidInput_ShouldSendIt", async () => {
    const contacts = [
      { name: "A", phone: "1" },
      { name: "B", phone: "2" },
    ];
    const expectedVCards = contacts.map(
      (c) => `BEGIN:VCARD
VERSION:3.0
FN:${c.name}
TEL;type=CELL;type=VOICE;waid=${c.phone}:${c.phone}
END:VCARD`
    );

    await expect(async () => {
      await sender.Contact(fakeChatId, contacts);
    }).not.toThrow();

    expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
    expect(sendSafeSpy).toHaveBeenCalledTimes(1);
    expect(sendSafeSpy).toHaveBeenLastCalledWith(
      fakeChatId,
      {
        contacts: {
          displayName: "2 contacts",
          contacts: expectedVCards.map((vc) => ({ vcard: vc })),
        },
        mentions: undefined,
      },
      undefined
    );
    expect(sendRawSpy).not.toHaveBeenCalled();
  });
});
