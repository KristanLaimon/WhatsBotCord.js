import { MsgHelper_GetTextFrom } from './src/helpers/Msg.helper';
import { MsgType } from './src/Msg.types';
// import { MsgType } from './src/Msg.types';
import WhatsSocket from './src/core/whats_socket/WhatsSocket'
import { GetPath } from 'src/libs/BunPath';

const socket = new WhatsSocket({
  credentialsFolder: "./auth",
  loggerMode: "silent",
  maxReconnectionRetries: 5,
  ignoreSelfMessage: true
});

socket.onIncomingMessage.Subscribe(async (senderId, chatId, rawMsg, msgType, senderType) => {
  if (msgType === MsgType.Text) {
    const msg = MsgHelper_GetTextFrom(rawMsg);
    console.log(`Msg: ${msg} | SenderId: ${senderId} | ChatId: ${chatId} | Type: ${msgType} | SenderType: ${senderType}`);
  }

  socket.Send.Text(chatId, "Hola mundo");
  socket.Send.Img(chatId, { imagePath: GetPath("TEST", "image.png"), caption: "With a caption!" }, { normalizeMessageText: true });
  socket.Send.Img(chatId, { imagePath: GetPath("TEST", "image.png") }, { normalizeMessageText: true });
  socket.Send.ReactEmojiToMsg(chatId, rawMsg, "🦊");

  // let msgsStored: any[] = [];
  // if (fs.existsSync("msgExample.json")) {
  //   const before = fs.readFileSync("msgExample.json", "utf-8");
  //   if (before.trim() === "") {
  //     msgsStored = [];
  //   } else {
  //     msgsStored = JSON.parse(before);
  //   }
  // } else {
  //   //Creates the file if it doesn't exist
  //   fs.writeFileSync("msgExample.json", "", "utf-8");
  //   msgsStored = [];
  // }
  // msgsStored.push(rawMsg);
  // const json = JSON.stringify(msgsStored, null, 2);
  // fs.writeFileSync("msgExample.json", json, "utf-8");
});

socket.Start().then(() => {
  console.log("WhatsSocket initialized successfully!");
}).catch((error) => {
  console.error("Error initializing WhatsSocket:", error);
})