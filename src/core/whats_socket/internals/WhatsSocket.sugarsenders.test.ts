import { afterAll, afterEach, beforeEach, describe, expect, it, mock, spyOn, type Mock } from "bun:test";
import fs from "fs";
import path from "node:path";
import { GetPath } from "../../../libs/BunPath";
import { allMockMsgs } from "../../../mocks/MockManyTypesMsgs.mock";
import { WhatsappGroupIdentifier } from "../../../Whatsapp.types";
import WhatsSocketMock from "../mocks/WhatsSocket.mock";
import { IWhatsSocket_Submodule_SugarSender } from "./WhatsSocket.sugarsenders";

const fakeChatId = "338839029383" + WhatsappGroupIdentifier;

describe("Text", () => {
  const mockWhatsSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
  const sender = new IWhatsSocket_Submodule_SugarSender(mockWhatsSocket);

  beforeEach(() => {
    mockWhatsSocket.ClearMock();
    mock.clearAllMocks();
  });

  it("WhenSendingSimplestTxtMsg_ShouldSendIt", async () => {
    await sender.Text(fakeChatId, "First Message");
    await sender.Text(fakeChatId, "Second Message");
    expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(2);
    expect(mockWhatsSocket.SentMessagesThroughQueue.length).toBe(2);
  });

  it("WhenSendingTxtMsgWithNormalizedOption_ShouldSendItNormalized", async () => {
    await sender.Text(fakeChatId, "     \n\nFirst Message             \n\n\n", { normalizeMessageText: true });
    await sender.Text(fakeChatId, "\n\n                                Second message           \n\n\n\n             Hello", { normalizeMessageText: true });
    expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(2);
    expect(mockWhatsSocket.SentMessagesThroughQueue.length).toBe(2);
    //@ts-expect-error Idk why typescript says .text doesn't exist, when it actually does...
    expect(mockWhatsSocket.SentMessagesThroughRaw[0]!.content.text).toBe("First Message");
    //@ts-expect-error content.text exists
    expect(mockWhatsSocket.SentMessagesThroughRaw[1]!.content.text).toBe("Second message\n\n\n\nHello");
  });

  it("WhenSendingTxtMsgQueuedRaw_ShouldBeSendThroughSendRawFromSocket", async () => {
    await sender.Text(fakeChatId, "First msg", { sendRawWithoutEnqueue: true });
    await sender.Text(fakeChatId, "Second msg", { sendRawWithoutEnqueue: true });
    await sender.Text(fakeChatId, "Third msg", { sendRawWithoutEnqueue: true });
    expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(3);
    expect(mockWhatsSocket.SentMessagesThroughQueue.length).toBe(0);
  });

  it("WhenSendingTxtMsgQueued_ShouldBeSendThroughSendSafeFromSocket", async () => {
    await sender.Text(fakeChatId, "First msg", { sendRawWithoutEnqueue: false });
    await sender.Text(fakeChatId, "Second msg", { sendRawWithoutEnqueue: false });
    await sender.Text(fakeChatId, "Third msg", { sendRawWithoutEnqueue: false });

    expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(3);
    expect(mockWhatsSocket.SentMessagesThroughQueue.length).toBe(3);
    expect(mockWhatsSocket.SentMessagesThroughQueue.length).toBe(3);
  });

  it("WhenSendingTxtMsgQueuedWithNoExtraOptiosn;Default;_ShouldBeSentThroughSendSafeFromSocket", async () => {
    await sender.Text(fakeChatId, "First msg default");
    await sender.Text(fakeChatId, "Second msg default");
    await sender.Text(fakeChatId, "Third msg default");

    expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(3);
    expect(mockWhatsSocket.SentMessagesThroughQueue.length).toBe(3);
  });
});

