import Whatsbotcord, { type AdditionalAPI, type CommandArgs, type IChatContext, CommandType } from "../../src/index.js";

// ===================== main.ts ==============================
const bot = new Whatsbotcord({
  commandPrefix: "!",
  tagCharPrefix: "@",
  credentialsFolder: "./auth",
  loggerMode: "recommended",
});
bot.Commands.Add(
  {
    name: "ping",
    async run(chat: IChatContext, _api: AdditionalAPI, _commandArgs: CommandArgs): Promise<void> {
      await chat.SendText("pong!");
    },
  },
  CommandType.Normal
);
bot.Start();
