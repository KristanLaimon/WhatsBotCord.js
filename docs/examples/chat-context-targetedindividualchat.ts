import type { AdditionalAPI, CommandArgs, IChatContext, ICommand } from "../../src/index.js";

class StartPrivateChatCommand implements ICommand {
  name: string = "contactme";

  public async run(ctx: IChatContext, _api: AdditionalAPI, args: CommandArgs): Promise<void> {
    // Let's create a new context to talk to the user who ran the command.
    const privateCtx: IChatContext = ctx.CloneButTargetedToIndividualChat({
      userChatId: args.participantIdPN!, // Get the user's ID. You can send private messages only to PhoneNumbersID like. (e.g 234234234@whatsapp.es), so you can't with @lid id's
    });

    // Now we can talk to them in their private chat.
    await privateCtx.SendText("Hello! You asked me to contact you. How can I help?");
  }
}
