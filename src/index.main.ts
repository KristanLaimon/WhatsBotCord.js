import Bot, { type ChatContext, type CommandArgs, type IBotCommand, type RawMsgAPI, CommandType, SenderType } from "src/index.js";

// =============== EveryoneTag.ts ================
class EveryoneTag implements IBotCommand {
  name: string = "e";
  description: string = "replies with pong!";
  aliases: string[] = ["test"];
  async run(chat: ChatContext, _: RawMsgAPI, __: CommandArgs): Promise<void> {
    const res = await chat.FetchGroupData();
    if (res) {
      const mentions = res.members.map((m) => m.asMentionFormatted!);
      const ids = res.members.map((m) => m.rawId!);
      await chat.SendText(mentions.join(" "), { mentionsIds: ids });
    }
  }
}

class EveryoneId implements IBotCommand {
  name: string = "ids";
  aliases?: string[] | undefined;
  description: string = "All ids";
  async run(ctx: ChatContext, _: RawMsgAPI, args: CommandArgs): Promise<void> {
    if (args.senderType === SenderType.Individual) {
      await ctx.SendText("Este comando solo puede ser usado en grupos!");
      return;
    }

    const groupData = await ctx.FetchGroupData();
    if (!groupData) {
      await ctx.SendText("Hubo un error al intentar obtener la data del grupo!...");
      return;
    }
    const allIds = groupData.members.map((m) => m.rawId!);
    await ctx.SendText(allIds.join(" "));
  }
}

// class ErrorCommand implements IBotCommand {
//   name: string = "error";
//   aliases?: string[] | undefined;
//   description: string = "error desc";
//   async run(ctx: ChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
//     await ctx.SendText("Daré un error ahora mismo.");
//     await new Promise<void>((_resolve, reject) => {
//       reject({ xd: "JAJAJA" });
//     });
//   }
// }

// ========================== MAIN ==============================
const bot = new Bot({
  commandPrefix: ["$", "!", "/"],
  tagCharPrefix: ["@"],
  credentialsFolder: "./auth",
  loggerMode: "recommended",
});
bot.Commands.Add(new EveryoneTag(), CommandType.Tag);
bot.Commands.Add(new EveryoneId(), CommandType.Normal);
bot.Events.onCommandNotFound.Subscribe(async (ctx, commandName) => {
  await ctx.SendText("No has enviado un comando válido, usaste: " + commandName);
});
bot.Settings.defaultEmojiToSendReactionOnFailureCommand = "🦊";
bot.Start();

const str: string = "string";

console.log(str);

// ✅ Essential Testing
/** TODO TESTING:
 * 1. CHECKED ✅ | + ChatContext => Test receive methods (WaitMsgText, WaitMsg)
 * 2. CHECKED ✅ | + Bot.ts   => Test whole functionality as bot obj (not its internals)
 *                ✅ && Middleware internal system
 *                ✅ && Tests for handling command errors (known errors | unknown ones | abortedByUser with 'cancel')
 * 3. + Decorators.helper.ts  =>  ✅  Test if works as decorator
 * 4. + Receiver.test.ts      =>  ✅  Check if sending an incorrect type msg resets the timeout timer!
 * 4.1+ ChatContext.test.ts   =>  ✅  Check that local config on method overrides global config but when
 *                                ✅  not using local config, uses global config instead
 * 5. + CommandSearcher       =>  ✅  Validate assertion for "oneword" comands and preventing "" command names! && Verify command names can't have " " spaces, only 1 word long
 * 6. ✅ Check all TODO's around the project
 * 7. WhatsSocket.test.ts  ✅~ (Depends too much on baileys lib)   => Test all on* events (4/7 already done!);
 */

// TODO : Features
// [ ] GROUP UTILITES (ICommand, Bot): Give group utilites (fetch all members for example) => Bot should expose GetGroupMetadata and group handling and ChatContext should provide facilities for group info (and group handling?)
// [ ] CHATCONTEXT:  must have a WaitMsg_# (per message type) dedicated.
// [X] GENERAL: Document Update => Should be capable to RECEIVE and SEND documents!
//        [X]: Send documents
//              [X]: Test..
//        [X]: Receive documents
//              [X]: Test..
//      @Note: So far, it can recognize and get documents, but not sending (not tested at all) ❌
// [X]: WhatsSocket.SugarSender: Test MIME types being inferred correctly from WhatsSocket.SugarSender (TESTS) on all MULTIMEDIA SENDING!
// [X]: WhatsSocket.Start : If internal baileys socket crashes at first run, should reset itself, or console.log user should reset the program. => Document common error cases. When running the same bot twice but in second time doens't work. (Maybe you have an already running instance of this same socket with same credentials)
// CORRECT al ChatContext sending msgs with good params to handle (only string | buffer && extensiontype!);....
// [ ]: Add a default emoji to send to original msgs when occurs an error (configurable on bot instatiation params!)

//TODO: Improve and document bot EVENTS!! Exon's Feedback!
//TODO: Improve loggin docs, when creating bot object
//TODO: Create testing toolkit for users to simulate chats with these commands!
