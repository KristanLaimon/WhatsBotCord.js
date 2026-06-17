import type { IChatContext, WhatsappMessage } from "../index.js";
import { Helpers, MsgType } from "../index.js";
import type { WorkflowNumericArgs } from "./WorkflowNumeric.types.js";

/**
 * Manages an interactive workflow where a user can select multiple options from a numbered list.
 *
 * This class sends a list of choices and waits for the user to reply with one or more numbers
 * corresponding to their selections (e.g., "1, 3, 4"). It handles input validation, retries, and timeouts.
 *
 * @template T The type of the options to be presented.
 */
export class WorkFlowNumericMany<T> {
  /**
   * Initializes a new multi-selection workflow.
   * @param ctx The chat context where the workflow will run.
   * @param config The configuration for the workflow's messages and behavior.
   * @param options An array of options for the user to choose from.
   */
  constructor(public ctx: IChatContext, public config: WorkflowNumericArgs<T>, public options: T[]) {}

  /**
   * Starts the workflow and waits for the user to select one or more valid options.
   * @returns A `Promise` that resolves to an array of the selected options of type `T`,
   * or `null` if the user fails to respond in time.
   */
  public async selectMany(): Promise<T[] | null> {
    const selectedOptionNumbers = await this.askUntilGetValidOptions();
    if (selectedOptionNumbers === null) {
      return null; // Timeout or failure
    }

    const startIndex = this.config.startingNumber ?? 1;
    // Map each selected number to its corresponding option.
    const selectedOptions = selectedOptionNumbers.map(num => {
      const selectedIndex = num - startIndex;
      return this.options[selectedIndex]!;
    });

    return selectedOptions;
  }

  /**
   * Handles the core loop of sending options, waiting for a reply, and validating it for multiple numbers.
   * @returns A `Promise` that resolves to an array of unique numbers chosen by the user, or `null` on timeout.
   */
  private async askUntilGetValidOptions(): Promise<number[] | null> {
    const start = this.config.startingNumber ?? 1;

    // Create a set of all valid selectable numbers for quick validation.
    const validNumberSet = new Set(this.options.map((_, i) => i + start));

    const allOptionsText = this.options
      .map((option, index) => `${index + start}. ` + this.config.FrontEndSelector(option, index))
      .join("\n");

    const fullPrompt = `${this.config.StartingMsg}\n\n${allOptionsText}`;

    // Send the full prompt initially.
    await this.ctx.SendText(fullPrompt);

    while (true) {
      const responseMsg: WhatsappMessage | null = await this.ctx.WaitMsg(MsgType.Text, {
        timeoutSeconds: this.config.TimeoutMS / 1000,
      });

      // Handle timeout
      if (responseMsg === null) {
        return null;
      }

      const responseText = Helpers.Msg.FullMsg_GetText(responseMsg)?.trim();

      if (typeof responseText !== "string") {
        throw new Error(
          "WorkFlowNumericMany (Inside flow): Text Messages should always return text! (check IChatcontext.WaitMsg() code)"
        );
      }

      // Handle empty text
      if (responseText === "") {
        await this.ctx.SendText(this.config.WrongMsg);
        continue;
      }

      // **Core logic for multiple selections**
      // 1. Normalize separators (replace commas with spaces).
      // 2. Split into parts by one or more spaces.
      // 3. Filter out any empty strings resulting from multiple spaces.
      const parts = responseText
        .replace(/,/g, " ")
        .split(/\s+/)
        .filter(p => p);

      if (parts.length === 0) {
        await this.ctx.SendText(this.config.WrongMsg);
        continue;
      }

      const numbers = parts.map(Number);

      // 4. Validate: Check if any part is not a number (`NaN`) or if any number is not in our set of valid options.
      const allValid = numbers.every(num => !isNaN(num) && validNumberSet.has(num));

      if (allValid) {
        // Use a Set to automatically handle duplicate entries (e.g., "1, 2, 1") and return a unique array.
        return [...new Set(numbers)];
      } else {
        await this.ctx.SendText(this.config.WrongMsg);
      }
    }
  }
}
