/* eslint-disable @typescript-eslint/no-unused-vars */

import Bot, { CommandType, CreateCommand } from "../../src/index.js";

const everyoneTag = CreateCommand(
  //@everyone
  "everyone",
  async (chat, api, args) => {
    const res = await chat.FetchGroupData();
    if (res) {
      /**
       *  In this case is easy, res comes with res.members which is an array of all members with their
       *  respective @23423423 formatted mention and ID 234234234@lid ready to send. This is abstracted
       *  thanks to this library!
       */
      const mentions = res.members.map((m) => m.asMentionFormatted);
      const ids = res.members.map((m) => m.rawId);
      await chat.SendText(mentions.join(" "), { mentionsIds: ids });
    }
  },
  //So it can be used like @e
  { aliases: "e" }
);

// ========================== MAIN ==============================
const bot = new Bot({
  commandPrefix: ["$", "!", "/"],
  tagCharPrefix: ["@"],
  credentialsFolder: "./auth",
  loggerMode: "recommended",
});
bot.Commands.Add(everyoneTag, CommandType.Tag);
bot.Start();
