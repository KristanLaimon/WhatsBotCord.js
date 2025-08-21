import { MsgHelper_GetTextFrom } from './src/helpers/Msg.helper';
import { MsgType } from './src/Msg.types';
import WhatsSocket from './src/core/whats_socket/WhatsSocket'
import fs from "fs";
import type { WAMessage } from "baileys";
import { GetPath } from 'src/libs/BunPath';
import { downloadMediaMessage } from "baileys";

const socket = new WhatsSocket({
  credentialsFolder: "./auth",
  loggerMode: "silent",
  maxReconnectionRetries: 5,
  ignoreSelfMessage: true
});

// const stickerUrl: string = "https://mmg.whatsapp.net/v/t62.15575-24/535391214_1433688774621522_8249722839530912743_n.enc?ccb=11-4&oh=01_Q5Aa2QHTKtX-aoueNuZGEZEdGmSl9agJde1IYXN0NUxU08XpoQ&oe=68CE1D9B&_nc_sid=5e03e0&mms3=true";

socket.onIncomingMessage.Subscribe(async (senderId, chatId, rawMsg, msgType, senderType) => {
  if (msgType === MsgType.Text) {
    const msg = MsgHelper_GetTextFrom(rawMsg)!;
    console.log(`Msg: ${msg} | SenderId: ${senderId} | ChatId: ${chatId} | Type: ${msgType} | SenderType: ${senderType}`);
    await socket.Send.Text(chatId, msg ?? "Wtf");

    if (msg === "song") {
      await socket.Send.Audio(chatId, "./TEST/wolf.mp3");
    }
  }

  if (msgType === MsgType.Sticker) {
    console.log("Msg (STICKER)");
    const a = await downloadMediaMessage(rawMsg, "buffer", {});
    await socket.SendSafe(chatId, { sticker: a });
  }

  // socket.Send.Sticker(chatId, stickerUrl);

  // socket.Send.Text(chatId, "Hola mundo");
  // socket.Send.Img(chatId, { imagePath: GetPath("TEST", "image.png"), caption: "With a caption!" }, { normalizeMessageText: true });
  // socket.Send.Img(chatId, { imagePath: GetPath("TEST", "image.png") }, { normalizeMessageText: true });
  // socket.Send.ReactEmojiToMsg(chatId, rawMsg, "🦊");

  // StoreMsgInJson("./msgExample.json", rawMsg);
});

socket.Start().then(() => {
  console.log("WhatsSocket initialized successfully!");
}).catch((error) => {
  console.error("Error initializing WhatsSocket:", error);
})


function StoreMsgInJson(filePath: string, rawMsg: WAMessage) {
  let msgsStored: any[] = [];
  if (fs.existsSync(GetPath(filePath))) {
    const before = fs.readFileSync(GetPath(filePath), "utf-8");
    if (before.trim() === "") {
      msgsStored = [];
    } else {
      msgsStored = JSON.parse(before);
    }
  } else {
    //Creates the file if it doesn't exist
    fs.writeFileSync(GetPath(filePath), "", "utf-8");
    msgsStored = [];
  }
  msgsStored.push(rawMsg);
  const json = JSON.stringify(msgsStored, null, 2);
  fs.writeFileSync(GetPath(filePath), json, "utf-8");
}