import type { AnyMessageContent, MiscMessageGenerationOptions } from 'baileys';
import type { IWhatsSocketMinimum } from '../IWhatsSocket';
import Delegate from 'src/libs/Delegate';

type SocketMsgQueueItem = {
  chatId: string,
  content: AnyMessageContent,
  misc?: MiscMessageGenerationOptions,
  resolve: (result: any) => void,
  reject: (reason: any) => void,
}

function Clone_MsgQueueItem(msgItem: SocketMsgQueueItem) {
  const toReturn = {
    chatId: msgItem.chatId,
    content: { ...msgItem.content },
    misc: { ...msgItem.misc },
    resolve: msgItem.resolve,
    reject: msgItem.reject,
  };
  return toReturn;
}

/**
 * A subclass code of 'WhatsSocket' class that manages a queue of messages to be sent.
 * Helps to prevent overwhelming the WhatsApp socket with too many messages at once incoming from
 * multiple users or a funny user trying to spam the bot.
 */
export default class WhatsSocketSenderQueue {
  /**
   * A getter that returns a deep copy of all elements currently in the queue as an array.
   * This is useful for debugging and logging purposes.
   * @returns A deep copy of all elements currently in the queue as an array.
   */
  public get ActualElementsInQueue() {
    return this.queue.map(queueItem => {
      return Clone_MsgQueueItem(queueItem)
    });
  }

  public onMessageSent: Delegate<(chatId: string, content: AnyMessageContent, misc?: MiscMessageGenerationOptions) => void> = new Delegate();

  private queue: SocketMsgQueueItem[] = [];
  private isProcessing: boolean = false;
  private whatsSocket: IWhatsSocketMinimum;
  private readonly minMillisecondsDelay: number;
  private readonly maxQueueLimit: number;

  private isStopped: boolean = false;

  constructor(socket: IWhatsSocketMinimum, maxQueueLimit: number = 3, minMilisecondsDelay: number = 1000) {
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
      if (!this.isProcessing && !this.isStopped) {
        this.ProcessQueue();
      }
    });
  }

  /**
   * Stops the queue from processing any more messages. This method is non-blocking. Any messages that are already in the queue
   * will be processed and sent, but no new messages will be added to the queue. Note that this method will not stop the underlying
   * WhatsApp socket from receiving or sending messages. You will need to call IWhatsSocket.Shutdown() to stop the socket completely.
   * @returns A promise that resolves when the queue has stopped processing messages.
   */
  public async StopGracefully(): Promise<void> {
    this.isStopped = true;
  }

  /**
   * Resumes the processing of the queue after being stopped. This will start processing all messages in the queue again.
   * @returns A promise that resolves when the queue has resumed processing messages.
   */
  public async Continue(): Promise<void> {
    this.isStopped = false;
    await this.ProcessQueue();
  }

  /**
   * Processes all messages in the queue one by one, respecting the minimum delay
   * between messages specified in the constructor.
   * @private
   */
  private async ProcessQueue(): Promise<void> {
    this.isProcessing = true;
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      try {
        await this.whatsSocket.SendRaw(item.chatId, item.content, item.misc);
        this.onMessageSent.CallAll(item.chatId, item.content, item.misc);
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