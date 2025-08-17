import { RawMsg_GetTextFrom } from './src/Msg.helper';
// import { MsgType } from './src/Msg.types';
import WhatsSocket from './src/WhatsSocket'

const socket = new WhatsSocket({
  credentialsFolder: "./auth",
  loggerMode: "silent",
  maxReconnectionRetries: 5,
  ignoreSelfMessage: true
});

socket.onIncomingMessage.Subscribe((senderId, chatId, rawMsg, msgType, senderType) => {
  // if (msgType === MsgType.Text) {
  // }
  const msg = RawMsg_GetTextFrom(rawMsg);
  console.log(`Msg: ${msg} | SenderId: ${senderId} | ChatId: ${chatId} | Type: ${msgType} | SenderType: ${senderType}`);
});

socket.Start().then(() => {
  console.log("WhatsSocket initialized successfully!");
}).catch((error) => {
  console.error("Error initializing WhatsSocket:", error);
})