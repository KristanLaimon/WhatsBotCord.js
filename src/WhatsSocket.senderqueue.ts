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

  /**
   * Enqueues a message to be sent.
   * @param chatId ChatJID of the user.
   * @param content The content of the message.
   * @param misc Miscellaneous options.
   */
  public async Enqueue(chatId: string, content: AnyMessageContent, misc?: MiscMessageGenerationOptions): Promise<void> {
    if (this.queue.length >= this.maxQueueLimit) {
      throw new Error(`Queue limit of ${this.maxQueueLimit} reached. Please wait.`);
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ chatId, content, misc, resolve, reject });
      // Only start the processing loop if it's not already running.
      if (!this.isProcessing) {
        this.ProcessQueue();
      }
    });
  }


  private async ProcessQueue(): Promise<void> {
    this.isProcessing = true;
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      try {
        await this.whatsSocket.Send(item.chatId, item.content, item.misc);
        item.resolve(true);
      } catch (error) {
        item.reject(error);
      }
      // Wait for the delay before processing the next message.
      await new Promise(resolve => setTimeout(resolve, this.minMillisecondsDelay));
    }
    this.isProcessing = false;
  }
}