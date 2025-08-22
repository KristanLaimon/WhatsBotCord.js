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
});

describe("ReactEmojiToMsg", () => {

});
