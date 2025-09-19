/* eslint-disable @typescript-eslint/no-unused-vars */

import Whatsbotcord, { CommandType } from "../../src/index.js";

const bot = new Whatsbotcord({
  commandPrefix: "!",
  tagCharPrefix: "@",
  credentialsFolder: "./auth",
  loggerMode: "recommended",
});
bot.Commands.Add(
  {
    name: "ping",
    async run(chat, api, commandArgs) {
      await chat.SendText("pong!");
    },
  },
  CommandType.Normal
);
bot.Start();
