import { expect, test } from "bun:test";
import type { CommandArgs } from "../core/bot/internals/CommandsSearcher.types.js";
import type { ICommand, RawMsgAPI } from "../core/bot/internals/IBotCommand.js";
import type { IChatContext } from "../core/bot/internals/IChatContext.js";
import MockingChat from "./MockChat.js";

class MyCommand implements ICommand {
  public name: string = "name";
  async run(ctx: IChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
    await ctx.SendText("Tell me your name pls");
    await ctx.SendText("Tell me your name again");
    await ctx.SendText("Tell me your name again");
    await ctx.SendText("Tell me your name again");
    await ctx.SendText("Tell me your name again");
    const nameAwaited = await ctx.WaitText({ timeoutSeconds: 2 });
    expect(_args.args).toEqual(["arg1"]);
    expect(nameAwaited).toBe("chris");
    await ctx.SendText("Your name is " + nameAwaited);
  }
}

test("Simplest_WhenExpectingTxtMsg_ItsCatchedByCommandWaitTxt", async () => {
  const chat = new MockingChat(new MyCommand(), { args: ["arg1"] });
  // chat.SendText("hello world");
  chat.SendText("chris");
  // expect(chat).toEqual([{ text: "Your name is chris", options: undefined }]);
  await chat.Simulate();
  console.log(chat.SentFromCommand.Texts);
});
