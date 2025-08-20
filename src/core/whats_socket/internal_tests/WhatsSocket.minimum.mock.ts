import type { IWhatsSocketMinimum } from '../IWhatsSocket';
import type { AnyMessageContent, MiscMessageGenerationOptions } from "baileys";
import type { WhatsSocketMessageSentMock } from './types';




export default class WhatsSocketMinimum implements IWhatsSocketMinimum {
  public MessagesSentHistory: WhatsSocketMessageSentMock[] = [];

  public async SendEnqueued(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<void> {
    this.MessagesSentHistory.push({ chatId: chatId_JID, content, miscOptions: options, isRawMsg: false })
  }
  public async SendRaw(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<void> {
    this.MessagesSentHistory.push({ chatId: chatId_JID, content, miscOptions: options, isRawMsg: true })
  }

  public Clear() {
    this.MessagesSentHistory = [];
  }
}