import type { ICommand, IChatContext, AdditionalAPI, CommandArgs } from "../../src/index.js";

class ParallelTaskCommand implements ICommand {
  name: string = "starttask";

  public async run(ctx: IChatContext, _api: AdditionalAPI, _args: CommandArgs): Promise<void> {
    await ctx.SendText("Starting a background task for you now...");

    // Create an identical, independent copy of the context.
    const clonedCtx = ctx.Clone();

    // Use the clone for a separate, long-running task.
    setTimeout(async () => {
      await clonedCtx.SendText("Background task update: Still working...");
    }, 5000); // 5 seconds later

    setTimeout(async () => {
      await clonedCtx.SendText("Background task finished! ✅");
    }, 10000); // 10 seconds later
  }
}
