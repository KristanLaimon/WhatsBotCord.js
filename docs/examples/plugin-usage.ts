import WhatsbotCord, { OfficialPlugin_OneCommandPerUserAtATime } from "src/index.js";

const bot = new WhatsbotCord({
  commandPrefix: ["$", "!", "/", "."],
  delayMilisecondsBetweenMsgs: 1,
});

bot.Use(
  OfficialPlugin_OneCommandPerUserAtATime({
    msgToSend: (info, lastCommand, actualCommand) => {
      return `
      You ${info.pushName} have already started command !${lastCommand.name},
      you can't use !${actualCommand.name}. Wait until finish that last command`;
    },
    timeoutSecondsToForgetThem: 60 * 5,
  })
);
await bot.Start();
