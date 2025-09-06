import { type WAMessage } from "baileys";
import { describe, expect, it, test } from "bun:test";
import fs from "fs";
import { GetPath } from "../libs/BunPath";
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
} from "../mocks/MockManyTypesMsgs";
import { MsgType } from "../Msg.types";
import { MsgHelper_GetMsgTypeFromRawMsg, MsgHelper_GetQuotedMsgTextFrom, MsgHelper_GetTextFrom } from "./Msg.helper";

test("Mockdata from .json can be imported", () => {
  const mockMsgs: WAMessage[] = JSON.parse(fs.readFileSync(GetPath("src", "mocks", "./Msg.helper.mocks.json"), "utf-8"));
  expect(mockMsgs).toBeDefined();
  expect(mockMsgs.length).toBeGreaterThan(0);
  expect(Array.isArray(mockMsgs)).toBe(true);
});

describe("MsgHelper_GetTextFrom", () => {
  it("WhenGivenAValidTxtMessage_ShouldExtractTextMsg", () => {
    const txt = MsgHelper_GetTextFrom(txtMessage);
    expect(txt).not.toBeNull();
    expect(txt).toBe("Este es un mensaje de texto");
  });

  it("WhenGivenAValidTxtMessageQuoted_ShouldExtractTextMsg", () => {
    const txt = MsgHelper_GetTextFrom(quotedMsg);
    expect(txt).not.toBeNull();
    expect(txt).toBe("Este es un mensaje citando otro mensaje");
  });

  it("WhenGivenANonTextMsg_ShouldReturnNull", () => {
    for (const msg of noTxtMsgs) {
      const txt = MsgHelper_GetTextFrom(msg);
      expect(txt).toBeNull();
    }
  });

  it("WhenGivenImageWithCaption_ShouldExtractCaptionText", () => {
    const txt = MsgHelper_GetTextFrom(imageWithCaptionMsg);
    expect(txt).not.toBeNull();
    expect(txt).toBe("Este es una foto con un caption y emojis 🦊☝🏼");
  });

  it("WhenGivenImageWithoutCaption_ShouldReturnNull", () => {
    const expectedNull = MsgHelper_GetTextFrom(imageNoCaptionMsg);
    expect(expectedNull).toBeNull();
  });

  it("WhenGivenVideoWithCaption_ShouldExtractCaptionText", () => {
    const txt = MsgHelper_GetTextFrom(videoWithCaptionMsg);
    expect(txt).not.toBeNull();
    expect(txt).toBe("Este es un mensaje con video y un caption añadido");
  });

  it("WhenGivenVideoWithoutCaption_ShouldReturnNull", () => {
    const expectedNull = MsgHelper_GetTextFrom(videoNoCaptionMsg);
    expect(expectedNull).toBeNull();
  });
});

describe("MsgHelper_GetTextFromQuotedMsg", () => {
  it("WhenGivenAValidMessageWithQuote_ShouldExtractQuotedMsgTextOnly", () => {
    const quotedTxt = MsgHelper_GetQuotedMsgTextFrom(quotedMsg);
    expect(quotedTxt).not.toBeNull();
    expect(quotedTxt).toBe("Mensaje de la cita, soy otro mensaje!");
  });

  it("WhenGivenATxtMsgWithoutQuote_ShouldReturnNull", () => {
    const txt = MsgHelper_GetQuotedMsgTextFrom(txtMessage);
    expect(txt).toBeNull();
  });

  it("WhenGivenANonTextMessage_ShouldReturnNull", () => {
    for (const msg of noTxtMsgs) {
      const txt = MsgHelper_GetQuotedMsgTextFrom(msg);
      expect(txt).toBeNull();
    }
  });
});

test("MsgHelper_GetMsgTypeFromRawMsg", () => {
  let msgType: MsgType;

  msgType = MsgHelper_GetMsgTypeFromRawMsg(txtMessage);
  expect(msgType).toBe(MsgType.Text);

  msgType = MsgHelper_GetMsgTypeFromRawMsg(quotedMsg);
  expect(msgType).toBe(MsgType.Text);

  msgType = MsgHelper_GetMsgTypeFromRawMsg(stickerMsg);
  expect(msgType).toBe(MsgType.Sticker);

  msgType = MsgHelper_GetMsgTypeFromRawMsg(imageWithCaptionMsg);
  expect(msgType).toBe(MsgType.Image);

  msgType = MsgHelper_GetMsgTypeFromRawMsg(imageNoCaptionMsg);
  expect(msgType).toBe(MsgType.Image);

  msgType = MsgHelper_GetMsgTypeFromRawMsg(audioMsg);
  expect(msgType).toBe(MsgType.Audio);

  msgType = MsgHelper_GetMsgTypeFromRawMsg(videoNoCaptionMsg);
  expect(msgType).toBe(MsgType.Video);

  msgType = MsgHelper_GetMsgTypeFromRawMsg(videoWithCaptionMsg);
  expect(msgType).toBe(MsgType.Video);

  msgType = MsgHelper_GetMsgTypeFromRawMsg(pollMultipleAnswerMsg);
  expect(msgType).toBe(MsgType.Poll);

  msgType = MsgHelper_GetMsgTypeFromRawMsg(pollSingleAnswerMsg);
  expect(msgType).toBe(MsgType.Poll);

  msgType = MsgHelper_GetMsgTypeFromRawMsg(locationMsg);
  expect(msgType).toBe(MsgType.Location);

  msgType = MsgHelper_GetMsgTypeFromRawMsg(contactMsg);
  expect(msgType).toBe(MsgType.Contact);
});

// console.log(mockMsgs);
