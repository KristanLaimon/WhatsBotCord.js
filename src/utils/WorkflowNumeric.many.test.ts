import { beforeEach, describe, expect, it } from "bun:test";
import type { AdditionalAPI, CommandArgs, IChatContext, ICommand } from "../index.js";
import { ChatMock, SenderType } from "../index.js";
import { WorkFlowNumericMany } from "./WorkflowNumeric.many.js";
import type { WorkflowNumericArgs } from "./WorkflowNumeric.types.js";

// A mock command to wrap the workflow logic, making it compatible with ChatMock.
class WorkflowTestCommand implements ICommand {
  name = "test-workflow";

  // This property will store the final result of the workflow for assertions.
  public result: string[] | null = null;
  private workflow!: WorkFlowNumericMany<string>;

  constructor(private config: WorkflowNumericArgs<string>, private options: string[]) {}

  // The run method is where the workflow is initiated.
  async run(ctx: IChatContext, _api: AdditionalAPI, _args: CommandArgs): Promise<void> {
    this.workflow = new WorkFlowNumericMany(ctx, this.config, this.options);
    this.result = await this.workflow.selectMany();
  }
}

describe("WorkFlowNumericMany with ChatMock", () => {
  let command: WorkflowTestCommand;
  const options = ["Apple", "Banana", "Cherry", "Dragon Fruit"];

  const config: WorkflowNumericArgs<string> = {
    StartingMsg: "Please choose your favorite fruits:",
    WrongMsg: "Invalid selection. Please use numbers separated by commas or spaces.",
    TimeoutMS: 500, // Using a short timeout for tests
    FrontEndSelector: (option: string) => option,
  };

  // Create a new command instance before each test to ensure isolation.
  beforeEach(() => {
    command = new WorkflowTestCommand(config, options);
  });

  // Test suite begins
  it("should send the initial prompt with correctly numbered options", async () => {
    const mockChat = new ChatMock(command, { senderType: SenderType.Individual });

    mockChat.EnqueueIncoming_Text("1 3");
    await mockChat.StartChatSimulation();

    const expectedPrompt = "Please choose your favorite fruits:\n\n1. Apple\n2. Banana\n3. Cherry\n4. Dragon Fruit";
    expect(mockChat.SentFromCommand.Texts[0]?.text).toBe(expectedPrompt);
  });

  it("should return the correct options when valid numbers are provided with spaces", async () => {
    const mockChat = new ChatMock(command, { senderType: SenderType.Individual });

    mockChat.EnqueueIncoming_Text("1 4");
    await mockChat.StartChatSimulation();

    expect(command.result).toEqual(["Apple", "Dragon Fruit"]);
    expect(mockChat.SentFromCommand.Texts).toHaveLength(1);
  });

  it("should return the correct options when valid numbers are provided with commas", async () => {
    const mockChat = new ChatMock(command, { senderType: SenderType.Individual });

    mockChat.EnqueueIncoming_Text("2,3");
    await mockChat.StartChatSimulation();

    expect(command.result).toEqual(["Banana", "Cherry"]);
  });

  it("should return the correct options when valid numbers are provided with mixed spaces and commas", async () => {
    const mockChat = new ChatMock(command, { senderType: SenderType.Individual });

    mockChat.EnqueueIncoming_Text("1, 2 4");
    await mockChat.StartChatSimulation();

    expect(command.result).toEqual(["Apple", "Banana", "Dragon Fruit"]);
  });

  it("should handle duplicate numbers in the input and return unique options", async () => {
    const mockChat = new ChatMock(command, { senderType: SenderType.Individual });

    mockChat.EnqueueIncoming_Text("1, 3, 1");
    await mockChat.StartChatSimulation();

    expect(command.result).toEqual(["Apple", "Cherry"]);
  });

  it(
    "should return null if the user does not respond within the timeout period",
    async () => {
      const mockChat = new ChatMock(command, { senderType: SenderType.Individual });

      // No incoming messages enqueued to simulate a timeout.
      mockChat.EnqueueIncoming_Text("nothing_wrong", { delayMilisecondsToReponse: 600 });
      await mockChat.StartChatSimulation();

      expect(command.result).toBeNull();
    }
  );

  it("should send a 'wrong message' for non-numeric input and then accept a valid one", async () => {
    const mockChat = new ChatMock(command, { senderType: SenderType.Individual });

    mockChat.EnqueueIncoming_Text("one, two");
    mockChat.EnqueueIncoming_Text("1 2");
    await mockChat.StartChatSimulation();

    expect(mockChat.SentFromCommand.Texts[1]?.text).toBe(
      "Invalid selection. Please use numbers separated by commas or spaces."
    );
    expect(command.result).toEqual(["Apple", "Banana"]);
  });

  it("should send a 'wrong message' for an out-of-range number and then accept a valid one", async () => {
    const mockChat = new ChatMock(command, { senderType: SenderType.Individual });

    mockChat.EnqueueIncoming_Text("1 5"); // '5' is out of range.
    mockChat.EnqueueIncoming_Text("1 4");
    await mockChat.StartChatSimulation();

    expect(mockChat.SentFromCommand.Texts[1]?.text).toBe(
      "Invalid selection. Please use numbers separated by commas or spaces."
    );
    expect(command.result).toEqual(["Apple", "Dragon Fruit"]);
  });

  it("should handle a custom starting number correctly", async () => {
    const customConfig = { ...config, startingNumber: 5 };
    command = new WorkflowTestCommand(customConfig, options);
    const mockChat = new ChatMock(command, { senderType: SenderType.Individual });

    mockChat.EnqueueIncoming_Text("6 8"); // Corresponds to "Banana" and "Dragon Fruit"
    await mockChat.StartChatSimulation();

    const expectedPrompt = "Please choose your favorite fruits:\n\n5. Apple\n6. Banana\n7. Cherry\n8. Dragon Fruit";
    expect(mockChat.SentFromCommand.Texts[0]?.text).toBe(expectedPrompt);
    expect(command.result).toEqual(["Banana", "Dragon Fruit"]);
  });

  it("should repeatedly ask until a valid response is received after multiple failures", async () => {
    const mockChat = new ChatMock(command, { senderType: SenderType.Individual });

    mockChat.EnqueueIncoming_Text("apple");
    mockChat.EnqueueIncoming_Text("");
    mockChat.EnqueueIncoming_Text("1, 99"); // '99' is out of range.
    mockChat.EnqueueIncoming_Text("2 3"); // Finally, a valid input
    await mockChat.StartChatSimulation();

    expect(mockChat.SentFromCommand.Texts).toHaveLength(4); // 1 prompt + 3 error messages
    expect(command.result).toEqual(["Banana", "Cherry"]);
  });
});
