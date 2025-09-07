import { bot } from "./index.main";

//Max text validation middleware
bot.Use(async (_senderId, chatId, rawMsg, msgType, _senderType, next) => {
  if (msgType === MsgType.Text) {
    const txt: string | null = MsgHelpers.FullMsg_GetText(rawMsg);
    if (txt && txt?.length > 1000) {
      bot.SendMsg.Text(chatId, "To muuch text!!!");
      return;
    }
  }
  next();
});
