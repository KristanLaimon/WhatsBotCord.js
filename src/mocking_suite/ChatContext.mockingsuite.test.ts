import { afterEach, beforeEach, expect, test } from "bun:test";
import { MsgType } from "../Msg.types.js";
import ChatContext_MockingSuite from "./ChatContext.mockingsuite.js";
import { MsgFactory_Audio, MsgFactory_Document, MsgFactory_Image, MsgFactory_Sticker, MsgFactory_Text, MsgFactory_Video } from "./MsgsMockFactory.js";
import WhatsSocket_Submodule_Receiver_MockingSuite from "./WhatsSocket.receiver.mockingsuite.js";
import WhatsSocket_Submodule_SugarSender_MockingSuite from "./WhatsSocket.sugarsender.mockingsuite.js";

let chatCtx: ChatContext_MockingSuite;
let receiverMock: WhatsSocket_Submodule_Receiver_MockingSuite;
let senderMock: WhatsSocket_Submodule_SugarSender_MockingSuite;

beforeEach(() => {
  receiverMock = new WhatsSocket_Submodule_Receiver_MockingSuite();
  senderMock = new WhatsSocket_Submodule_SugarSender_MockingSuite();

  chatCtx = new ChatContext_MockingSuite(
    "1234567890@s.whatsapp.net",
    "chatId@s.whatsapp.net",
    MsgFactory_Image("1234567890@s.whatsapp.net", null, "./img.png"),
    senderMock,
    receiverMock,
    {
      cancelKeywords: ["cancel"],
      ignoreSelfMessages: true,
      timeoutSeconds: 5,
    }
  );
});

afterEach(() => {
  chatCtx.ClearMocks();
  receiverMock.ClearMocks();
});

// ----------------------- Tests -----------------------

test("returns default buffer if no queued buffers", async () => {
  receiverMock.AddWaitMsg({ rawMsg: MsgFactory_Image("123@s.whatsapp.net", null, "./img.png") });

  const buf = await chatCtx.WaitMultimedia(MsgType.Image);
  expect(buf!.toString()).toBe("mock_buffer");
});

test("returns queued buffer instead of default", async () => {
  receiverMock.AddWaitMsg({ rawMsg: MsgFactory_Video("123@s.whatsapp.net", null, "./video.mp4") });

  const customBuf = Buffer.from("my_custom_video_buffer");
  chatCtx.EnqueueMediaBufferToReturn(customBuf);

  const buf = await chatCtx.WaitMultimedia(MsgType.Video);
  expect(buf).toBe(customBuf);
});

test("queues multiple buffers and returns in FIFO order", async () => {
  receiverMock.AddWaitMsg({ rawMsg: MsgFactory_Audio("123@s.whatsapp.net", null, "./song.mp3") });
  receiverMock.AddWaitMsg({ rawMsg: MsgFactory_Audio("123@s.whatsapp.net", null, "./undertale-song.wav") });

  const buf1 = Buffer.from("first_audio");
  const buf2 = Buffer.from("second_audio");

  chatCtx.EnqueueMediaBufferToReturn(buf1);
  chatCtx.EnqueueMediaBufferToReturn(buf2);

  const returned1 = await chatCtx.WaitMultimedia(MsgType.Audio);
  const returned2 = await chatCtx.WaitMultimedia(MsgType.Audio);

  expect(returned1).toBe(buf1);
  expect(returned2).toBe(buf2);
});

test("clears queued buffers and resets to default", async () => {
  receiverMock.AddWaitMsg({ rawMsg: MsgFactory_Sticker("123@s.whatsapp.net", null, "./my-sticker.webp") });

  const customBuf = Buffer.from("sticker_buffer");
  chatCtx.EnqueueMediaBufferToReturn(customBuf);

  chatCtx.ClearMocks();

  const buf = await chatCtx.WaitMultimedia(MsgType.Sticker);
  expect(buf!.toString()).toBe("mock_buffer");
});

test("throws error if receiver returns a wrong type", async () => {
  receiverMock.AddWaitMsg({ rawMsg: MsgFactory_Text("123@s.whatsapp.net", null, "Hello") });

  await expect(chatCtx.WaitMultimedia(MsgType.Image)).rejects.toThrow(/You have received a msg of type Text when you expected of type Image!/);
});

test("handles different multimedia types correctly", async () => {
  const typesFactories = {
    [MsgType.Image]: MsgFactory_Image,
    [MsgType.Video]: MsgFactory_Video,
    [MsgType.Audio]: MsgFactory_Audio,
    [MsgType.Document]: MsgFactory_Document,
    [MsgType.Sticker]: MsgFactory_Sticker,
  };

  for (const [type, factory] of Object.entries(typesFactories)) {
    receiverMock.AddWaitMsg({ rawMsg: factory("123@s.whatsapp.net", null, "./anything") });
    const buf = await chatCtx.WaitMultimedia(Number(type));
    expect(buf!.toString()).toBe("mock_buffer");
  }
});
