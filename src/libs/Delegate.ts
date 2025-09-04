/**
 * Simple delegate C#-like for Observer pattern and events.
 */

export type DelegateConsumer<fnType extends (...args: any[]) => any> = Omit<Delegate<fnType>, "CallAll">;

export default class Delegate<functType extends (...args: any[]) => any> {
  private functions: functType[] = [];

  public get Length(): number {
    return this.functions.length;
  }

  public Subscribe(funct: functType): void {
    this.functions.push(funct);
  }

  public Unsubscribe(funct: functType): boolean {
    const foundFunctIndex = this.functions.findIndex((f) => f === funct);
    if (foundFunctIndex === -1) return false;
    this.functions.splice(foundFunctIndex, 1);
    return true;
  }

  public CallAll(...args: Parameters<functType>) {
    this.functions.forEach((f) => f(...args));
  }

  public Clear(): void {
    this.functions = [];
  }
}
