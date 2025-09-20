import { describe, it } from "bun:test";
import type { AdditionalAPI, CommandArgs, IChatContext, ICommand, WhatsappMessage } from "../../src/index.js";
import { ChatMock, MsgHelpers, MsgType, SenderType } from "../../src/index.js";

// Example command implementation
class MyCommand implements ICommand {
  name = "command";

  async run(ctx: IChatContext, _rawMsgApi: AdditionalAPI, args: CommandArgs): Promise<void> {
    console.log("Args:", args.args); // ["argument1", "argument2"]
    console.log("Chat ID:", ctx.FixedChatId); // "myCustomChatId!@g.us"
    console.log("Participant ID:", ctx.FixedParticipantId); // "myCustomParticipantId!@whatsapp.es"

    // Ask for user's name
    await ctx.SendText("What's your name?");
    const name = await ctx.WaitText({ timeoutSeconds: 3 });

    if (name) await ctx.SendText(`Hello ${name}. Nice to meet you`);
    else await ctx.SendText("You didn't respond in 3 seconds..");

    // Ask for favorite programming language
    await ctx.SendText("What's your favorite programming language?");
    const response: WhatsappMessage | null = await ctx.WaitMsg(MsgType.Text);

    if (response) {
      const language = MsgHelpers.FullMsg_GetText(response);
      if (language) await ctx.SendText(`Oh, your favorite language is: ${language}`);
    } else {
      await ctx.SendText("You didn't respond in 3 seconds.");
    }
  }
}

// Test suite
describe("WhatsChatMock Example", () => {
  it("Simulates user interaction with MyCommand", async () => {
    const chat = new ChatMock(new MyCommand(), {
      args: ["argument1", "argument2"],
      botSettings: { commandPrefix: "!" },
      cancelKeywords: ["cancel"],
      chatContextConfig: { timeoutSeconds: 3 },
      chatId: "myCustomChatId!@g.us",
      participantId: "myCustomParticipantId!@whatsapp.es",
      msgType: MsgType.Text,
      senderType: SenderType.Individual,
    });

    // Simulate user responses
    chat.EnqueueIncoming_Text("chris"); // Response to name question
    chat.EnqueueIncoming_Text("typescript"); // Response to favorite language question

    await chat.StartChatSimulation();

    console.log("Messages sent by command:", chat.SentFromCommand.Texts);
    console.log("Messages command waited for:", chat.WaitedFromCommand);
  });
});
