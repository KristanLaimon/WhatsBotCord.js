import { expect, test } from "bun:test";
import type { ChatContext } from "../core/bot/internals/ChatContext.js";
import type { CommandArgs } from "../core/bot/internals/CommandsSearcher.types.js";
import type { ICommand, RawMsgAPI } from "../core/bot/internals/IBotCommand.js";
import MockingChat from "./MockChatv2.js";

class MyCommand implements ICommand {
  public name: string = "command";
  async run(ctx: ChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
    await ctx.SendText("Hello world");

    const textAwaited = await ctx.WaitText({ timeoutSeconds: 1 });
    expect(_args.args).toEqual(["arg1"]);
    expect(textAwaited).toBe("hello world");
  }
}

test("t", async () => {
  const chat = new MockingChat(new MyCommand(), { args: ["arg1"] });
  //Enqueed
  chat.SendText("hello world");

  await chat.Simulate();
});
