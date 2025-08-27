import type { IWhatsSocketMinimum } from '../IWhatsSocket';
import type { WAMessage, AnyMessageContent, MiscMessageGenerationOptions } from "baileys";
import type { WhatsSocketMessageSentMock } from './types';
import { WhatsappLIDIdentifier, WhatsappGroupIdentifier } from 'src/Whatsapp.types';



export default class WhatsSocketMockMinimum implements IWhatsSocketMinimum {
  public SentMessages: WhatsSocketMessageSentMock[] = [];

  constructor() {
    this.SendSafe = this.SendSafe.bind(this);
    this.SendRaw = this.SendRaw.bind(this);
  }

  public async SendSafe(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<WAMessage | null> {
    this.SentMessages.push({ chatId: chatId_JID, content, miscOptions: options })
    return {
      message: {
        conversation: "Mock Minimum Object WAMessage",
      },
      key: {
        fromMe: false,
        id: "23423423234" + WhatsappLIDIdentifier,
        remoteJid: "falseid" + WhatsappGroupIdentifier
      }
    };
  }
  public async SendRaw(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<WAMessage | null> {
    this.SentMessages.push({ chatId: chatId_JID, content, miscOptions: options })
    return {
      message: {
        conversation: "Mock Minimum Object WAMessage",
      },
      key: {
        fromMe: false,
        id: "23423423234" + WhatsappLIDIdentifier,
        remoteJid: "falseid" + WhatsappGroupIdentifier
      }
    };
  }

  public ClearMock() {
    this.SentMessages = [];
  }
}