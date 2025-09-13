import { describe, expect, it } from "bun:test";
import { MockGroupTxtMsg as GroupTxtMsg, MockIndividualTxtMsg as IndividualTxtMsg } from "../mocks/MockIndividualGroup.mock.js";
import {
  type WhatsappIDInfo,
  WhatsappHelper_ExtractWhatsappInfoFromMention,
  WhatsappHelper_ExtractWhatsappInfoInfoFromSenderRawMsg,
  WhatsappHelper_isLIDIdentifier,
  WhatsappHelper_isMentionId,
  WhatsappIdType,
} from "./Whatsapp.helper.js";

describe("WhatsappHelper_ExtractWhatsappIdFromSender", () => {
  it("WhenMsgFromGroup_ShouldExtractWhatsappLID_id_Correctly", () => {
    const res: WhatsappIDInfo = WhatsappHelper_ExtractWhatsappInfoInfoFromSenderRawMsg(GroupTxtMsg);
    expect(res.WhatsappIdType).toBe(WhatsappIdType.Modern);
    expect(res.asMentionFormatted).toBe("@999888777666");
    expect(res.rawId).toBe("999888777666@lid");
  });
  it("WhenIndividualGroup_ShouldExtractWhatsappFull_idinfo_Correctly", () => {
    const res: WhatsappIDInfo = WhatsappHelper_ExtractWhatsappInfoInfoFromSenderRawMsg(IndividualTxtMsg);
    expect(res.WhatsappIdType).toBe(WhatsappIdType.Legacy);
    expect(res.asMentionFormatted).toBe("@555123456789");
    expect(res.rawId).toBe("555123456789@s.whatsapp.net");
  });
});

describe("WhatsappHelper Auxiliary Functions", () => {
  it("WhatsappHelper_isLIDIdentifier should return true for valid LID IDs", () => {
    expect(WhatsappHelper_isLIDIdentifier("123456789012@lid")).toBe(true);
    expect(WhatsappHelper_isLIDIdentifier("999888777666@lid")).toBe(true);
    expect(WhatsappHelper_isLIDIdentifier("1234567890@s.whatsapp.net")).toBe(false);
    expect(WhatsappHelper_isLIDIdentifier("invalid@lid")).toBe(false);
  });

  it("WhatsappHelper_isMentionId should correctly identify mention IDs", () => {
    expect(WhatsappHelper_isMentionId("@123456789012")).toBe(true);
    expect(WhatsappHelper_isMentionId("@999888777666")).toBe(true);
    expect(WhatsappHelper_isMentionId("123456789012")).toBe(false);
    expect(WhatsappHelper_isMentionId("@abc123")).toBe(false);
    expect(WhatsappHelper_isMentionId("@12345@lid")).toBe(false);
  });

  it("WhatsappHelper_ExtractWhatsappIdFromMention should extract LID info correctly", () => {
    const mention = "@999888777666";
    const res = WhatsappHelper_ExtractWhatsappInfoFromMention(mention);
    expect(res).not.toBeNull();
    expect(res?.rawId).toBe("999888777666@lid");
    expect(res?.asMentionFormatted).toBe(mention);
    expect(res?.WhatsappIdType).toBe(WhatsappIdType.Modern);

    // invalid mention
    expect(WhatsappHelper_ExtractWhatsappInfoFromMention("123456")).toBeNull();
    expect(WhatsappHelper_ExtractWhatsappInfoFromMention("999888777666")).toBeNull();
  });

  it("WhatsappHelper_isFullWhatsappIdUser should identify full WhatsApp IDs correctly", () => {
    // Indirect test via regex
    expect(WhatsappHelper_ExtractWhatsappInfoInfoFromSenderRawMsg(IndividualTxtMsg).WhatsappIdType).toBe(WhatsappIdType.Legacy);
    // false cases
    expect(() => WhatsappHelper_ExtractWhatsappInfoInfoFromSenderRawMsg(GroupTxtMsg)).not.toThrow();
  });
});
