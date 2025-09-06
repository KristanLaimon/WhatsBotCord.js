import type { AnyMessageContent, MiscMessageGenerationOptions, WAMessage } from "baileys";
import { WhatsappGroupIdentifier, WhatsappLIDIdentifier } from "../../../Whatsapp.types";
import type { IMsgServiceSocketMinimum } from "../IWhatsSocket";
import type { MsgServiceSocketMessageSentMock } from "./types";

export default class WhatsSocketSocketMockMinimum implements IMsgServiceSocketMinimum {
  public SentMessages: MsgServiceSocketMessageSentMock[] = [];

  constructor() {
    this._SendSafe = this._SendSafe.bind(this);
    this._SendRaw = this._SendRaw.bind(this);
  }

  public async _SendSafe(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<WAMessage | null> {
    this.SentMessages.push({ chatId: chatId_JID, content, miscOptions: options });
    return {
      message: {
        conversation: "Mock Minimum Object WAMessage",
      },
      key: {
        fromMe: false,
        id: "23423423234" + WhatsappLIDIdentifier,
        remoteJid: "falseid" + WhatsappGroupIdentifier,
      },
    };
  }
  public async _SendRaw(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<WAMessage | null> {
    this.SentMessages.push({ chatId: chatId_JID, content, miscOptions: options });
    return {
      message: {
        conversation: "Mock Minimum Object WAMessage",
      },
      key: {
        fromMe: false,
        id: "23423423234" + WhatsappLIDIdentifier,
        remoteJid: "falseid" + WhatsappGroupIdentifier,
      },
    };
  }

  public ClearMock() {
    this.SentMessages = [];
  }
}
