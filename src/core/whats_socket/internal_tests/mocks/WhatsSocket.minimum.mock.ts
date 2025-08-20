import type { IWhatsSocketMinimum } from '../../IWhatsSocket';
import type { AnyMessageContent, MiscMessageGenerationOptions } from "baileys";




export default class WhatsSocketMinimum implements IWhatsSocketMinimum {

  // public MessagesEnqueued

  SendEnqueued(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<void> {
    throw new Error('Method not implemented.');
  }
  SendRaw(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<void> {
    throw new Error('Method not implemented.');
  }

}