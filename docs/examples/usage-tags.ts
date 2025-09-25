import type { AdditionalAPI, ChatContext, CommandArgs, ICommand } from "../../src/index.js";
import Bot, { CommandType } from "../../src/index.js";

class EveryoneTag implements ICommand {
  name: string = "e";
  aliases: string[] = ["test"];
  async run(chat: ChatContext, _api: AdditionalAPI, _args: CommandArgs): Promise<void> {
    const res = await chat.FetchGroupData();
    if (res) {
      /**
       *  In this case is easy, res comes with res.members which is an array of all members with their
       *  respective @23423423 formatted mention and ID 234234234@lid ready to send. This is abstracted
       *  thanks to this library!
       */
      const mentions = res.members.map((m) => m.asMentionFormatted!);
      const ids = res.members.map((m) => m.rawId!);
      await chat.SendText(mentions.join(" "), { mentionsIds: ids });
    }
  }
}

// ========================== MAIN ==============================
const bot = new Bot({
  commandPrefix: ["$", "!", "/"],
  tagPrefix: ["@"],
  credentialsFolder: "./auth",
  loggerMode: "recommended",
});
bot.Commands.Add(new EveryoneTag(), CommandType.Tag);
bot.Start();
