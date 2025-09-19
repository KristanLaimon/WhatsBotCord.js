import Whatsbotcord, {
  type AdditionalAPI,
  type ChatContext,
  type CommandArgs,
  type IChatContext,
  type ICommand,
  CommandType,
  MsgType,
} from "../../src/index.js";

// ================== Ping.ts ======================
// A command can be created with a class implementing ICommand
class PingCommand implements ICommand {
  name: string = "ping";
  description: string = "replies with pong!";
  aliases: string[] = ["p"];
  async run(chat: ChatContext, _api: AdditionalAPI, _commandArgs: CommandArgs): Promise<void> {
    await chat.SendText("Pong!");
  }
}
export default PingCommand;

// ========================== MAIN ==============================
const bot = new Whatsbotcord({
  //Can accept an array of prefixes or only one "!" prefix
  commandPrefix: ["$", "!", "/"],
  tagCharPrefix: ["@"],
  credentialsFolder: "./auth",
  loggerMode: "recommended",
});
//1. You can add commands by just instatiating them or...
bot.Commands.Add(new PingCommand(), CommandType.Normal);
//2. By declaring them directly on Add method (Example of how a command workd)
bot.Commands.Add(
  {
    name: "forwardmsg",
    aliases: ["f"], //You can use !forwardmsg or !f, they are the same!
    async run(chat: IChatContext, _api: AdditionalAPI, _args: CommandArgs) {
      /**
       * If user uses !forwardmsg argument1 argument2 @someone, this will be ["argument1", "argument2", "@someone]
       * otherwise, will be a [] (empty array) if no args provided
       */
      // const commandArgs: string[] = args.args;
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
