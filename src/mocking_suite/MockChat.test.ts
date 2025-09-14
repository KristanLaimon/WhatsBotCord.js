import { expect, test } from "bun:test";
import type { CommandArgs } from "../core/bot/internals/CommandsSearcher.types.js";
import type { ICommand, RawMsgAPI } from "../core/bot/internals/IBotCommand.js";
import type { IChatContext } from "../core/bot/internals/IChatContext.js";
import MockingChat from "./MockChat.js";

class MyCommand implements ICommand {
  public name: string = "name";
  async run(ctx: IChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
    await ctx.SendText("Tell me your name pls");
    const nameAwaited = await ctx.WaitText({ timeoutSeconds: 2 });
    expect(_args.args).toEqual(["arg1"]);
    expect(nameAwaited).toBe("chris");
    await ctx.SendText("Your name is " + nameAwaited, { normalizeMessageText: true });
  }
}

//So.... timeoutSeconds is not used, or any other param. Only "cancelKeyboards"
test("Simplest_WhenExpectingTxtMsg_ItsCatchedByCommandWaitTxt", async () => {
  const chat = new MockingChat(new MyCommand(), { args: ["arg1"], cancelKeywords: ["hello"] });
  chat.SendText("chris");
  await chat.Simulate();
  expect(chat.SentFromCommand.Texts).toHaveLength(2);
  expect(chat.SentFromCommand.Texts[1]!.text).toBe("Your name is chris");
});
