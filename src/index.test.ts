//============= Testing file simulating user consumption ====================
//TODO: Add event when entering into a new group.

import Whatsbotcord, { type ChatContext, type CommandArgs, type RawMsgAPI, CommandType } from "src";
import { Debugging_StoreWhatsappMsgInJsonFile } from "src/Debugging.helper";

const bot = new Whatsbotcord({ commandPrefix: "!", credentialsFolder: "./auth", loggerMode: "silent" });
bot.Commands.Add(
  {
    name: "ping",
    description: "replies with pong!",
    aliases: ["p"],
    async run(ctx: ChatContext, _: RawMsgAPI, __: CommandArgs): Promise<void> {
      await ctx.SendText("pong!");
      Debugging_StoreWhatsappMsgInJsonFile("./msgs.json", ctx.InitialRawMsg);
    },
  },
  CommandType.Normal
);
bot.Start();
