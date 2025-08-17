import type { AnyMessageContent, MiscMessageGenerationOptions } from 'baileys';
import WhatsSocket from './WhatsSocket';

type SocketMsgQueueItem = {
  chatId: string,
  content: AnyMessageContent,
  misc?: MiscMessageGenerationOptions,
  resolve: (result: any) => void,
  reject: (reason: any) => void,
}

/**
 * A subclass code of 'WhatsSocket' class that manages a queue of messages to be sent.
 * Helps to prevent overwhelming the WhatsApp socket with too many messages at once incoming from
 * multiple users or a funny user trying to spam the bot.
 */
export default class WhatsSocketSenderQueue {
  private queue: SocketMsgQueueItem[] = [];
  private isProcessing: boolean = false;
  private whatsSocket: WhatsSocket;
  private readonly minMillisecondsDelay: number;
  private readonly maxQueueLimit: number;

  constructor(socket: WhatsSocket, maxQueueLimit: number = 3, minMilisecondsDelay: number = 1000) {
    this.whatsSocket = socket;
    this.minMillisecondsDelay = minMilisecondsDelay;
    this.maxQueueLimit = maxQueueLimit;
  }

  public async Enqueue(chatId: string, content: AnyMessageContent, misc?: MiscMessageGenerationOptions): Promise<void> {
    if (this.queue.length >= this.maxQueueLimit) return;

    return new Promise((resolve, reject) => {
      this.queue.push({ chatId, content, misc, resolve, reject });
      this.ProcessQueue(); //Doesn't need to be waited, isn't it?

      if (!this.isProcessing) {
        this.isProcessing = true;
      }
    })
  }

  private async ProcessQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    const { chatId, content, misc, resolve, reject } = this.queue.shift()!;
    try {
      await this.whatsSocket.Send(chatId, content, misc);
      resolve(true);
    }
    catch (error) {
      reject(error);
    }
    await new Promise(resolve => setTimeout(resolve, this.minMillisecondsDelay));
    this.isProcessing = false;
    this.ProcessQueue();
  }
}