describe("Images", () => {
  const mockWhatsSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
  const sender = new IWhatsSocket_Submodule_SugarSender(mockWhatsSocket);

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
  });

  afterAll(() => {
    FS_existsSync.mockRestore();
    FS_readFileSync.mockRestore();
  });

  it("WhenSendingSimplestImgFromPath_ShouldSendIt", async () => {
    const imgPath = "./fakeImg.png";
    const imgContent = Buffer.from([1, 2, 3, 4, 5]);

    FS_existsSync.mockReturnValue(true);
    FS_readFileSync.mockReturnValue(imgContent);

    // --- Mock Buffer.isBuffer ---
    const originalIsBuffer = Buffer.isBuffer;
    const isBufferMock = spyOn(Buffer, "isBuffer").mockImplementation((value: any) => {
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

      expect(mockWhatsSocket.SentMessagesThroughQueue.length).toBe(2);
      expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(2);

      //@ts-expect-error content.image exists
      expect(mockWhatsSocket.SentMessagesThroughRaw[0].content.image).toBeInstanceOf(Buffer);
      //@ts-expect-error content.caption exists
      expect(mockWhatsSocket.SentMessagesThroughRaw[0].content.caption).toBe("");

      //@ts-expect-error content.caption exists
      expect(mockWhatsSocket.SentMessagesThroughRaw[1].content.caption).toBe("Image path string with caption!");
    } finally {
      isBufferMock.mockRestore();
    }
  });

  it("WhenSendingSimplestImgFromBuffer_ShouldSendIt", async () => {
    const imgAsBuffer = Buffer.from([1, 2, 3, 4, 5, 6, 7]);

    FS_existsSync.mockReturnValue(true);
    FS_readFileSync.mockImplementation((..._any: any[]): any => {
      //This ensures is using the only Buffer Side sending from Send.Img(), avoiding reading from paths
      throw new Error("This method shouldn't be used!");
    });

    await sender.Img(fakeChatId, { sourcePath: imgAsBuffer });
    await sender.Img(fakeChatId, { sourcePath: imgAsBuffer, caption: "Img buffer with caption!" });

    expect(mockWhatsSocket.SentMessagesThroughQueue.length).toBe(2);
    expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(2);
    expect(FS_existsSync.mock.calls.length).toBe(2);
    expect(FS_readFileSync.mock.calls.length).toBe(0);
  });

  it("WhenSendingImgWithCaptionNormalized_ShouldSendItNormalized", async () => {
    const imgPath = "./hello.png";
    const imgContent = Buffer.from([1]);

    FS_existsSync.mockReturnValue(true);
    FS_readFileSync.mockReturnValue(imgContent);

    await sender.Img(fakeChatId, { sourcePath: imgPath, caption: "     \n\nCaption Text             \n\n\n" }, { normalizeMessageText: true });

    expect(mockWhatsSocket.SentMessagesThroughQueue.length).toBe(1);
    expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(1);
    //@ts-expect-error content.caption exists
    expect(mockWhatsSocket.SentMessagesThroughRaw[0]!.content.image).toBeInstanceOf(Buffer);
    //@ts-expect-error content.caption exists
    expect(mockWhatsSocket.SentMessagesThroughRaw[0]!.content.caption).toBe("Caption Text");
  });

  //I want to think this works as well with nonBuffer things
  it("WhenTryingToSendAnInvalidMsgPath_ShouldThrowError", async () => {
    FS_existsSync.mockReturnValue(false);
    expect(async () => {
      await sender.Img(fakeChatId, { sourcePath: "./invalid.pathhh///", caption: "With caption" });
    }).toThrowError(
      "Bad arguments: WhatsSocketSugarSender tried to send an img with incorrect path!, check again your img path" + " ImgPath: " + "./invalid.pathhh///"
    );
  });
});

