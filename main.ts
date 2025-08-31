import dotenv from "dotenv";
dotenv.config({ path: "./env.development", quiet: true });
import { MsgHelper_GetTextFrom } from './src/helpers/Msg.helper';
import { MsgType } from './src/Msg.types';
import WhatsSocket from './src/core/whats_socket/WhatsSocket'
import { downloadMediaMessage } from "baileys";

//DEV porpuses
import fs from "fs";
import { GetPath } from 'src/libs/BunPath';

const socket = new WhatsSocket({
  credentialsFolder: "./auth",
  loggerMode: "silent",
  maxReconnectionRetries: 5,
  ignoreSelfMessage: true,
  delayMilisecondsBetweenMsgs: 10
});

socket.onMessageUpsert.Subscribe(async (senderId, chatId, rawMsg, msgType, senderType) => {
  if (msgType === MsgType.Text) {
    const msg = MsgHelper_GetTextFrom(rawMsg)!;
    console.log(`Msg: ${msg} | SenderId: ${senderId} | ChatId: ${chatId} | Type: ${msgType} | SenderType: ${senderType}`);
    await socket.Send.Text(chatId, msg ?? "Wtf");
  }

  if (msgType === MsgType.Sticker) {
    console.log("Msg (STICKER)");
    const a = await downloadMediaMessage(rawMsg, "buffer", {});
    await socket.SendSafe(chatId, { sticker: a });
    if (!fs.existsSync("./TEST")) {
      fs.mkdirSync("./TEST");
    }
    const fileName = `sticker_${Date.now()}.webp`;
    const filePath = GetPath("TEST", fileName);
    fs.writeFileSync(filePath, a);
  }
});

socket.Start().then(() => {
  console.log("WhatsSocket initialized successfully!");
}).catch((error) => {
  console.error("Error initializing WhatsSocket:", error);
});


// function StoreMsgInJson(filePath: string, rawMsg: WAMessage) {
//   let msgsStored: any[] = [];
//   if (fs.existsSync(GetPath(filePath))) {
//     const before = fs.readFileSync(GetPath(filePath), "utf-8");
//     if (before.trim() === "") {
//       msgsStored = [];
//     } else {
//       msgsStored = JSON.parse(before);
//     }
//   } else {
//     //Creates the file if it doesn't exist
//     fs.writeFileSync(GetPath(filePath), "", "utf-8");
//     msgsStored = [];
//   }
//   msgsStored.push(rawMsg);
//   const json = JSON.stringify(msgsStored, null, 2);
//   fs.writeFileSync(GetPath(filePath), json, "utf-8");
// }