import type { AnyMessageContent, MiscMessageGenerationOptions } from "baileys";

export type WhatsSocketMessageSentMock = {
  chatId: string;
  content: AnyMessageContent;
  miscOptions?: MiscMessageGenerationOptions;
  isRawMsg: boolean;
}

