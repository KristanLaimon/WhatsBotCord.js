/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */

import { it } from "bun:test";
import { ChatMock, CreateCommand } from "../../src/index.js";

const myCommand = CreateCommand(
  /** Command name */
  "mynamecommand",
  /** Code to run when called */
  async (ctx, api, args) => {
    await ctx.SendText("Hello User");
    await ctx.SendText("What's your name?");

    // Wait for user input
    const userName = await ctx.WaitText({ cancelKeywords: ["hello", "world"] }); //Returns: "chris"
    await ctx.SendText("Hello " + userName);
  },
  /** Aditional config (no alias) */
  { aliases: [] }
);

it("retrieves user input correctly", async () => {
  // Create a mock chat for the command
  const chat = new ChatMock(myCommand);

  // Simulate user sending "chris"
  chat.EnqueueIncomingText("chris");

  // Start the simulation
  await chat.StartChatSimulation();

  // Inspect results
  console.log(chat.SentFromCommand.Texts); // [{text:"Hello User"}, {text: "What's your name?"}, {text:"Hello chris"}]
  console.log(chat.WaitedFromCommand); // [{cancelKeywords:["hello","world"]}]
});
