/* eslint-disable no-undef */

import { describe, it } from "bun:test";
import { ChatMock, CreateCommand, MsgHelpers, MsgType, SenderType } from "../../src/index.js";

// For Javascript uses who need to create a command with intelissense help!
const myCommand = CreateCommand(
  /** Command Name */
  "command",
  /** run() command */
  async (ctx, api, args) => {
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
    const response = await ctx.WaitMsg(MsgType.Text);

    if (response) {
      const language = MsgHelpers.FullMsg_GetText(response);
      if (language) await ctx.SendText(`Oh, your favorite language is: ${language}`);
    } else {
      await ctx.SendText("You didn't respond in 3 seconds.");
    }
  },
  /** Optional params */
  {
    aliases: ["com"],
  }
);

// Test suite
describe("WhatsChatMock Example", () => {
  it("Simulates user interaction with MyCommand", async () => {
    const chat = new ChatMock(myCommand, {
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
    chat.EnqueueIncomingText("chris"); // Response to name question
    chat.EnqueueIncomingText("typescript"); // Response to favorite language question

    await chat.StartChatSimulation();

    console.log("Messages sent by command:", chat.SentFromCommand.Texts);
    console.log("Messages command waited for:", chat.WaitedFromCommand);
  });
});
