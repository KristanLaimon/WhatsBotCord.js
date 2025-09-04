//============= Testing file simulating user consumption ====================
//TODO: Add event when entering into a new group.

import Whatsbotcord, { type ChatContext, type CommandArgs, type RawMsgAPI, type WhatsappMessage, CommandType, MsgType } from "src";

const bot = new Whatsbotcord({ commandPrefix: "!", credentialsFolder: "./auth", loggerMode: "silent" });
bot.Commands.Add(
  {
    name: "ping",
    description: "replies with pong!",
    aliases: ["p"],
    async run(ctx: ChatContext, _: RawMsgAPI, __: CommandArgs): Promise<void> {
      await ctx.SendText("pong!");
      const imageMsg: WhatsappMessage | null = await ctx.WaitMsg(MsgType.Image, { wrongTypeFeedbackMsg: "You are supposed to send an img!" });
      await ctx.SendText("You responded with image!");
      // Debugging_StoreWhatsappMsgInJsonFile("./msgs.json", ctx.InitialRawMsg);
    },
  },
  CommandType.Normal
);
bot.Start();

//TODO: Testing
/** TODO TESTING:
 * 1. + ChatContext => Test receive methods (WaitMsgText, WaitMsg)
 * 2. + Bot.ts => Test whole functionality as bot obj (not its internals)
 * 3. + Decorators.helper.ts => Test it works as decorator
 */
