import Bot from "src/core/bot/bot";
import { MsgHelper_GetTextFrom } from "src/helpers/Msg.helper";
import { MsgType } from "src/Msg.types";

const bot = new Bot({ credentialsFolder: "./auth", loggerMode: "silent" });

bot.Events.onIncomingMsg.Subscribe(
  (_senderId, chatId, _rawMsg, msgType, _senderType) => {
    if (msgType === MsgType.Text) {
      const txt = MsgHelper_GetTextFrom(_rawMsg);
      if (txt) {
        bot.SendMsg.Text(chatId, txt);
      }
    }
  }
);

bot.Start();
