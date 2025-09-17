import { expect, test } from "bun:test";
import type { AdditionalAPI, CommandArgs, IChatContext } from "./index.js";
import { type ICommand, ChatMock } from "./index.js";

test("Testing testing", async () => {
  class Com implements ICommand {
    name: string = "com";
    public async run(ctx: IChatContext, _api: AdditionalAPI, _args: CommandArgs): Promise<void> {
      await ctx.SendContact({ name: "chris", phone: "7132322" });
    }
  }

  const chat = new ChatMock(new Com());
  await chat.StartChatSimulation();
  expect(chat.SentFromCommand.Contacts).toHaveLength(1);
  console.log(chat.SentFromCommand.Contacts);
});
