import { MsgHelper_GetTextFromRawMsg } from './src/Msg.helper';
import WhatsSocket from './src/WhatsSocket'

const socket = new WhatsSocket({
  credentialsFolder: "./auth",
  loggerMode: "silent",
  maxReconnectionRetries: 5,
  ignoreSelfMessage: true
});

socket.onIncomingMessage.Subscribe((senderId, chatId, rawMsg, msgType, senderType) => {
  const msg = MsgHelper_GetTextFromRawMsg(rawMsg);
  console.log(`Msg: ${msg} | SenderId: ${senderId} | ChatId: ${chatId} | Type: ${msgType} | SenderType: ${senderType}`);
});

socket.Init().then(() => {
  console.log("WhatsSocket initialized successfully!");
}).catch((error) => {
  console.error("Error initializing WhatsSocket:", error);
})