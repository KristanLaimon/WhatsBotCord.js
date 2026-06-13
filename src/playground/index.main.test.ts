import { expect, test } from "bun:test";
import type { AdditionalAPI, CommandArgs, IChatContext } from "../index.js";
import Whatsbotcord, { type ICommand, ChatMock, CommandType } from "../index.js";
import { MockAdapter } from "../testing.js";

test("Another test", async () => {
  const mockAdapter = new MockAdapter();
  const bot = new Whatsbotcord({}, mockAdapter);
  expect(bot).toBeDefined();
});

test("Before update...", async () => {
  class MyComWithoutExpect implements ICommand {
    name: string = "command";
    public async run(_ctx: IChatContext, api: AdditionalAPI, _args: CommandArgs): Promise<void> {
      console.log(api.Myself.Bot.Commands.NormalCommands); // [{..}] 'Command1_Normal' Obj
      console.log(api.Myself.Bot.Commands.TagCommands); // [{...}] 'Command2_Tag' Obj

      expect(api.Myself.Bot.Commands.NormalCommands).toHaveLength(1);
      expect(api.Myself.Bot.Commands.TagCommands).toHaveLength(1);
    }
  }

  const chat = new ChatMock(new MyComWithoutExpect(), {
    botSettings: {
      initialCommandsToAdd: [
        {
          commandType: CommandType.Normal,
          command: {
            name: "Command1_Normal",
            async run(_ctx: IChatContext, _api: AdditionalAPI, _args: CommandArgs) {},
          },
        },
        {
          commandType: CommandType.Tag,
          command: {
            name: "Command2_Tag",
            async run(_ctx: IChatContext, _api: AdditionalAPI, _args: CommandArgs) {},
          },
        },
      ],
    },
  });

  await chat.StartChatSimulation();
});
