import { WhatsAppGroupIdentifier } from 'src/Whatsapp.types';
import { it, mock, spyOn, expect, describe, beforeEach, afterEach, type Mock } from "bun:test";
import { WhatsSocketSugarSender } from './WhatsSocket.sugarsenders';
import WhatsSocketMockMinimum from '../mocks/WhatsSocket.minimum.mock';
import { allMockMsgs } from 'src/helpers/Msg.helper.mocks';
import fs from "fs";
import { GetPath } from 'src/libs/BunPath';
import path from "node:path";

const fakeChatId = "338839029383" + WhatsAppGroupIdentifier;

describe("Text", () => {
  const mockWhatsSocket = new WhatsSocketMockMinimum();
  const sender = new WhatsSocketSugarSender(mockWhatsSocket);

  beforeEach(() => {
    mockWhatsSocket.ClearMock();
    mock.clearAllMocks();
  })

  it("WhenSendingSimplestTxtMsg_ShouldSendIt", async () => {
    await sender.Text(fakeChatId, "First Message");
    await sender.Text(fakeChatId, "Second Message");
    expect(mockWhatsSocket.SentMessages.length).toBe(2);
  });

  it("WhenSendingTxtMsgWithNormalizedOption_ShouldSendItNormalized", async () => {
    await sender.Text(fakeChatId, "     \n\nFirst Message             \n\n\n", { normalizeMessageText: true })
    await sender.Text(fakeChatId, "\n\n                                Second message           \n\n\n\n             Hello", { normalizeMessageText: true })
    expect(mockWhatsSocket.SentMessages.length).toBe(2);
    //@ts-expect-error Idk why typescript says .text doesn't exist, when it actually does...
    expect(mockWhatsSocket.SentMessages[0]!.content.text).toBe("First Message");
    //@ts-expect-error Same...
    expect(mockWhatsSocket.SentMessages[1]!.content.text).toBe("Second message\n\n\n\nHello")
  });

  it("WhenSendingTxtMsgQueuedRaw_ShouldBeSendThroughSendRawFromSocket", async () => {
    await sender.Text(fakeChatId, "First msg", { sendRawWithoutEnqueue: true });
    await sender.Text(fakeChatId, "Second msg", { sendRawWithoutEnqueue: true });
    await sender.Text(fakeChatId, "Third msg", { sendRawWithoutEnqueue: true });
    for (const msgSent of mockWhatsSocket.SentMessages) {
      expect(msgSent.isRawMsg).toBe(true);
    }
  });

  it("WhenSendingTxtMsgQueued_ShouldBeSendThroughSendSafeFromSocket", async () => {
    await sender.Text(fakeChatId, "First msg", { sendRawWithoutEnqueue: false });
    await sender.Text(fakeChatId, "Second msg", { sendRawWithoutEnqueue: false });
    await sender.Text(fakeChatId, "Third msg", { sendRawWithoutEnqueue: false });
    for (const msgSent of mockWhatsSocket.SentMessages) {
      expect(msgSent.isRawMsg).toBe(false);
    }
  });

  it("WhenSendingTxtMsgQueuedWithNoExtraOptiosn;Default;_ShouldBeSentThroughSendSafeFromSocket", async () => {
    await sender.Text(fakeChatId, "First msg default");
    await sender.Text(fakeChatId, "Second msg default");
    await sender.Text(fakeChatId, "Third msg default");
    for (const msgSent of mockWhatsSocket.SentMessages) {
      expect(msgSent.isRawMsg).toBe(false);
    }
  });
});

