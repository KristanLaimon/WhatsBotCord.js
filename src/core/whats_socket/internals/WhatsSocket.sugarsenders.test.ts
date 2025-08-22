import { WhatsAppGroupIdentifier } from 'src/Whatsapp.types';
import { it, spyOn, expect, describe, beforeEach, afterAll } from "bun:test";
import { WhatsSocketSugarSender } from './WhatsSocket.sugarsenders';
import WhatsSocketMockMinimum from '../mocks/WhatsSocket.minimum.mock';
import fs from "fs";

const fakeChatId = "338839029383" + WhatsAppGroupIdentifier;

describe("Text", () => {
  const mockWhatsSocket = new WhatsSocketMockMinimum();
  const sender = new WhatsSocketSugarSender(mockWhatsSocket);

  beforeEach(() => {
    mockWhatsSocket.ClearMock();
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

  const FS_existsSync = spyOn(fs, "existsSync");
  const FS_readFileSync = spyOn(fs, "readFileSync");


  beforeEach(() => {
    mockWhatsSocket.ClearMock();
  });

  //Restoring original FS after whole Image test suite usage
  afterAll(() => {
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


  it("ShouldSendSimplestImgFromBuffer_ShouldSendIt", async () => {
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

  // it("WhenSendingImgWithMentions_ShouldIncludeMentions", async () => {
  //   await sender.Img(fakeChatId, { sourcePath: './fakeimage.png', caption: "Mention @user" }, { mentionsIds: ["12345@s.whatsapp.net"] });
  //   expect(mockWhatsSocket.SentMessages.length).toBe(1);
  //   expect(mockWhatsSocket.SentMessages[0].content.mentions).toEqual(["12345@s.whatsapp.net"]);
  // });

  // it("WhenSendingImgQueuedRaw_ShouldBeSentRaw", async () => {
  //   await sender.Img(fakeChatId, { sourcePath: './fakeimage.png' }, { sendRawWithoutEnqueue: true });
  //   expect(mockWhatsSocket.SentMessages[0].isRawMsg).toBe(true);
  // });

  // it("WhenSendingImgQueuedSafe_ShouldBeSentSafe", async () => {
  //   await sender.Img(fakeChatId, { sourcePath: './fakeimage.png' }, { sendRawWithoutEnqueue: false });
  //   expect(mockWhatsSocket.SentMessages[0].isRawMsg).toBe(false);
  // });

  // it("WhenSendingImgWithInvalidPath_ShouldThrow", async () => {
  //   await expect(sender.Img(fakeChatId, { sourcePath: '/nonexistent.png' })).rejects.toThrow(/incorrect path/);
  // });

  // it("WhenSendingImgWithBuffer_ShouldSendIt", async () => {
  //   await sender.Img(fakeChatId, { sourcePath: Buffer.from('fakeimagedata') });
  //   expect(mockWhatsSocket.SentMessages.length).toBe(1);
  //   expect(mockWhatsSocket.SentMessages[0].content.image).toBeInstanceOf(Buffer);
  // });
});

// describe("Reactions", () => {
//   const mockWhatsSocket = new WhatsSocketMockMinimum();
//   const sender = new WhatsSocketSugarSender(mockWhatsSocket);
//   const fakeMsg: WAMessage = { key: { id: 'fakeid', remoteJid: fakeChatId, fromMe: false } };
//
//   beforeEach(() => {
//     mockWhatsSocket.ClearMock();
//   });
//
//   it("WhenSendingReactionEmoji_ShouldSendIt", async () => {
//     await sender.ReactEmojiToMsg(fakeChatId, fakeMsg, "👍");
//     expect(mockWhatsSocket.SentMessages.length).toBe(1);
//     expect(mockWhatsSocket.SentMessages[0].content.react.text).toBe("👍");
//     expect(mockWhatsSocket.SentMessages[0].content.react.key).toEqual(fakeMsg.key);
//   });

//   it("WhenSendingReactionQueuedRaw_ShouldBeSentRaw", async () => {
//     await sender.ReactEmojiToMsg(fakeChatId, fakeMsg, "👍", { sendRawWithoutEnqueue: true });
//     expect(mockWhatsSocket.SentMessages[0].isRawMsg).toBe(true);
//   });

//   it("WhenSendingReactionQueuedSafe_ShouldBeSentSafe", async () => {
//     await sender.ReactEmojiToMsg(fakeChatId, fakeMsg, "👍", { sendRawWithoutEnqueue: false });
//     expect(mockWhatsSocket.SentMessages[0].isRawMsg).toBe(false);
//   });

//   it("WhenSendingInvalidReaction_NotStringOrLengthNot1_ShouldThrow", async () => {
//     await expect(sender.ReactEmojiToMsg(fakeChatId, fakeMsg, "👍👍")).rejects.toThrow(/non-emoji reaction/);
//     await expect(sender.ReactEmojiToMsg(fakeChatId, fakeMsg, "" as any)).rejects.toThrow(/non-emoji reaction/);
//   });
// });

// describe("Stickers", () => {
//   const mockWhatsSocket = new WhatsSocketMockMinimum();
//   const sender = new WhatsSocketSugarSender(mockWhatsSocket);

//   beforeEach(() => {
//     fs.writeFileSync('./fakesticker.webp', 'fakestickerdata');
//     mockWhatsSocket.ClearMock();
//   });

//   it("WhenSendingStickerWithBuffer_ShouldSendIt", async () => {
//     await sender.Sticker(fakeChatId, Buffer.from('fakestickerdata'));
//     expect(mockWhatsSocket.SentMessages.length).toBe(1);
//     expect(mockWhatsSocket.SentMessages[0].content.sticker).toBeInstanceOf(Buffer);
//   });

//   it("WhenSendingStickerWithLocalPath_ShouldSendItAsUrl", async () => {
//     await sender.Sticker(fakeChatId, './fakesticker.webp');
//     expect(mockWhatsSocket.SentMessages.length).toBe(1);
//     expect(mockWhatsSocket.SentMessages[0].content.sticker.url).toBe('./fakesticker.webp');
//   });

//   it("WhenSendingStickerQueuedRaw_ShouldBeSentRaw", async () => {
//     await sender.Sticker(fakeChatId, Buffer.from('fakestickerdata'), { sendRawWithoutEnqueue: true });
//     expect(mockWhatsSocket.SentMessages[0].isRawMsg).toBe(true);
//   });

//   it("WhenSendingStickerQueuedSafe_ShouldBeSentSafe", async () => {
//     await sender.Sticker(fakeChatId, Buffer.from('fakestickerdata'), { sendRawWithoutEnqueue: false });
//     expect(mockWhatsSocket.SentMessages[0].isRawMsg).toBe(false);
//   });

//   it("WhenSendingStickerWithInvalidPath_ShouldThrow", async () => {
//     await expect(sender.Sticker(fakeChatId, '/nonexistent.webp')).rejects.toThrow(/coudn't find stickerUrlSource/);
//   });
// });

// describe("Audio", () => {
//   const mockWhatsSocket = new WhatsSocketMockMinimum();
//   const sender = new WhatsSocketSugarSender(mockWhatsSocket);
//   const fakeMsg: WAMessage = { message: { audioMessage: { mimetype: 'audio/ogg' } } } as unknown as WAMessage;

//   beforeEach(() => {
//     fs.writeFileSync('./fakeaudio.mp3', 'fakeaudiodata');
//     mockWhatsSocket.ClearMock();
//   });

//   it("WhenSendingAudioWithBuffer_ShouldSendIt", async () => {
//     await sender.Audio(fakeChatId, Buffer.from('fakeaudiodata'));
//     expect(mockWhatsSocket.SentMessages.length).toBe(1);
//     expect(mockWhatsSocket.SentMessages[0].content.audio).toBeInstanceOf(Buffer);
//     expect(mockWhatsSocket.SentMessages[0].content.mimetype).toBe('audio/mpeg');
//   });

//   it("WhenSendingAudioWithLocalPath_ShouldSendIt", async () => {
//     await sender.Audio(fakeChatId, './fakeaudio.mp3');
//     expect(mockWhatsSocket.SentMessages.length).toBe(1);
//     expect(mockWhatsSocket.SentMessages[0].content.audio).toBeInstanceOf(Buffer);
//     expect(mockWhatsSocket.SentMessages[0].content.mimetype).toBe('audio/mpeg');
//   });

//   it("WhenSendingAudioWithOggPath_ShouldUseCorrectMimetype", async () => {
//     fs.writeFileSync('./fakeaudio.ogg', 'fakeaudiodata');
//     await sender.Audio(fakeChatId, './fakeaudio.ogg');
//     expect(mockWhatsSocket.SentMessages[0].content.mimetype).toBe('audio/ogg');
//   });

//   it("WhenSendingAudioWithRemoteUrl_ShouldFetchAndSendIt", async () => {
//     const fetchMock = mock(async () => ({
//       ok: true,
//       arrayBuffer: async () => new ArrayBuffer(10),
//     }));
//     global.fetch = fetchMock as any;
//     await sender.Audio(fakeChatId, 'https://fake.com/audio.mp3');
//     expect(fetchMock).toHaveBeenCalledTimes(1);
//     expect(mockWhatsSocket.SentMessages.length).toBe(1);
//     expect(mockWhatsSocket.SentMessages[0].content.audio).toBeInstanceOf(Buffer);
//   });

//   it("WhenSendingAudioWithWAMessage_ShouldDownloadAndSendIt", async () => {
//     const downloadMock = mock(async () => Buffer.from('downloadeddata'));
//     // Assume downloadMediaMessage is mocked or available
//     // For simplicity, assuming it works; in real test, mock '@whiskeysockets/baileys'
//     await sender.Audio(fakeChatId, fakeMsg);
//     expect(mockWhatsSocket.SentMessages.length).toBe(1);
//     expect(mockWhatsSocket.SentMessages[0].content.audio).toBeInstanceOf(Buffer);
//     expect(mockWhatsSocket.SentMessages[0].content.mimetype).toBe('audio/ogg');
//   });

//   it("WhenSendingAudioQueuedRaw_ShouldBeSentRaw", async () => {
//     await sender.Audio(fakeChatId, Buffer.from('fakeaudiodata'), { sendRawWithoutEnqueue: true });
//     expect(mockWhatsSocket.SentMessages[0].isRawMsg).toBe(true);
//   });

//   it("WhenSendingAudioWithInvalidSource_ShouldLogError", async () => {
//     // Since it console.errors and returns, check no sent
//     await sender.Audio(fakeChatId, {} as any);
//     expect(mockWhatsSocket.SentMessages.length).toBe(0);
//   });
// });

// describe("Videos", () => {
//   const mockWhatsSocket = new WhatsSocketMockMinimum();
//   const sender = new WhatsSocketSugarSender(mockWhatsSocket);

//   beforeEach(() => {
//     fs.writeFileSync('./fakevideo.mp4', 'fakevideodata');
//     mockWhatsSocket.ClearMock();
//   });

//   it("WhenSendingVideo_ShouldSendIt", async () => {
//     await sender.Video(fakeChatId, { sourcePath: './fakevideo.mp4' });
//     expect(mockWhatsSocket.SentMessages.length).toBe(1);
//     expect(mockWhatsSocket.SentMessages[0].content.video).toBeInstanceOf(Buffer);
//     expect(mockWhatsSocket.SentMessages[0].content.mimetype).toBe("video/mp4");
//   });

//   it("WhenSendingVideoWithCaptionNormalized_ShouldSendItNormalized", async () => {
//     await sender.Video(fakeChatId, { sourcePath: './fakevideo.mp4', caption: "     \n\nVideo Caption             \n\n\n" }, { normalizeMessageText: true });
//     expect(mockWhatsSocket.SentMessages[0].content.caption).toBe("Video Caption");
//   });

//   it("WhenSendingVideoWithMovExt_ShouldUseCorrectMimetype", async () => {
//     fs.writeFileSync('./fakevideo.mov', 'fakevideodata');
//     await sender.Video(fakeChatId, { sourcePath: './fakevideo.mov' });
//     expect(mockWhatsSocket.SentMessages[0].content.mimetype).toBe("video/mov");
//   });

//   it("WhenSendingVideoWithBuffer_ShouldSendItWithDefaultMimetype", async () => {
//     await sender.Video(fakeChatId, { sourcePath: Buffer.from('fakevideodata') });
//     expect(mockWhatsSocket.SentMessages[0].content.mimetype).toBe("video/mp4");
//   });

//   it("WhenSendingVideoQueuedRaw_ShouldBeSentRaw", async () => {
//     await sender.Video(fakeChatId, { sourcePath: Buffer.from('fakevideodata') }, { sendRawWithoutEnqueue: true });
//     expect(mockWhatsSocket.SentMessages[0].isRawMsg).toBe(true);
//   });
// });

// describe("Polls", () => {
//   const mockWhatsSocket = new WhatsSocketMockMinimum();
//   const sender = new WhatsSocketSugarSender(mockWhatsSocket);

//   beforeEach(() => {
//     mockWhatsSocket.ClearMock();
//   });

//   it("WhenSendingSingleSelectPoll_ShouldSendIt", async () => {
//     await sender.Poll(fakeChatId, "Question?", ["Opt1", "Opt2"], { withMultiSelect: false });
//     expect(mockWhatsSocket.SentMessages.length).toBe(1);
//     expect(mockWhatsSocket.SentMessages[0].content.poll.name).toBe("Question?");
//     expect(mockWhatsSocket.SentMessages[0].content.poll.values).toEqual(["Opt1", "Opt2"]);
//     expect(mockWhatsSocket.SentMessages[0].content.poll.selectableCount).toBe(1);
//   });

//   it("WhenSendingMultiSelectPoll_ShouldSendIt", async () => {
//     await sender.Poll(fakeChatId, "Question?", ["Opt1", "Opt2"], { withMultiSelect: true });
//     expect(mockWhatsSocket.SentMessages[0].content.poll.selectableCount).toBe(0);
//   });

//   it("WhenSendingPollWithNormalizedTitleAndOptions_ShouldNormalize", async () => {
//     await sender.Poll(fakeChatId, "     \n\nQuestion?             \n\n\n", ["     Opt1     ", "Opt2\n\n"], { normalizeTitleText: true, normalizeOptionsText: true, withMultiSelect: false });
//     expect(mockWhatsSocket.SentMessages[0].content.poll.name).toBe("Question?");
//     expect(mockWhatsSocket.SentMessages[0].content.poll.values).toEqual(["Opt1", "Opt2"]);
//   });

//   it("WhenSendingPollQueuedRaw_ShouldBeSentRaw", async () => {
//     await sender.Poll(fakeChatId, "Question?", ["Opt1"], { withMultiSelect: false }, { sendRawWithoutEnqueue: true });
//     expect(mockWhatsSocket.SentMessages[0].isRawMsg).toBe(true);
//   });

//   it("WhenSendingPollWithInvalidSelectionsCount_ShouldThrow", async () => {
//     await expect(sender.Poll(fakeChatId, "Q", [], { withMultiSelect: false })).rejects.toThrow(/less than 1 options or greather than 12/);
//     await expect(sender.Poll(fakeChatId, "Q", new Array(13).fill("Opt"), { withMultiSelect: false })).rejects.toThrow(/less than 1 options or greather than 12/);
//   });
// });

// describe("Ubications", () => {
//   const mockWhatsSocket = new WhatsSocketMockMinimum();
//   const sender = new WhatsSocketSugarSender(mockWhatsSocket);

//   beforeEach(() => {
//     mockWhatsSocket.ClearMock();
//   });

//   it("WhenSendingUbication_ShouldSendIt", async () => {
//     await sender.Ubication(fakeChatId, { degreesLatitude: 40.7128, degreesLongitude: -74.0060, name: "NYC", addressText: "New York" });
//     expect(mockWhatsSocket.SentMessages.length).toBe(1);
//     expect(mockWhatsSocket.SentMessages[0].content.location.degreesLatitude).toBe(40.7128);
//     expect(mockWhatsSocket.SentMessages[0].content.location.degreesLongitude).toBe(-74.0060);
//     expect(mockWhatsSocket.SentMessages[0].content.location.name).toBe("NYC");
//     expect(mockWhatsSocket.SentMessages[0].content.location.address).toBe("New York");
//   });

//   it("WhenSendingUbicationQueuedRaw_ShouldBeSentRaw", async () => {
//     await sender.Ubication(fakeChatId, { degreesLatitude: 0, degreesLongitude: 0, name: "", addressText: "" }, { sendRawWithoutEnqueue: true });
//     expect(mockWhatsSocket.SentMessages[0].isRawMsg).toBe(true);
//   });

//   it("WhenSendingInvalidUbicationCoordinates_ShouldThrow", async () => {
//     await expect(sender.Ubication(fakeChatId, { degreesLatitude: 100, degreesLongitude: 0, name: "", addressText: "" })).rejects.toThrow(/Invalid coordinates/);
//     await expect(sender.Ubication(fakeChatId, { degreesLatitude: 0, degreesLongitude: -200, name: "", addressText: "" })).rejects.toThrow(/Invalid coordinates/);
//   });
// });

// describe("Contacts", () => {
//   const mockWhatsSocket = new WhatsSocketMockMinimum();
//   const sender = new WhatsSocketSugarSender(mockWhatsSocket);

//   beforeEach(() => {
//     mockWhatsSocket.ClearMock();
//   });

//   it("WhenSendingSingleContact_ShouldSendIt", async () => {
//     await sender.Contact(fakeChatId, { name: "Test User", phone: "5211234567890" });
//     expect(mockWhatsSocket.SentMessages.length).toBe(1);
//     expect(mockWhatsSocket.SentMessages[0].content.contacts.displayName).toBe("Test User");
//     expect(mockWhatsSocket.SentMessages[0].content.contacts.contacts[0].vcard).toContain("FN:Test User");
//     expect(mockWhatsSocket.SentMessages[0].content.contacts.contacts[0].vcard).toContain("waid=5211234567890");
//   });

//   it("WhenSendingMultipleContacts_ShouldSendThem", async () => {
//     await sender.Contact(fakeChatId, [
//       { name: "User1", phone: "5211234567890" },
//       { name: "User2", phone: "5210987654321" }
//     ]);
//     expect(mockWhatsSocket.SentMessages.length).toBe(1);
//     expect(mockWhatsSocket.SentMessages[0].content.contacts.displayName).toBe("2 contacts");
//     expect(mockWhatsSocket.SentMessages[0].content.contacts.contacts.length).toBe(2);
//   });

//   it("WhenSendingContactQueuedRaw_ShouldBeSentRaw", async () => {
//     await sender.Contact(fakeChatId, { name: "Test", phone: "5211234567890" }, { sendRawWithoutEnqueue: true });
//     expect(mockWhatsSocket.SentMessages[0].isRawMsg).toBe(true);
//   });

//   it("WhenSendingInvalidContact_MissingFields_ShouldThrow", async () => {
//     await expect(sender.Contact(fakeChatId, { name: "", phone: "5211234567890" })).rejects.toThrow(/Invalid contact/);
//     await expect(sender.Contact(fakeChatId, { name: "Test", phone: "" })).rejects.toThrow(/Invalid contact/);
//   });
// });