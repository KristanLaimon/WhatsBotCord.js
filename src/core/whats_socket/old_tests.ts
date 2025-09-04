import { downloadMediaMessage } from "baileys";
import dotenv from "dotenv";
import { MsgHelper_GetTextFrom } from "../../helpers/Msg.helper";
import { MsgType } from "../../Msg.types";
import WhatsSocket from "./WhatsSocket";
dotenv.config({ path: "./env.development", quiet: true });

import fs from "fs";
import { GetPath } from "../../libs/BunPath";

const socket = new WhatsSocket({
  credentialsFolder: "./auth",
  loggerMode: "silent",
  maxReconnectionRetries: 5,
  ignoreSelfMessage: true,
  delayMilisecondsBetweenMsgs: 10,
});

socket.onIncomingMsg.Subscribe(async (senderId, chatId, rawMsg, msgType, senderType) => {
  if (msgType === MsgType.Text) {
    const msg = MsgHelper_GetTextFrom(rawMsg)!;
    console.log(`Msg: ${msg} | SenderId: ${senderId} | ChatId: ${chatId} | Type: ${msgType} | SenderType: ${senderType}`);
    await socket.Send.Text(chatId, msg ?? "Wtf");
  }

  if (msgType === MsgType.Sticker) {
    console.log("Msg (STICKER)");
    const a: Buffer = await downloadMediaMessage(rawMsg, "buffer", {});
    await socket.Send.Sticker(chatId, a);

    if (!fs.existsSync("./TEST")) {
      fs.mkdirSync("./TEST");
    }
    const fileName = `sticker_${Date.now()}.webp`;
    const filePath = GetPath("TEST", fileName);
    fs.writeFileSync(filePath, a);
  }
});

socket
  .Start()
  .then(() => {
    console.log("WhatsSocket initialized successfully!");
  })
  .catch((error) => {
    console.error("Error initializing WhatsSocket:", error);
  });
