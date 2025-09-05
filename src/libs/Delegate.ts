/**
 * A simple delegate implementation inspired by C# delegates.
 * Useful for the Observer pattern and event-driven programming.
 *
 * @template functType - The function signature that the delegate can hold.
 */

/**
 * Represents a delegate consumer type that exposes all Delegate functionality
 * except the `CallAll` method. Useful for restricting access to certain operations.
 *
 * @template fnType - The function signature that the delegate consumes.
 */
export type DelegateConsumer<fnType extends (...args: any[]) => any> = Omit<Delegate<fnType>, "CallAll">;

export default class Delegate<functType extends (...args: any[]) => any> {
  /** Internal storage for all subscribed functions. */
  private functions: functType[] = [];

  /**
   * The number of functions currently subscribed to this delegate.
   */
  public get Length(): number {
    return this.functions.length;
  }

  /**
   * Subscribes a new function to the delegate.
   *
   * @param funct - The function to add.
   */
  public Subscribe(funct: functType): void {
    this.functions.push(funct);
  }

  /**
   * Unsubscribes a previously added function from the delegate.
   *
   * @param funct - The function to remove.
   * @returns `true` if the function was found and removed, otherwise `false`.
   */
  public Unsubscribe(funct: functType): boolean {
    const foundFunctIndex = this.functions.findIndex((f) => f === funct);
    if (foundFunctIndex === -1) return false;
    this.functions.splice(foundFunctIndex, 1);
    return true;
  }

  /**
   * Calls all subscribed functions synchronously with the provided arguments.
   *
   * @param args - Arguments to pass to each subscribed function.
   */
  public CallAll(...args: Parameters<functType>): void {
    this.functions.forEach((f) => f(...args));
  }

  /**
   * Calls all subscribed functions asynchronously with the provided arguments.
   * Each function is awaited sequentially.
   *
   * @param args - Arguments to pass to each subscribed function.
   * @returns A promise that resolves when all functions have been called.
   */
  public async CallAllAsync(...args: Parameters<functType>): Promise<void> {
    for (let i = 0; i < this.functions.length; i++) {
      await this.functions[i]!(...args);
    }
  }

  /**
   * Removes all subscribed functions from this delegate.
   */
  public Clear(): void {
    this.functions = [];
  }
}
