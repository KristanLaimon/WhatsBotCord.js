import { describe, expect, test } from "bun:test";
import {
  MsgFactory_Audio,
  MsgFactory_Contact,
  MsgFactory_Document,
  MsgFactory_Image,
  MsgFactory_Location,
  MsgFactory_Sticker,
  MsgFactory_Text,
  MsgFactory_TextWithQuote,
  MsgFactory_Video,
} from "./MsgsMockFactory.js";

describe("MsgFactory", () => {
  const chatId = "12345@s.whatsapp.net";
  const participant = "67890@s.whatsapp.net";

  test("MsgFactory_Text should produce a text message", () => {
    const text = "Hello world";
    const msg = MsgFactory_Text(chatId, participant, text, { pushName: "Alice" });

    expect(msg.key.remoteJid).toBe(chatId);
    expect(msg.key.participant).toBe(participant);
    expect(msg.pushName).toBe("Alice");
    //@ts-expect-error msg object always contain this prop
    expect(msg.message.conversation).toBe(text);
  });

  test("MsgFactory_TextWithQuote should reference original message", () => {
    const original = MsgFactory_Text(chatId, participant, "Original");
    const reply = MsgFactory_TextWithQuote(chatId, participant, "Reply", original, { pushName: "Bob" });

    //@ts-expect-error msg object always contain this prop
    expect(reply.message.extendedTextMessage.text).toBe("Reply");
    //@ts-expect-error msg object always contain this prop
    expect(reply.message.extendedTextMessage.contextInfo.stanzaId).toBe(original.key.id);
    //@ts-expect-error msg object always contain this prop
    expect(reply.message.extendedTextMessage.contextInfo.participant).toBe(participant);
  });

  test("MsgFactory_Image should include url and caption", () => {
    const url = "http://img.jpg";
    const caption = "Nice pic!";
    const msg = MsgFactory_Image(chatId, participant, url, { caption });

    //@ts-expect-error msg object always contain this prop
    expect(msg.message.imageMessage.url).toBe(url);
    //@ts-expect-error msg object always contain this prop
    expect(msg.message.imageMessage.caption).toBe(caption);
  });

  test("MsgFactory_Video should include url and caption", () => {
    const url = "http://video.mp4";
    const caption = "Video!";
    const msg = MsgFactory_Video(chatId, participant, url, { caption });

    //@ts-expect-error msg object always contain this prop
    expect(msg.message.videoMessage.url).toBe(url);
    //@ts-expect-error msg object always contain this prop
    expect(msg.message.videoMessage.caption).toBe(caption);
  });

  test("MsgFactory_Audio should include url", () => {
    const url = "http://audio.ogg";
    const msg = MsgFactory_Audio(chatId, participant, url);

    //@ts-expect-error msg object always contain this prop
    expect(msg.message.audioMessage.url).toBe(url);
  });

  test("MsgFactory_Sticker should include url and webp mimetype", () => {
    const url = "http://sticker.webp";
    const msg = MsgFactory_Sticker(chatId, participant, url);

    //@ts-expect-error msg object always contain this prop
    expect(msg.message.stickerMessage.url).toBe(url);
    //@ts-expect-error msg object always contain this prop
    expect(msg.message.stickerMessage.mimetype).toBe("image/webp");
  });

  test("MsgFactory_Document should include url, filename, and mimetype", () => {
    const url = "http://file.pdf";
    const msg = MsgFactory_Document(chatId, participant, url, { fileName: "report.pdf", mimetype: "application/pdf" });

    //@ts-expect-error msg object always contain this prop
    expect(msg.message.documentMessage.url).toBe(url);
    //@ts-expect-error msg object always contain this prop
    expect(msg.message.documentMessage.fileName).toBe("report.pdf");
    //@ts-expect-error msg object always contain this prop
    expect(msg.message.documentMessage.mimetype).toBe("application/pdf");
  });

  test("MsgFactory_Location should include coordinates and name", () => {
    const msg = MsgFactory_Location(chatId, participant, 19.4326, -99.1332, { name: "CDMX" });

    //@ts-expect-error msg object always contain this prop
    expect(msg.message.locationMessage.degreesLatitude).toBe(19.4326);
    //@ts-expect-error msg object always contain this prop
    expect(msg.message.locationMessage.degreesLongitude).toBe(-99.1332);
    //@ts-expect-error msg object always contain this prop
    expect(msg.message.locationMessage.name).toBe("CDMX");
  });

  test("MsgFactory_Contact should produce vCard correctly", () => {
    const contact = { contactName: "Chris", phoneNumber: "5217389273" };
    const msg = MsgFactory_Contact(chatId, participant, contact);

    //@ts-expect-error msg object always contain this prop
    expect(msg.message.contactsArrayMessage.contacts[0]!.displayName).toBe(contact.contactName);
    //@ts-expect-error msg object always contain this prop
    expect(msg.message.contactsArrayMessage.contacts[0]!.vcard).toContain(contact.phoneNumber);
    //@ts-expect-error msg object always contain this prop
    expect(msg.message.contactsArrayMessage.contacts[0]!.vcard).toContain(contact.contactName);
  });
});