describe("ReactEmojiToMsg", () => {
  const mockWhatsSender = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
  const sender = new IWhatsSocket_Submodule_SugarSender(mockWhatsSender);

  it("WhenGivenIdealParams_ShouldSendItCorrectly", async () => {
    const emoji = "✨";
    let i = 0;
    for (const mockMsg of allMockMsgs) {
      await sender.ReactEmojiToMsg(fakeChatId, mockMsg, emoji);
      expect(mockWhatsSender.SentMessagesThroughQueue[i]).toBeDefined();
      expect(mockWhatsSender.SentMessagesThroughQueue[i]?.content).toMatchObject({
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

const mockDataFolderPath = GetPath("src", "core", "whats_socket", "internals", "mock_data");
describe("Sticker", () => {
  const mockWhatsSender = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
  const sender = new IWhatsSocket_Submodule_SugarSender(mockWhatsSender);

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
});

describe("Audio", () => {
  const mockWhatsSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
  const sender = new IWhatsSocket_Submodule_SugarSender(mockWhatsSocket);

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
  afterAll(() => {
    FS_existsSync.mockRestore();
    FS_readFileSync.mockRestore();
  });

  it("WhenSendingLocalAudio_ShouldSendIt", async () => {
    const audioPath = "./fakeAudio.mp3";
    const audioContent = Buffer.from([1, 2, 3, 4]);

    FS_existsSync.mockReturnValue(true);
    FS_readFileSync.mockReturnValue(audioContent);

    await sender.Audio(fakeChatId, audioPath);

    expect(FS_existsSync).toHaveBeenCalledWith(GetPath(audioPath));
    expect(FS_readFileSync).toHaveBeenCalled();
    expect(mockWhatsSocket.SentMessagesThroughQueue.length).toBe(1);
    expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(1);

    // @ts-expect-error content.audio exists
    expect(mockWhatsSocket.SentMessagesThroughRaw[0].content.audio).toBeInstanceOf(Buffer);
    // @ts-expect-error content.mimytype exists
    expect(mockWhatsSocket.SentMessagesThroughRaw[0].content.mimetype).toBe("audio/mpeg");
  });

  it("WhenSendingAudioFromBuffer_ShouldSendIt", async () => {
    const audioBuffer = Buffer.from([5, 6, 7, 8]);

    await sender.Audio(fakeChatId, audioBuffer);

    expect(FS_existsSync).not.toHaveBeenCalled();
    expect(FS_readFileSync).not.toHaveBeenCalled();
    expect(mockWhatsSocket.SentMessagesThroughQueue.length).toBe(1);
    expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(1);

    // @ts-expect-error content.audio exists
    expect(mockWhatsSocket.SentMessagesThroughRaw[0].content.audio).toBe(audioBuffer);
  });

  it("WhenSendingNonExistingPath_ShouldFetchRemoteUrl", async () => {
    const remoteUrl = "https://example.com/test.mp3";
    const fakeArrayBuffer = new Uint8Array([9, 10, 11, 12]).buffer;
    GLOBAL_fetch.mockResolvedValue(new Response(fakeArrayBuffer, { status: 200 }));
    FS_existsSync.mockReturnValue(false);

    await sender.Audio(fakeChatId, remoteUrl);
    expect(mockWhatsSocket.SentMessagesThroughQueue.length).toBe(1);
    expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(1);
    // @ts-expect-error content.audio exists
    expect(mockWhatsSocket.SentMessagesThroughRaw[0].content.audio).toBeInstanceOf(Buffer);
  });

  it("WhenGivenInvalidSource_ShouldNotSend", async () => {
    const wrongAudioSource = { bad: "test" };
    expect(async () => {
      await sender.Audio(fakeChatId, wrongAudioSource as any);
    }).toThrowError("WhatsSocketSugarSender: Invalid audio source provided when trying to send audio msg: " + wrongAudioSource);
    expect(mockWhatsSocket.SentMessagesThroughQueue.length).toBe(0);
    expect(mockWhatsSocket.SentMessagesThroughRaw.length).toBe(0);
  });
});

describe("Video", async () => {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
  const sender = new IWhatsSocket_Submodule_SugarSender(mockSocket);

  let FS_existsSync: Mock<typeof fs.existsSync>;
  let FS_readFileSync: Mock<typeof fs.readFileSync>;

  beforeEach(() => {
    mockSocket.ClearMock();
    FS_existsSync = spyOn(fs, "existsSync");
    FS_readFileSync = spyOn(fs, "readFileSync");
  });

  afterEach(() => {
    FS_existsSync.mockClear();
    FS_readFileSync.mockClear();
  });

  afterAll(() => {
    FS_existsSync.mockRestore();
    FS_readFileSync.mockRestore();
  });

  it("WhenSendingVideoFromLocalPath_ShouldSendIt", async () => {
    const videoPath = "./real/and/valid/video.mp4";
    const videoContent = Buffer.from("VideoContentBinaryMock");
    FS_existsSync.mockReturnValue(true);
    FS_readFileSync.mockReturnValue(videoContent);

    await sender.Video(fakeChatId, { sourcePath: videoPath /** With no caption */ });
    await sender.Video(fakeChatId, { sourcePath: videoPath, caption: "This video has caption" /** With caption */ });

    expect(FS_existsSync).toBeCalledTimes(2);
    expect(mockSocket.SentMessagesThroughQueue.length).toBe(2);
    expect(mockSocket.SentMessagesThroughRaw.length).toBe(2);
    //@ts-expect-error Content.video does exist!
    expect(mockSocket.SentMessagesThroughRaw[0]!.content.video).toBe(videoContent);
    //@ts-expect-error Content.caption does exist!
    expect(mockSocket.SentMessagesThroughRaw[0]!.content.caption).toBe("");
    //@ts-expect-error Content.video does exist!
    expect(mockSocket.SentMessagesThroughRaw[1]!.content.video).toBe(videoContent);
    //@ts-expect-error Content.caption does exist!
    expect(mockSocket.SentMessagesThroughRaw[1]!.content.caption).toBe("This video has caption");
  });

  it("WhenSendingFromBuffer_ShouldSendIt", async () => {
    const videoAsBuffer = Buffer.from("VideoContentBinayMock");

    await sender.Video(fakeChatId, { sourcePath: videoAsBuffer });
    await sender.Video(fakeChatId, { sourcePath: videoAsBuffer, caption: "Msg Video from Buffer" });

    expect(FS_existsSync).not.toHaveBeenCalled();
    expect(FS_readFileSync).not.toHaveBeenCalled();

    expect(mockSocket.SentMessagesThroughQueue.length).toBe(2);
    expect(mockSocket.SentMessagesThroughRaw.length).toBe(2);

    expect(mockSocket.SentMessagesThroughRaw.at(0)!.content).toMatchObject({
      video: videoAsBuffer,
      caption: "",
    });
    expect(mockSocket.SentMessagesThroughRaw.at(1)!.content).toMatchObject({
      video: videoAsBuffer,
      caption: "Msg Video from Buffer",
    });
  });

  it("WhenSendingWithNormalizeCaptionOption_ShouldNormalizeInternally", async () => {
    const videoPath = "./real/and/valid/video.mp4";
    const videoContent = Buffer.from("VideoContentBinaryMock");
    FS_existsSync.mockReturnValue(true);
    FS_readFileSync.mockReturnValue(videoContent);

    await sender.Video(fakeChatId, { sourcePath: videoPath, caption: "        First Video       " }, { normalizeMessageText: true });
    await sender.Video(fakeChatId, { sourcePath: videoPath, caption: " \n\n       Second Video     \n\n\n  " }, { normalizeMessageText: true });

    expect(mockSocket.SentMessagesThroughQueue.length).toBe(2);
    expect(mockSocket.SentMessagesThroughRaw.length).toBe(2);
    expect(mockSocket.SentMessagesThroughRaw.at(0)!.content).toMatchObject({
      caption: "First Video",
    });
    expect(mockSocket.SentMessagesThroughRaw.at(1)!.content).toMatchObject({
      caption: "Second Video",
    });
  });
});

describe("Poll", () => {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
  const sender = new IWhatsSocket_Submodule_SugarSender(mockSocket);

  beforeEach(() => {
    mockSocket.ClearMock();
  });

  it("WhenGivenMinimalParams_ShouldWorkAndNotThrowAnything", async () => {
    const pollTitleHeader = "Poll Title Example";
    const options = ["Option 1", "Option 2", "Option 3"];

    expect(async () => {
      await sender.Poll(fakeChatId, pollTitleHeader, options, { withMultiSelect: true });
    }).not.toThrow();

    expect(mockSocket.SentMessagesThroughQueue.length).toBe(1);
    expect(mockSocket.SentMessagesThroughRaw.length).toBe(1);
    expect(mockSocket.SentMessagesThroughRaw.at(0)!.content).toMatchObject({
      poll: {
        name: "Poll Title Example",
        values: options,
        selectableCount: options.length,
      },
    });
  });
});

describe("Ubication", () => {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
  const sender = new IWhatsSocket_Submodule_SugarSender(mockSocket);

  beforeEach(() => {
    mockSocket.ClearMock();
  });

  it("WhenProvidingIdealParams_ShouldWork", async () => {
    expect(async () => {
      await sender.Ubication(fakeChatId, { degreesLatitude: -85, degreesLongitude: 125, addressText: "Address Text Example", name: "Ubication Name Example" });
    }).not.toThrow();

    expect(mockSocket.SentMessagesThroughQueue.length).toBe(1);
    expect(mockSocket.SentMessagesThroughRaw.length).toBe(1);
    expect(mockSocket.SentMessagesThroughRaw.at(0)!.content).toMatchObject({
      location: {
        degreesLongitude: 125,
        degreesLatitude: -85,
        name: "Ubication Name Example",
        address: "Address Text Example",
      },
    });
  });

  it("WhenProvidingInvalidLatitude_ShouldThrowError", async () => {
    const badLatitude = -100;
    const goodLongitude = 120;
    expect(async () => {
      await sender.Ubication(fakeChatId, { degreesLatitude: badLatitude, degreesLongitude: goodLongitude });
    }).toThrowError(
      `WhatsSocketSugarSender.Ubication() => Invalid coordinates: (${badLatitude}, ${goodLongitude}).Latitude must be between -90 and 90, longitude between -180 and 180.`
    );
  });

  it("WhenProvidingInvalidLongitude_ShouldThrowError", async () => {
    const goodLatitude = 80;
    const badLongitude = -200;
    expect(async () => {
      await sender.Ubication(fakeChatId, { degreesLatitude: goodLatitude, degreesLongitude: badLongitude });
    }).toThrowError(
      `WhatsSocketSugarSender.Ubication() => Invalid coordinates: (${goodLatitude}, ${badLongitude}).Latitude must be between -90 and 90, longitude between -180 and 180.`
    );
  });
});

describe("Contacts", () => {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
  const sender = new IWhatsSocket_Submodule_SugarSender(mockSocket);

  beforeEach(() => {
    mockSocket.ClearMock();
  });

  it("WhenProvidingMinimumIdealParams_ShouldWork", async () => {
    await sender.Contact(fakeChatId, { name: "Chrismorris", phone: "521612938493020" });

    expect(mockSocket.SentMessagesThroughQueue.length).toBe(1);
    expect(mockSocket.SentMessagesThroughRaw.length).toBe(1);

    //@ts-expect-error Content in fact containts "contacts" object
    const msg = mockSocket.SentMessagesThroughRaw[0].content.contacts;
    expect(msg.displayName).toBe("Chrismorris");
    expect(msg.contacts[0].vcard).toContain("BEGIN:VCARD");
    expect(msg.contacts[0].vcard).toContain("FN:Chrismorris");
    expect(msg.contacts[0].vcard).toContain("waid=521612938493020");
  });

  it("WhenSendingMultipleContacts_ShouldAggregateThem", async () => {
    const contacts = [
      { name: "Alice", phone: "5211111111111" },
      { name: "Bob", phone: "5212222222222" },
    ];

    await sender.Contact(fakeChatId, contacts);

    expect(mockSocket.SentMessagesThroughQueue.length).toBe(1);
    expect(mockSocket.SentMessagesThroughRaw.length).toBe(1);

    //@ts-expect-error Content in fact containts "contacts" object
    const msg = mockSocket.SentMessagesThroughRaw[0]!.content.contacts;
    expect(msg.displayName).toBe("2 contacts");
    expect(msg.contacts).toHaveLength(2);
    expect(msg.contacts[0].vcard).toContain("FN:Alice");
    expect(msg.contacts[1].vcard).toContain("FN:Bob");
  });

  it("WhenMissingPhone_ShouldThrowError", async () => {
    expect(async () => {
      await sender.Contact(fakeChatId, { name: "NoPhone" } as any);
    }).toThrowError("Invalid contact: name and phone are required");
  });

  it("WhenMissingName_ShouldThrowError", async () => {
    expect(async () => {
      await sender.Contact(fakeChatId, { phone: "5211234567890" } as any);
    }).toThrowError("Invalid contact: name and phone are required");
  });

  it("WhenPassingSendRawWithoutEnqueue_ShouldStillSendCorrectly", async () => {
    await sender.Contact(fakeChatId, { name: "RawSend", phone: "5219876543210" }, { sendRawWithoutEnqueue: true });

    expect(mockSocket.SentMessagesThroughQueue.length).toBe(0);
    expect(mockSocket.SentMessagesThroughRaw.length).toBe(1);
    expect(mockSocket.SentMessagesThroughRaw[0]!.content).toMatchObject({
      contacts: {
        displayName: "RawSend",
      },
    });
  });
});

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
