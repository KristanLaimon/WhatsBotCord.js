import type { AdditionalAPI, CommandArgs, IChatContext } from "../../src/index.js";
import Whatsbotcord, { type ICommand } from "../../src/index.js";

class Command implements ICommand {
  name: string = "com";
  aliases?: string[] | undefined;
  public async run(ctx: IChatContext, _: AdditionalAPI, __: CommandArgs): Promise<void> {
    //It's the same as using:
    //===== These are the same =====
    await ctx.SendReactEmojiToInitialMsg("⌛");
    //             OR
    await ctx.Loading();
    //==============================

    await ctx.SendText("Hi!, would you like to know what whatsbotcord means? [yes\no]");
    let response: boolean | null = false;
    while (response !== null) {
      response = await ctx.WaitYesOrNoAnswer({
        normalConfig: { timeoutSeconds: 2 },
        waitYesOrNoOptions: {},
      });
      /**
       * If response is null, it means:
       * - Couldn't retrieve correctly from whatsapp servers
       * - Configured TimeoutSeconds rather in local config (in WaitYesOrNoAnswer optional params) or global config (in BOT Constructor)
       */
      if (response === null) {
        await ctx.SendText("You haven't respond in time or no valid answer, try again");
      }
    }

    if (response) {
      await ctx.SendText("Whatsbotcord comes from 'Whatsapp', 'Bot', 'Discord'!");
    } else {
      await ctx.SendText("Ok, see you later");
    }

    //===== These are the same =====
    await ctx.SendReactEmojiToInitialMsg("✅");
    //             OR
    await ctx.Ok();
    //==============================
  }
}

const bot = new Whatsbotcord({
  // positiveAnswerOptions: ["yes", "y"] /** <= you can specify it here as well as global config (Optional) */,
  // negativeAnswerOptions: ["no", "n"] /** <= you can specify it here as well as global config (Optional) */,
});

bot.Commands.Add(new Command());

bot.Start();
