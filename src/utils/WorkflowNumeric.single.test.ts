import { beforeEach, describe, expect, it } from "bun:test";
import type { AdditionalAPI, CommandArgs, IChatContext, ICommand } from "../index.js";
import { ChatMock, SenderType } from "../index.js";
import { WorkflowNumericSingle } from "./WorkflowNumeric.single.js";
import type { WorkflowNumericArgs } from "./WorkflowNumeric.types.js";

// A mock command to wrap the workflow logic, making it compatible with ChatMock.
class WorkflowTestCommand implements ICommand {
  name = "test-workflow";

  // This property will store the final result of the workflow for assertions.
  public result: string | null = null;
  private workflow!: WorkflowNumericSingle<string>;

  constructor(private config: WorkflowNumericArgs<string>, private options: string[]) {}

  // The run method is where the workflow is initiated.
  async run(ctx: IChatContext, _api: AdditionalAPI, _args: CommandArgs): Promise<void> {
    this.workflow = new WorkflowNumericSingle(ctx, this.config, this.options);
    this.result = await this.workflow.selectOne();
  }
}

describe("WorkflowNumericSingle with ChatMock", () => {
  let command: WorkflowTestCommand;
  const options = ["Apple", "Banana", "Cherry"];

  const config: WorkflowNumericArgs<string> = {
    StartingMsg: "Please choose a fruit:",
    WrongMsg: "Invalid choice. Try again.",
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

    // We don't enqueue any user messages, so we can test the initial bot prompt.
    mockChat.EnqueueIncoming_Text("1");
    await mockChat.StartChatSimulation();

    const expectedPrompt = "Please choose a fruit:\n\n1. Apple\n2. Banana\n3. Cherry";
    expect(mockChat.SentFromCommand.Texts[0]?.text).toBe(expectedPrompt);
  });

  it("should return the correct option when a valid number is provided", async () => {
    const mockChat = new ChatMock(command, { senderType: SenderType.Individual });

    // Simulate the user sending a valid response.
    mockChat.EnqueueIncoming_Text("2");
    await mockChat.StartChatSimulation();

    expect(command.result).toBe("Banana");
    // No "WrongMsg" should be sent, so only the prompt should be in the history.
    expect(mockChat.SentFromCommand.Texts).toHaveLength(1);
  });

  it(
    "should return null if the user does not respond within the timeout period",
    async () => {
      const mockChat = new ChatMock(command, { senderType: SenderType.Individual });

      // Don't enqueue any messages to simulate a timeout.
      mockChat.EnqueueIncoming_Text("wrong", { delayMilisecondsToReponse: 1000 }); // GEMINI HERE I HAVE A PROBLEM
      await mockChat.StartChatSimulation();

      expect(command.result).toBeNull();
    }
  );

  it("should send the wrong message for non-numeric input and then accept a valid one", async () => {
    const mockChat = new ChatMock(command, { senderType: SenderType.Individual });

    mockChat.EnqueueIncoming_Text("not a number");
    mockChat.EnqueueIncoming_Text("1");
    await mockChat.StartChatSimulation();

    // The first message is the prompt, the second is the error message.
    expect(mockChat.SentFromCommand.Texts[1]?.text).toBe("Invalid choice. Try again.");
    expect(command.result).toBe("Apple");
  });

  it("should send the wrong message for an out-of-range number", async () => {
    const mockChat = new ChatMock(command, { senderType: SenderType.Individual });

    mockChat.EnqueueIncoming_Text("4"); // This option doesn't exist.
    mockChat.EnqueueIncoming_Text("3");
    await mockChat.StartChatSimulation();

    expect(mockChat.SentFromCommand.Texts[1]?.text).toBe("Invalid choice. Try again.");
    expect(command.result).toBe("Cherry");
  });

  it("should handle a custom starting number correctly", async () => {
    const customConfig = { ...config, startingNumber: 10 };
    command = new WorkflowTestCommand(customConfig, options);
    const mockChat = new ChatMock(command, { senderType: SenderType.Individual });

    mockChat.EnqueueIncoming_Text("11"); // Corresponds to "Banana"
    await mockChat.StartChatSimulation();

    const expectedPrompt = "Please choose a fruit:\n\n10. Apple\n11. Banana\n12. Cherry";
    expect(mockChat.SentFromCommand.Texts[0]?.text).toBe(expectedPrompt);
    expect(command.result).toBe("Banana");
  });

  it("should repeatedly ask until a valid response is received after multiple failures", async () => {
    const mockChat = new ChatMock(command, { senderType: SenderType.Individual });

    // Enqueue a series of invalid inputs followed by a valid one.
    mockChat.EnqueueIncoming_Text("first try");
    mockChat.EnqueueIncoming_Text(""); // Empty string
    mockChat.EnqueueIncoming_Text("99"); // Out of range
    mockChat.EnqueueIncoming_Text("3"); // Finally, a valid input
    await mockChat.StartChatSimulation();

    // Expect 1 prompt message + 3 "WrongMsg" messages.
    expect(mockChat.SentFromCommand.Texts).toHaveLength(4);
    expect(mockChat.SentFromCommand.Texts[1]?.text).toBe("Invalid choice. Try again.");
    expect(mockChat.SentFromCommand.Texts[2]?.text).toBe("Invalid choice. Try again.");
    expect(mockChat.SentFromCommand.Texts[3]?.text).toBe("Invalid choice. Try again.");
    expect(command.result).toBe("Cherry");
  });
});
