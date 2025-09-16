// Test framework agnostic example using WhatsChatMock
import { it } from "bun:test";
import type { CommandArgs, IChatContext, ICommand, RawMsgAPI } from "whatsbotcord";
import { WhatsChatMock } from "whatsbotcord";

it("WhenWaitingWithParams_ShouldRetrieveThoseParamsAsWell", async (): Promise<void> => {
  class Com implements ICommand {
    name: string = "mynamecommand";
    async run(_ctx: IChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
      await _ctx.SendText("Hello User");
      await _ctx.SendText("What's your name?");
      const userName: string | null = await _ctx.WaitText({ cancelKeywords: ["hello", "world"] }); //Returns "chris"
      await _ctx.SendText("Hello " + userName);
    }
  }
  const chat = new WhatsChatMock(new Com());
  chat.EnqueueIncomingText("chris");
  await chat.StartChatSimulation();
  console.log(chat.SentFromCommand.Texts); // [{text:"Hello User"}, {text: "What's your name?"}, {text:"Hello chris"}]
  console.log(chat.WaitedFromCommand); // [{"cancelKeywords:["hello","world"]}]
});
