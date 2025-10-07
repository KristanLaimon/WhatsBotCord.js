import type { AdditionalAPI, CommandArgs, IChatContext, ICommand } from "../../src/index.js";

class PrivateReplyCommand implements ICommand {
  name: string = "myinfo";

  public async run(ctx: IChatContext, api: AdditionalAPI, args: CommandArgs): Promise<void> {
    // This command was run in a group. Let's reply in private.

    // 1. Send an initial "anchor" message directly to the user.
    const privateMsg = await api.InternalSocket.Send.Text(
      args.participantIdPN!, // The user's phone number ID
      "Replying privately as you requested..."
    );

    // 2. Create a new context targeted to the private chat using the message.
    const privateCtx = ctx.CloneButTargetedToWithInitialMsg({ initialMsg: privateMsg! });

    // 3. Now, all messages sent with `privateCtx` go to the user's DMs! 🤫
    await privateCtx.SendText(`Hi ${args.originalRawMsg.pushName}, here is your private info!`);
    // await privateCtx.SendImage(...);
  }
}
