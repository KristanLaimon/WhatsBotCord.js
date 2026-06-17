/**
 * Configuration arguments for the `WorkflowNumeric` class.
 * @template T The type of the options to be presented.
 */
export type WorkflowNumericArgs<T> = {
  /** A function that converts an option of type `T` into a display string for the user. */
  FrontEndSelector: (
    option: T,
    index: number
  ) => string /** The introductory message to send before listing the options. */;
  StartingMsg: string /** The message to send when the user provides an invalid (non-numeric or out-of-range) response. */;
  WrongMsg: string /** The time in milliseconds to wait for a user's response before the workflow times out. */;
  TimeoutMS: number /** The number to start the list from (e.g., 1). Defaults to 1. */;
  startingNumber?: number;
};