describe("Images", () => {
  const mockWhatsSocket = new WhatsSocketMockMinimum();
  const sender = new WhatsSocketSugarSender(mockWhatsSocket);

  let FS_existsSync: Mock<typeof fs.existsSync>;
  let FS_readFileSync: Mock<typeof fs.readFileSync>;

  beforeEach(() => {
    mockWhatsSocket.ClearMock();
    FS_existsSync = spyOn(fs, "existsSync");
    FS_readFileSync = spyOn(fs, "readFileSync");
  });

  afterEach(() => {
    FS_existsSync.mockRestore();
    FS_readFileSync.mockRestore();
  })

  it("WhenSendingSimplestImgFromPath_ShouldSendIt", async () => {
    const imgPath = "./fakeImg.png";
    const imgContent = Buffer.from([1, 2, 3, 4, 5]);

    FS_existsSync.mockReturnValue(true);
    FS_readFileSync.mockReturnValue(imgContent);

    // --- Mock Buffer.isBuffer ---
    const originalIsBuffer = Buffer.isBuffer;
    const isBufferMock = spyOn(Buffer, "isBuffer")
      .mockImplementation((value: any) => {
        const res = originalIsBuffer(value);
        //We do expect always the original method returns false, due to we're sending imgs with paths strings not buffers.
        //like in "imgPath" at the beginning of this it() test;
        expect(res).toBe(false);
        return res;
      });

    try {
      await sender.Img(fakeChatId, { sourcePath: imgPath });
      await sender.Img(fakeChatId, { sourcePath: imgPath, caption: "Image path string with caption!" });

      expect(FS_existsSync).toHaveBeenCalledTimes(2);
      expect(FS_readFileSync).toHaveBeenCalledTimes(2);

      expect(mockWhatsSocket.SentMessages.length).toBe(2);

      //@ts-expect-error
      expect(mockWhatsSocket.SentMessages[0].content.image).toBeInstanceOf(Buffer);
      //@ts-expect-error
      expect(mockWhatsSocket.SentMessages[0].content.caption).toBe("");

      //@ts-expect-error
      expect(mockWhatsSocket.SentMessages[1].content.caption).toBe("Image path string with caption!");
    } finally {
      isBufferMock.mockRestore();
    }
  });


  it("WhenSendingSimplestImgFromBuffer_ShouldSendIt", async () => {
    const imgAsBuffer = Buffer.from([1, 2, 3, 4, 5, 6, 7]);

    FS_existsSync.mockReturnValue(true);
    FS_readFileSync.mockImplementation((..._any: any[]): any => {
      //This ensures is using the only Buffer Side sending from Send.Img(), avoiding reading from paths
      throw new Error("This method shouldn't be used!")
    });

    await sender.Img(fakeChatId, { sourcePath: imgAsBuffer })
    await sender.Img(fakeChatId, { sourcePath: imgAsBuffer, caption: "Img buffer with caption!" })

    expect(mockWhatsSocket.SentMessages.length).toBe(2);
    expect(FS_existsSync.mock.calls.length).toBe(2);
    expect(FS_readFileSync.mock.calls.length).toBe(0);
  })


  it("WhenSendingImgWithCaptionNormalized_ShouldSendItNormalized", async () => {
    const imgPath = "./hello.png";
    const imgContent = Buffer.from([1]);

    FS_existsSync.mockReturnValue(true);
    FS_readFileSync.mockReturnValue(imgContent);

    await sender.Img(fakeChatId, { sourcePath: imgPath, caption: "     \n\nCaption Text             \n\n\n" }, { normalizeMessageText: true });

    expect(mockWhatsSocket.SentMessages.length).toBe(1);
    //@ts-ignore
    expect(mockWhatsSocket.SentMessages[0]!.content.image).toBeInstanceOf(Buffer);
    //@ts-ignore
    expect(mockWhatsSocket.SentMessages[0]!.content.caption).toBe("Caption Text");
  });


  //I want to think this works as well with nonBuffer things
  it("WhenTryingToSendAnInvalidMsgPath_ShouldThrowError", async () => {
    FS_existsSync.mockReturnValue(false);
    expect(async () => {
      await sender.Img(fakeChatId, { sourcePath: "./invalid.pathhh///", caption: "With caption" });
    }).toThrowError("Bad arguments: WhatsSocketSugarSender tried to send an img with incorrect path!, check again your img path" + " ImgPath: " + "./invalid.pathhh///")
  })
});

