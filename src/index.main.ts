//============= Testing file simulating user consumption ====================
//TODO: Add event when entering into a new group.
import Whatsbotcord, {
  CommandType,
  MsgHelpers,
  MsgType,
  SenderType,
  type ChatContext,
  type CommandArgs,
  type IBotCommand,
  type RawMsgAPI,
  type WhatsappMessage,
} from "src";
import { Debugging_StoreWhatsappMsgInJsonFile } from "./Debugging.helper";
const bot = new Whatsbotcord({ commandPrefix: "!", credentialsFolder: "./auth", loggerMode: "silent" });

class PingCommand implements IBotCommand {
  name: string = "ping";
  description: string = "replies with pong!";
  aliases: string[] = ["p"];

  async run(ctx: ChatContext, _: RawMsgAPI, __: CommandArgs): Promise<void> {
    await ctx.SendReactEmojiToInitialMsg("⌛");
    await ctx.SendText("pong!");
    await ctx.SendText(`
        === Sending an img ===

        Now try to send an image pls:
      `);

    const imageMsg: WhatsappMessage | null = await ctx.WaitMsg(MsgType.Image, {
      wrongTypeFeedbackMsg: "You are supposed to send an img!",
      cancelFeedbackMsg: "User has canceled this stuff specifically",
      timeoutSeconds: 5,
    });

    if (!imageMsg) {
      await ctx.SendText("You didn't respond in time!");
      await ctx.Fail();
    } else {
      await ctx.SendText("You responded with image!");
      await ctx.Ok();
    }
    await ctx.SendText("Now send a text pls: ");
    const secondImg: WhatsappMessage | null = await ctx.WaitMsg(MsgType.Text);
    if (secondImg) {
      await ctx.Ok();
    } else {
      await ctx.Fail();
    }
  }
}

class EveryoneTag implements IBotCommand {
  name: string = "everyone";
  aliases?: string[] | undefined = ["all", "a"];
  description: string = "Tag everyone in group";
  async run(_ctx: ChatContext, _rawMsgApi: RawMsgAPI, args: CommandArgs): Promise<void> {
    if (args.senderType === SenderType.Individual) return;
    //TODO: There's no way to retrieve people from group omg
    //Comes from group, we know that!
    //Expected API!
    //@ts-expect-error example of how api should be GroupInfo doesn't exist yet!
    const allMembers = _ctx.GroupInfo!.Participants;
  }
}

bot.Commands.Add(new PingCommand(), CommandType.Normal);
bot.Commands.Add(new EveryoneTag(), CommandType.Tag);

bot.Use(async (_senderId, chatId, rawMsg, msgType, _senderType, next) => {
  if (msgType === MsgType.Text) {
    const txt: string | null = MsgHelpers.FullMsg_GetText(rawMsg);
    if (txt && txt?.length > 1000) {
      bot.SendMsg.Text(chatId, "To muuch text!!!");
      return;
    }
  }
  next();
});

bot.Use(async (_senderId, _chatId, rawMsg, _msgType, _senderType, next) => {
  Debugging_StoreWhatsappMsgInJsonFile("./quotedmsg.json", rawMsg);
  next();
});

bot.Start();

//TODO: Testing
/** TODO TESTING:
 * 1. CHECKED ✅ | + ChatContext => Test receive methods (WaitMsgText, WaitMsg)
 * 2. + Bot.ts => Test whole functionality as bot obj (not its internals)
 *                && Middleware internal system
 *                && Tests for handling command errors (known errors | unknown ones | abortedByUser with 'cancel')
 * 3. + Decorators.helper.ts => Test it works as decorator
 * 4. + Receiver.test.ts => Check if sending an incorrect type msg resets the timeout timer!
 *                       => Check that local config on method overrides global config but when
 *                          not using local config, uses global config instead
 * 5. + CommandSearcher => validate assertion for "oneword" comands and preventing "" command names! && Verify command names can't have " " spaces, only 1 word long
 */

//TODO : Features
// Give group utilites (fetch all members for example) => Bot should expose GetGroupMetadata and group handling and ChatContext should provide facilities for group info (and group handling?)
// ChatContext must have a WaitMsg_# (per message type) dedicated.
