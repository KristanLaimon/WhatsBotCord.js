import { expect, test } from "bun:test";
import type { AdditionalAPI, CommandArgs, IChatContext } from "./index.js";
import { type ICommand, ChatMock, CommandType } from "./index.js";

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
            async run(_ctx, _api, _args) {},
          },
        },
        {
          commandType: CommandType.Tag,
          command: {
            name: "Command2_Tag",
            async run(_ctx, _api, _args) {},
          },
        },
      ],
    },
  });

  await chat.StartChatSimulation();
});
