import type { IWhatsSocketMinimum } from '../IWhatsSocket';
import type { AnyMessageContent, MiscMessageGenerationOptions } from "baileys";
import type { WhatsSocketMessageSentMock } from './types';




export default class WhatsSocketMockMinimum implements IWhatsSocketMinimum {
  public SentMessages: WhatsSocketMessageSentMock[] = [];

  constructor() {
    this.SendSafe = this.SendSafe.bind(this);
    this.SendRaw = this.SendRaw.bind(this);
  }

  public async SendSafe(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<void> {
    this.SentMessages.push({ chatId: chatId_JID, content, miscOptions: options, isRawMsg: false })
  }
  public async SendRaw(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<void> {
    this.SentMessages.push({ chatId: chatId_JID, content, miscOptions: options, isRawMsg: true })
  }

  public ClearMock() {
    this.SentMessages = [];
  }
}