describe("ReactEmojiToMsg", () => {
  const mockWhatsSender = new WhatsSocketMockMinimum()
  const sender = new WhatsSocketSugarSender(mockWhatsSender);

  it("WhenGivenIdealParams_ShouldSendItCorrectly", async () => {
    const emoji = "✨";
    for (const mockMsg of allMockMsgs) {
      await sender.ReactEmojiToMsg(fakeChatId, mockMsg, emoji);
    }
  });

  it("WhenGivenEmptyString_ShouldThrowError", async () => {
    const emojiWrong = "";
    for (const mockMsg of allMockMsgs) {
      expect(async () => {
        await sender.ReactEmojiToMsg(fakeChatId, mockMsg, emojiWrong);
      }).toThrowError("WhatsSocketSugarSender.ReactEmojiToMsg() received more than 2 chars as emoji to send.... It must be a simple emoji string of 1 emoji length. Received instead: " + emojiWrong);
    }
  });

  it("WhenGivenDoubleEmoji_ShouldThrowError", async () => {
    const emojis = "☠️🦊";
    for (const mockMsg of allMockMsgs) {
      expect(async () => {
        await sender.ReactEmojiToMsg(fakeChatId, mockMsg, emojis)
      }).toThrowError("WhatsSocketSugarSender.ReactEmojiToMsg() received more than 2 chars as emoji to send.... It must be a simple emoji string of 1 emoji length. Received instead: " + emojis);
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


const mockDataFolderPath = GetPath("src", "core", "whats_socket", "internals", "mock_data");
describe("Sticker", () => {
  const mockWhatsSender = new WhatsSocketMockMinimum();
  const sender = new WhatsSocketSugarSender(mockWhatsSender);

  //Getting all real stickers examples in webp from mocks folder
  const stickerFilesPaths = fs.readdirSync(mockDataFolderPath)
    .filter(fileName => fileName.endsWith(".webp"))
    .map(webpFile => path.join(mockDataFolderPath, webpFile))

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
      await sender.Sticker(fakeChatId, invalidStickerPath)
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
});

describe("Audio", () => {
  const mockWhatsSocket = new WhatsSocketMockMinimum();
  const sender = new WhatsSocketSugarSender(mockWhatsSocket);

  let FS_existsSync: Mock<typeof fs.existsSync>;
  let FS_readFileSync: Mock<typeof fs.readFileSync>;
  let GLOBAL_fetch: Mock<typeof fetch>;

  beforeEach(() => {
    mockWhatsSocket.ClearMock();
    FS_existsSync = spyOn(fs, "existsSync");
    FS_readFileSync = spyOn(fs, "readFileSync");
    GLOBAL_fetch = spyOn(global, "fetch");
  });

  afterEach(() => {
    FS_existsSync.mockRestore();
    FS_readFileSync.mockRestore();
    GLOBAL_fetch.mockRestore();
  });

  it("WhenSendingLocalAudio_ShouldSendIt", async () => {
    const audioPath = "./fakeAudio.mp3";
    const audioContent = Buffer.from([1, 2, 3, 4]);

    FS_existsSync.mockReturnValue(true);
    FS_readFileSync.mockReturnValue(audioContent);

    await sender.Audio(fakeChatId, audioPath);

    expect(FS_existsSync).toHaveBeenCalledWith(GetPath(audioPath));
    expect(FS_readFileSync).toHaveBeenCalled();
    expect(mockWhatsSocket.SentMessages.length).toBe(1);

    // @ts-expect-error
    expect(mockWhatsSocket.SentMessages[0].content.audio).toBeInstanceOf(Buffer);
    // @ts-expect-error
    expect(mockWhatsSocket.SentMessages[0].content.mimetype).toBe("audio/mpeg");
  });

  it("WhenSendingAudioFromBuffer_ShouldSendIt", async () => {
    const audioBuffer = Buffer.from([5, 6, 7, 8]);

    await sender.Audio(fakeChatId, audioBuffer);

    expect(FS_existsSync).not.toHaveBeenCalled();
    expect(FS_readFileSync).not.toHaveBeenCalled();
    expect(mockWhatsSocket.SentMessages.length).toBe(1);

    // @ts-expect-error
    expect(mockWhatsSocket.SentMessages[0].content.audio).toBe(audioBuffer);
  });

  it("WhenSendingNonExistingPath_ShouldFetchRemoteUrl", async () => {
    const remoteUrl = "https://example.com/test.mp3";
    const fakeArrayBuffer = new Uint8Array([9, 10, 11, 12]).buffer;
    GLOBAL_fetch.mockResolvedValue(new Response(fakeArrayBuffer, { status: 200 }))
    FS_existsSync.mockReturnValue(false);

    await sender.Audio(fakeChatId, remoteUrl);
    expect(mockWhatsSocket.SentMessages.length).toBe(1);
    // @ts-expect-error
    expect(mockWhatsSocket.SentMessages[0].content.audio).toBeInstanceOf(Buffer);
  });

  it("WhenSendingFromWAMessage_ShouldUseDownloadMediaMessage", async () => {
    //Mocking simplest audio msg
    const fakeMsg: any = {
      message: {
        audioMessage: {
          mimetype: "audio/ogg",
        },
      },
    };

    //Mocking required function from baileys lib
    const downloadMediaMessageMock = mock();
    mock.module("baileys", () => {
      return {
        ...require("baileys"),
        "downloadMediaMessage": downloadMediaMessageMock
      }
    })
    downloadMediaMessageMock.mockResolvedValue(Buffer.from([13, 14, 15]));


    try {
      await sender.Audio(fakeChatId, fakeMsg);
      expect(downloadMediaMessageMock).toHaveBeenCalledWith(fakeMsg, "buffer", {});
      expect(mockWhatsSocket.SentMessages.length).toBe(1);
      // @ts-expect-error
      expect(mockWhatsSocket.SentMessages[0].content.mimetype).toBe("audio/ogg");

    } finally {
      mock.restore();
    }
  });

  it("WhenGivenInvalidSource_ShouldNotSend", async () => {
    const wrongAudioSource = { bad: "test" };
    expect(async () => {
      await sender.Audio(fakeChatId, wrongAudioSource as any);
    }).toThrowError('WhatsSocketSugarSender: Invalid audio source provided when trying to send audio msg: ' + wrongAudioSource);
    expect(mockWhatsSocket.SentMessages.length).toBe(0);
  });
});

describe("Video", async () => {
  const mockSocket = new WhatsSocketMockMinimum();
  const sender = new WhatsSocketSugarSender(mockSocket);

  let FS_existsSync: Mock<typeof fs.existsSync>;
  let FS_readFileSync: Mock<typeof fs.readFileSync>;

  beforeEach(() => {
    mockSocket.ClearMock();
    FS_existsSync = spyOn(fs, "existsSync");
    FS_readFileSync = spyOn(fs, "readFileSync");
  })

  afterEach(() => {
    FS_existsSync.mockClear();
    FS_readFileSync.mockClear();
  })

  it("WhenSendingVideoFromLocalPath_ShouldSendIt", async () => {
    const videoPath = "./real/and/valid/video.mp4";
    const videoContent = Buffer.from("VideoContentBinaryMock");
    FS_existsSync.mockReturnValue(true);
    FS_readFileSync.mockReturnValue(videoContent);

    await sender.Video(fakeChatId, { sourcePath: videoPath /** With no caption */ });
    await sender.Video(fakeChatId, { sourcePath: videoPath, caption: "This video has caption" /** With caption */ });

    expect(FS_existsSync).toBeCalledTimes(2);
    expect(mockSocket.SentMessages).toHaveLength(2);
    //@ts-ignore
    expect(mockSocket.SentMessages[0]!.content.video).toBe(videoContent);
    //@ts-ignore
    expect(mockSocket.SentMessages[0]!.content.caption).toBe("");
    //@ts-ignore
    expect(mockSocket.SentMessages[1]!.content.video).toBe(videoContent);
    //@ts-ignore
    expect(mockSocket.SentMessages[1]!.content.caption).toBe("This video has caption");
  });

  it("WhenSendingFromBuffer_ShouldSendIt", async () => {
    const videoAsBuffer = Buffer.from("VideoContentBinayMock");

    await sender.Video(fakeChatId, { sourcePath: videoAsBuffer });
    await sender.Video(fakeChatId, { sourcePath: videoAsBuffer, caption: "Msg Video from Buffer" });

    expect(FS_existsSync).not.toHaveBeenCalled();
    expect(FS_readFileSync).not.toHaveBeenCalled();

    expect(mockSocket.SentMessages).toHaveLength(2);
    //@ts-ignore
    expect(mockSocket.SentMessages.at(0)!.content.video).toBe(videoAsBuffer);
    //@ts-ignore
    expect(mockSocket.SentMessages.at(0)!.content.caption).toBe("");
    //@ts-ignore
    expect(mockSocket.SentMessages.at(1)!.content.video).toBe(videoAsBuffer);
    //@ts-ignore
    expect(mockSocket.SentMessages.at(1)!.content.caption).toBe("Msg Video from Buffer");
  });

  it("WhenSendingWithNormalizeCaptionOption_ShouldNormalizeInternally", async () => {
    const videoPath = "./real/and/valid/video.mp4";
    const videoContent = Buffer.from("VideoContentBinaryMock");
    FS_existsSync.mockReturnValue(true);
    FS_readFileSync.mockReturnValue(videoContent);

    await sender.Video(fakeChatId, { sourcePath: videoPath, caption: "        First Video       " }, { normalizeMessageText: true });
    await sender.Video(fakeChatId, { sourcePath: videoPath, caption: " \n\n       Second Video     \n\n\n  " }, { normalizeMessageText: true });

    expect(mockSocket.SentMessages).toHaveLength(2);
    //@ts-ignore
    expect(mockSocket.SentMessages.at(0)!.content.caption).toBe("First Video");
    //@ts-ignore
    expect(mockSocket.SentMessages.at(1)!.content.caption).toBe("Second Video");
  })
})


