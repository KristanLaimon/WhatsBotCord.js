import type { AnyMessageContent, MiscMessageGenerationOptions } from "baileys";

export type WhatsSocketMockMsgSent = {
  chatId: string;
  content: AnyMessageContent;
  miscOptions?: MiscMessageGenerationOptions;
};
