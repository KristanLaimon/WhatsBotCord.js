import Bot, { type ChatContext, type CommandArgs, type IBotCommand, type RawMsgAPI, CommandType, MsgType } from "src";

class PingCommand implements IBotCommand {
  name: string = "ping";
  description: string = "replies with pong!";
  aliases: string[] = ["p"];
  async run(chat: ChatContext, _: RawMsgAPI, __: CommandArgs): Promise<void> {
    await chat.SendText("Pong!");
  }
}

// ========================== MAIN ==============================
const bot = new Bot({
  commandPrefix: ["$", "!", "/"],
  tagCharPrefix: ["@"],
  credentialsFolder: "./auth",
  loggerMode: "recommended",
  wrongTypeFeedbackMsg: "Debes de mandar un tipo valido",
});
bot.Commands.Add(new PingCommand(), CommandType.Normal);
bot.Commands.Add(
  {
    name: "search",
    description: "a small desc",
    async run(chat, _, __) {
      await chat.Loading();
      await chat.SendText("Send me a image:");
      const imgReceived = await chat.WaitMultimedia(MsgType.Image, { timeoutSeconds: 60, wrongTypeFeedbackMsg: "Hey, mandame uan imagen, no otra cosa" });
      //llamada base de datos
      if (imgReceived) {
        await chat.SendText("Recibí tu imagen!, te lo reenviaré");
        await chat.SendImgFromBufferWithCaption(imgReceived, ".png", "Im a caption!");
        await chat.Ok();
      } else {
        await chat.SendText("No recibí tu mensaje... Fin");
        await chat.Fail();
      }
    },
  },
  CommandType.Normal
);
bot.Start();

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
//        [ ]: Receive documents
//              [ ]: Test..
//      @Note: So far, it can recognize and get documents, but not sending (not tested at all) ❌
// [X]: WhatsSocket.SugarSender: Test MIME types being inferred correctly from WhatsSocket.SugarSender (TESTS) on all MULTIMEDIA SENDING!
// [ ]: WhatsSocket.Start : If internal baileys socket crashes at first run, should reset itself, or console.log user should reset the program. => Document common error cases. When running the same bot twice but in second time doens't work. (Maybe you have an already running instance of this same socket with same credentials)
// CORRECT al ChatContext sending msgs with good params to handle (only string | buffer && extensiontype!);....
// [ ]: Add a default emoji to send to original msgs when occurs an error (configurable on bot instatiation params!)

//TODO: Improve and document bot EVENTS!! Exon's Feedback!
//TODO: Improve loggin docs, when creating bot object
