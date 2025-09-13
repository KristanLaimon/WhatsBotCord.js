import { type WAMessage } from "baileys";
import { describe, expect, it, test } from "bun:test";
import fs from "fs";
import { GetPath } from "../libs/BunPath.js";
import {
  audioMsg,
  contactMsg,
  imageNoCaptionMsg,
  imageWithCaptionMsg,
  locationMsg,
  noTxtMsgs,
  pollMultipleAnswerMsg,
  pollSingleAnswerMsg,
  quotedMsg,
  stickerMsg,
  txtMessage,
  videoNoCaptionMsg,
  videoWithCaptionMsg,
} from "../mocks/MockManyTypesMsgs.mock.js";
import { MsgType } from "../Msg.types.js";
import { MsgHelper_FullMsg_GetMsgType, MsgHelper_FullMsg_GetQuotedMsgText, MsgHelper_FullMsg_GetText } from "./Msg.helper.js";

test("Mockdata from .json can be imported", () => {
  const mockMsgs: WAMessage[] = JSON.parse(fs.readFileSync(GetPath("src", "mocks", "./Msg.helper.mocks.json"), "utf-8"));
  expect(mockMsgs).toBeDefined();
  expect(mockMsgs.length).toBeGreaterThan(0);
  expect(Array.isArray(mockMsgs)).toBe(true);
});

describe("MsgHelper_GetTextFrom", () => {
  it("WhenGivenAValidTxtMessage_ShouldExtractTextMsg", () => {
    const txt = MsgHelper_FullMsg_GetText(txtMessage);
    expect(txt).not.toBeNull();
    expect(txt).toBe("Este es un mensaje de texto");
  });

  it("WhenGivenAValidTxtMessageQuoted_ShouldExtractTextMsg", () => {
    const txt = MsgHelper_FullMsg_GetText(quotedMsg);
    expect(txt).not.toBeNull();
    expect(txt).toBe("Este es un mensaje citando otro mensaje");
  });

  it("WhenGivenANonTextMsg_ShouldReturnNull", () => {
    for (const msg of noTxtMsgs) {
      const txt = MsgHelper_FullMsg_GetText(msg);
      expect(txt).toBeNull();
    }
  });

  it("WhenGivenImageWithCaption_ShouldExtractCaptionText", () => {
    const txt = MsgHelper_FullMsg_GetText(imageWithCaptionMsg);
    expect(txt).not.toBeNull();
    expect(txt).toBe("Este es una foto con un caption y emojis 🦊☝🏼");
  });

  it("WhenGivenImageWithoutCaption_ShouldReturnNull", () => {
    const expectedNull = MsgHelper_FullMsg_GetText(imageNoCaptionMsg);
    expect(expectedNull).toBeNull();
  });

  it("WhenGivenVideoWithCaption_ShouldExtractCaptionText", () => {
    const txt = MsgHelper_FullMsg_GetText(videoWithCaptionMsg);
    expect(txt).not.toBeNull();
    expect(txt).toBe("Este es un mensaje con video y un caption añadido");
  });

  it("WhenGivenVideoWithoutCaption_ShouldReturnNull", () => {
    const expectedNull = MsgHelper_FullMsg_GetText(videoNoCaptionMsg);
    expect(expectedNull).toBeNull();
  });
});

describe("MsgHelper_GetTextFromQuotedMsg", () => {
  it("WhenGivenAValidMessageWithQuote_ShouldExtractQuotedMsgTextOnly", () => {
    const quotedTxt = MsgHelper_FullMsg_GetQuotedMsgText(quotedMsg);
    expect(quotedTxt).not.toBeNull();
    expect(quotedTxt).toBe("Mensaje de la cita, soy otro mensaje!");
  });

  it("WhenGivenATxtMsgWithoutQuote_ShouldReturnNull", () => {
    const txt = MsgHelper_FullMsg_GetQuotedMsgText(txtMessage);
    expect(txt).toBeNull();
  });

  it("WhenGivenANonTextMessage_ShouldReturnNull", () => {
    for (const msg of noTxtMsgs) {
      const txt = MsgHelper_FullMsg_GetQuotedMsgText(msg);
      expect(txt).toBeNull();
    }
  });
});

test("MsgHelper_GetMsgTypeFromRawMsg", () => {
  let msgType: MsgType;

  msgType = MsgHelper_FullMsg_GetMsgType(txtMessage);
  expect(msgType).toBe(MsgType.Text);

  msgType = MsgHelper_FullMsg_GetMsgType(quotedMsg);
  expect(msgType).toBe(MsgType.Text);

  msgType = MsgHelper_FullMsg_GetMsgType(stickerMsg);
  expect(msgType).toBe(MsgType.Sticker);

  msgType = MsgHelper_FullMsg_GetMsgType(imageWithCaptionMsg);
  expect(msgType).toBe(MsgType.Image);

  msgType = MsgHelper_FullMsg_GetMsgType(imageNoCaptionMsg);
  expect(msgType).toBe(MsgType.Image);

  msgType = MsgHelper_FullMsg_GetMsgType(audioMsg);
  expect(msgType).toBe(MsgType.Audio);

  msgType = MsgHelper_FullMsg_GetMsgType(videoNoCaptionMsg);
  expect(msgType).toBe(MsgType.Video);

  msgType = MsgHelper_FullMsg_GetMsgType(videoWithCaptionMsg);
  expect(msgType).toBe(MsgType.Video);

  msgType = MsgHelper_FullMsg_GetMsgType(pollMultipleAnswerMsg);
  expect(msgType).toBe(MsgType.Poll);

  msgType = MsgHelper_FullMsg_GetMsgType(pollSingleAnswerMsg);
  expect(msgType).toBe(MsgType.Poll);

  msgType = MsgHelper_FullMsg_GetMsgType(locationMsg);
  expect(msgType).toBe(MsgType.Ubication);

  msgType = MsgHelper_FullMsg_GetMsgType(contactMsg);
  expect(msgType).toBe(MsgType.Contact);
});

// console.log(mockMsgs);
