import { it, test, expect, describe } from "./TestSuite";
import fs from "fs";
import { type WAMessage } from "baileys";
import { GetPath } from './BunPath';
import { MsgHelper_GetTextFrom } from './Msg.helper';

test("Mockdata from .json can be imported", () => {
  const mockMsgs: WAMessage[] = JSON.parse(fs.readFileSync(GetPath("src", "./Msg.helper.mocks.json"), "utf-8"));
  expect(mockMsgs).toBeDefined();
  expect(mockMsgs.length).toBeGreaterThan(0);
  expect(mockMsgs).toBeArray();
})

const mockMsgs: WAMessage[] = JSON.parse(fs.readFileSync(GetPath("src", "./Msg.helper.mocks.json"), "utf-8"));

//NOTE: The order of messages is fixed and explained in file "Msg.helper.mockinfo.md" in this same folder. Check it out for more details.
const txtMessage: WAMessage = mockMsgs[0]!;
const quotedMsg: WAMessage = mockMsgs[1]!;

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
  })

  it("WhenGivenAnInvalidMessage_ShouldReturnNull", () => {
    //The first msg is a text message, and the second is a quoted message, so we skip them
    const allOtherMsgs = mockMsgs.slice(2);
    for (const msg of allOtherMsgs) {
      const txt = MsgHelper_GetTextFrom(msg);
      expect(txt).toBeNull();
    }
  })
});

describe("MsgHelper_GetTextFromQuotedMsg", () => {
  // it("WhenGivenAValidMessage_")
});

// console.log(mockMsgs);


