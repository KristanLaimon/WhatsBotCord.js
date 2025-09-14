import { type ChatContextConfig, ChatContext } from "../core/bot/internals/ChatContext.js";
import type { WhatsMsgSenderSendingOptions } from "../core/whats_socket/internals/WhatsSocket.sugarsenders.js";
import type { WhatsappMessage } from "../core/whats_socket/types.js";
import { autobind } from "../helpers/Decorators.helper.js";

export default class ChatContextSpy extends ChatContext {
  public SentFromCommand_Texts: Array<{
    text: string;
    options?: WhatsMsgSenderSendingOptions;
  }> = [];

  public PromisesQueue: Array<Promise<any>> = [];

  @autobind
  public override SendText(text: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    console.log("ChatContextSpy.SendText called with text:", text);
    this.SentFromCommand_Texts.push({ text: text, options: options });
    const toReturn = super.SendText(text, options);
    this.PromisesQueue.push(toReturn);
    return toReturn;
  }

  @autobind
  public override WaitText(localOptions?: Partial<ChatContextConfig>): Promise<string | null> {
    console.log("ChatContextSpy.WaitText called with options:", localOptions);
    const toReturn = super.WaitText(localOptions);
    this.PromisesQueue.push(toReturn);
    toReturn.then(
      (result) => console.log("WaitText resolved with:", result),
      (error) => console.error("WaitText rejected with:", error)
    );
    return toReturn;
  }

  @autobind
  public async ExecuteAllInOrder(): Promise<void> {
    console.log("Executing PromisesQueue, length:", this.PromisesQueue.length);
    const errors: any[] = [];
    for (const promise of this.PromisesQueue) {
      try {
        await promise;
      } catch (error) {
        errors.push(error);
        console.error("Error in ExecuteAllInOrder:", error);
      }
    }
    this.PromisesQueue = [];
    console.log("PromisesQueue cleared");
    if (errors.length > 0) {
      throw new Error(`ExecuteAllInOrder encountered ${errors.length} errors: ${JSON.stringify(errors)}`);
    }
  }

  public reset(): void {
    this.SentFromCommand_Texts = [];
    this.PromisesQueue = [];
  }
}
