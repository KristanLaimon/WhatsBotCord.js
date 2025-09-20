import { it } from "bun:test";
import type { AdditionalAPI, CommandArgs, IChatContext, ICommand } from "../../src/index.js";
import { ChatMock } from "../../src/index.js";

class Com implements ICommand {
  name = "mynamecommand";

  async run(ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
    await ctx.SendText("Hello User");
    await ctx.SendText("What's your name?");

    // Wait for user input
    const userName = await ctx.WaitText({ cancelKeywords: ["hello", "world"] }); //Returns: "chris"
    await ctx.SendText("Hello " + userName);
  }
}

it("retrieves user input correctly", async () => {
  // Create a mock chat for the command
  const chat = new ChatMock(new Com());

  // Simulate user sending "chris"
  chat.EnqueueIncoming_Text("chris");

  // Start the simulation
  await chat.StartChatSimulation();

  // Inspect results
  console.log(chat.SentFromCommand.Texts); // [{text:"Hello User"}, {text: "What's your name?"}, {text:"Hello chris"}]
  console.log(chat.WaitedFromCommand); // [{cancelKeywords:["hello","world"]}]
});
