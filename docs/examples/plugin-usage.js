import WhatsbotCord, { OfficialPlugin_OneCommandPerUserAtATime } from "../../src/index.js";

const bot = new WhatsbotCord({
  commandPrefix: ["$", "!", "/", "."],
  delayMilisecondsBetweenMsgs: 1,
});
/** your commands here with bot.Commands.Add(...) */
bot.Use(
  OfficialPlugin_OneCommandPerUserAtATime({
    msgToSend: (info, lastCommand, actualCommand) => {
      return `
      You can't use !${actualCommand.name}. Wait until finish that last command ${lastCommand.name}`;
    },
    timeoutSecondsToForgetThem: 60 * 5,
  })
);
await bot.Start();
