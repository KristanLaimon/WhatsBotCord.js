import type { WhatsappMessage } from "../index.js";
import { type IChatContext, Helpers, MsgType } from "../index.js";
import type { WorkflowNumericArgs } from "./WorkflowNumeric.types.js";

/**
 * Manages an interactive workflow where a user is prompted to select an option from a numbered list.
 *
 * This class sends a list of choices to the user and waits for them to reply with a number
 * corresponding to their selection. It handles input validation, retries, and timeouts.
 *
 * @template T The type of the options to be presented.
 */
export class WorkflowNumericSingle<T> {
  /** The regular expression used to validate that the user's response is one of the valid numbers. */
  private responseRegex: RegExp;

  /**
   * Initializes a new numeric selection workflow.
   * @param ctx The chat context where the workflow will run.
   * @param config The configuration for the workflow's messages and behavior.
   * @param options An array of options of type `T` for the user to choose from.
   */

  constructor(public ctx: IChatContext, public config: WorkflowNumericArgs<T>, public options: T[]) {
    const start = this.config.startingNumber ?? 1;
    const numbersStr: string[] = options.map((_option, i) => (i + start).toString()); // Creates a regex like `\b(1|2|3)\b` to match only the exact numbers.
    this.responseRegex = new RegExp(`^(${numbersStr.join("|")})$`);
  }
  /**
   * Starts the workflow and waits for the user to select a single valid option.
   * @returns A `Promise` that resolves to the selected option of type `T`, or `null` if the user fails to respond in time.
   */

  public async selectOne(): Promise<T | null> {
    const selectedOptionNumber = await this.askUntilGetValidOption();
    if (selectedOptionNumber === null) {
      return null; // Timeout or failure
    }

    const startIndex = this.config.startingNumber ?? 1; // Convert the selected number (e.g., 1) to a 0-based index.
    const selectedIndex = selectedOptionNumber - startIndex;

    if (selectedIndex < 0) {
      if (this.options.length > 0)
        return this.options[0]!;
    }

    if (selectedIndex >= this.options.length) {
      if (this.options.length > 0)
        return this.options[this.options.length - 1]!;
    }
    
    return this.options[selectedIndex]!;
  }

  /**
   * Handles the core loop of sending options, waiting for a reply, and validating it.
   * @returns A `Promise` that resolves to the number chosen by the user, or `null` on timeout.
   */
  private async askUntilGetValidOption(): Promise<number | null> {
    const start = this.config.startingNumber ?? 1;
    const allOptionsText = this.options
      .map((option, index) => `${index + start}. ` + this.config.FrontEndSelector(option, index))
      .join("\n");

    const fullPrompt = `${this.config.StartingMsg}\n\n${allOptionsText}`; // Send the full prompt initially.

    await this.ctx.SendText(fullPrompt);

    while (true) {
      const responseMsg: WhatsappMessage | null = await this.ctx.WaitMsg(MsgType.Text, {
        timeoutSeconds: this.config.TimeoutMS / 1000,
      }); // Handle timeout

      if (responseMsg === null) {
        return null;
      }

      try {
        await this.ctx.SendReactEmojiTo(responseMsg, "⌛");
      } catch (error) {
        console.error("WorkflowNumericSingle: Error sending reaction ⌛", error);
      }

      const responseText = Helpers.Msg.FullMsg_GetText(responseMsg)?.trim();

      if (typeof responseText !== "string") {
        try {
          await this.ctx.SendReactEmojiTo(responseMsg, "❌");
        } catch (error) {
          console.error("WorkflowNumericSingle: Error sending reaction ❌", error);
        }
        throw new Error(
          "WorkflowNumericSingle (Inside flow): Text Messages should always return text!... (check IChatcontext.WaitMsg() code! for MsgType.Text params)"
        );
      } // Handle empty or non-existent text

      if (responseText === "") {
        await this.ctx.SendText(this.config.WrongMsg);
        try {
          await this.ctx.SendReactEmojiTo(responseMsg, "⚠️");
        } catch (error) {
          console.error("WorkflowNumericSingle: Error sending reaction ⚠️", error);
        }
        continue;
      } // Validate the response against the allowed numbers

      if (this.responseRegex.test(responseText)) {
        try {
          await this.ctx.SendReactEmojiTo(responseMsg, "✅");
        } catch (error) {
          console.error("WorkflowNumericSingle: Error sending reaction ✅", error);
        }
        return Number(responseText);
      } else {
        try {
          await this.ctx.SendReactEmojiTo(responseMsg, "⚠️");
        } catch (error) {
          console.error("WorkflowNumericSingle: Error sending reaction ⚠️", error);
        }
        await this.ctx.SendText(this.config.WrongMsg);
      }
    }
  }
}
