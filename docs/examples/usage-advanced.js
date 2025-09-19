/* eslint-disable @typescript-eslint/no-unused-vars */
import Whatsbotcord, { CommandType, CreateCommand, MsgType } from "../../src/index.js";

// ================== Ping.js ======================
const pingCommand = CreateCommand(
  "ping",
  async (ctx, api, args) => {
    await ctx.SendText("Pong!");
  },
  { aliases: "p" }
);
export default pingCommand;

// ========================== MAIN ==============================
//import pingCommand from "./Ping.js";
const bot = new Whatsbotcord({
  //Can accept an array of prefixes or only one "!" prefix
  commandPrefix: ["$", "!", "/"],
  tagCharPrefix: ["@"],
  credentialsFolder: "./auth",
  loggerMode: "recommended",
});
//1. You can add commands by just instatiating them or...
bot.Commands.Add(pingCommand, CommandType.Normal);
//2. By declaring them directly on Add method (Example of how a command workd)
bot.Commands.Add(
  {
    name: "forwardmsg",
    description: "A simple description for my forwardmsg",
    aliases: ["f"], //You can use !forwardmsg or !f, they are the same!
    async run(chat, api, args) {
      /**
       * If user uses !forwardmsg argument1 argument2 @someone, this will be ["argument1", "argument2", "@someone]
       * otherwise, will be a [] (empty array) if no args provided
       */
      const commandArgs = args.args;
      await chat.Loading(); ///Sends an ⌛ reaction emoji to original msg that triggered this command
      await chat.SendText("Send me a image:");
      const imgReceived = await chat.WaitMultimedia(MsgType.Image, { timeoutSeconds: 60, wrongTypeFeedbackMsg: "Hey, send me an img, try again!" });
      //If user has sent the expected msg of type img, this will be a buffer
      if (imgReceived) {
        await chat.SendText("I've received your img, Im going to send it back");
        /* -> */ await chat.SendImgFromBufferWithCaption(imgReceived, ".png", "Im a caption");
        //OR
        /* -> */ await chat.SendImgFromBuffer(imgReceived, ".png");
        await chat.Ok(); //Sends a ✅ reaction emoji to original msg
        //Otherwise, its null
      } else {
        await chat.SendText("I didn't get your msg... End of command");
        await chat.Fail(); //Sends a ❌ reaction emoji to original msg
      }
    },
  },
  CommandType.Normal
);
bot.Start();
