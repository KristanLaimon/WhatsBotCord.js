/**
 * The signature for the function that passes control to the next middleware.
 */
export type NextFunction = () => Promise<void>;

/**
 * The generic signature for a middleware function.
 * @template TArgs An array type representing the arguments (e.g., [string, number]).
 * @param context The `this` context from the original caller.
 * @param args The typed arguments passed to the chain.
 * @param next The function to call to proceed to the next middleware.
 */
export type MiddlewareFunction<TArgs extends any[]> = (...args: [...TArgs, NextFunction]) => void | Promise<void>;

/**
 * Manages the execution of a series of strongly-typed middleware functions.
 * @template TArgs An array type representing the arguments the chain will handle.
 */
export class MiddlewareChain<TArgs extends any[] = any[]> {
  private readonly _middleware: Array<MiddlewareFunction<TArgs>>;

  /**
   * @param middleware An array of middleware functions to execute in order.
   */
  constructor(middleware: Array<MiddlewareFunction<TArgs>>) {
    this._middleware = middleware;
  }

  /**
   * Executes the middleware chain with strongly-typed arguments.
   * @param context The object to use as `this` within middleware functions.
   * @param args Arguments that match the generic type `TArgs`.
   * @returns A promise that resolves to `true` if the chain completes, or `false` otherwise.
   */
  public async run(...args: TArgs): Promise<boolean> {
    if (this._middleware.length === 0) {
      return true;
    }

    let isChainCompleted = false;

    const callNext = async (index: number): Promise<void> => {
      if (index >= this._middleware.length) {
        isChainCompleted = true;
        return;
      }

      const currentMiddleware = this._middleware[index]!;
      const next = () => callNext(index + 1);
      // The provided 'args' are now passed with their types intact.
      await Promise.resolve(currentMiddleware(...args, next));
    };

    await callNext(0);
    return isChainCompleted;
  }
}
