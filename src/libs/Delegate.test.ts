import Delegate from './Delegate';
import { expect, test, beforeEach, fn, describe, it } from "../TestSuite";

/** In C# delegate with no params and no return types are called 'Actions' */
let ACTION: Delegate<() => void>;
let DELEGATE_STR: Delegate<(strParam: string) => void>;
let DELEGATE_RETURN_INT: Delegate<() => number>;

let all: Delegate<any>[];

beforeEach(() => {
  ACTION = new Delegate();
  DELEGATE_STR = new Delegate();
  DELEGATE_RETURN_INT = new Delegate();
  all = [ACTION, DELEGATE_STR, DELEGATE_RETURN_INT];
});

test("Subscribe_WhenAddingAFunction_ShouldIncreseaseInternalFunctionsList", () => {
  for (const delegate of all)
    expect(delegate.Length).toBe(0);

  ACTION.Subscribe(() => { });
  DELEGATE_STR.Subscribe((_strParam: string) => { });
  DELEGATE_RETURN_INT.Subscribe(() => 42);

  for (const delegate of all)
    expect(delegate.Length).toBe(1);

  ACTION.Subscribe(() => { });
  DELEGATE_STR.Subscribe((_strParam: string) => { });
  DELEGATE_RETURN_INT.Subscribe(() => 42);

  for (const delegate of all)
    expect(delegate.Length).toBe(2);
});

test("Unsubscribe_WhenRemovingAFunction_ShouldDecreaseInternalFunctionsList", () => {
  let action1 = (): void => { };
  let action2 = (): void => { };
  let delegateStr1 = (_strParam: string): void => { };
  let delegateStr2 = (_strParam: string): void => { };
  let delegateReturnInt1 = (): number => 42;
  let delegateReturnInt2 = (): number => 42;

  ACTION.Subscribe(action1);
  ACTION.Subscribe(action2);
  DELEGATE_STR.Subscribe(delegateStr1);
  DELEGATE_STR.Subscribe(delegateStr2);
  DELEGATE_RETURN_INT.Subscribe(delegateReturnInt1);
  DELEGATE_RETURN_INT.Subscribe(delegateReturnInt2);

  for (const delegate of all)
    expect(delegate.Length).toBe(2);

  ACTION.Unsubsribe(action1);
  DELEGATE_STR.Unsubsribe(delegateStr1);
  DELEGATE_RETURN_INT.Unsubsribe(delegateReturnInt2);

  for (const delegate of all)
    expect(delegate.Length).toBe(1);

  ACTION.Unsubsribe(action2);
  DELEGATE_STR.Unsubsribe(delegateStr2);
  DELEGATE_RETURN_INT.Unsubsribe(delegateReturnInt1);

  for (const delegate of all)
    expect(delegate.Length).toBe(0);
});



describe("Delegate.CallAll()", () => {
  it('WhenNoArguments_ShouldBeCalledCorrectly', () => {
    const delegate = new Delegate<() => void>();
    const func1 = fn();
    const func2 = fn();
    delegate.Subscribe(func1);
    delegate.Subscribe(func2);
    delegate.CallAll();
    expect(func1).toHaveBeenCalledTimes(1);
    expect(func2).toHaveBeenCalledTimes(1);
  });

  it('WhenTwoArgumentsProvided_ShouldBeCalledCorrectly', () => {
    const delegate = new Delegate<(x: number, y: number) => void>();
    const func1 = fn();
    const func2 = fn();
    delegate.Subscribe(func1);
    delegate.Subscribe(func2);
    delegate.CallAll(1, 2);
    expect(func1).toHaveBeenCalledTimes(1);
    expect(func1).toHaveBeenCalledWith(1, 2);
    expect(func2).toHaveBeenCalledTimes(1);
    expect(func2).toHaveBeenCalledWith(1, 2);
  });

  it('WhenNoSubscribers_ShouldntHappenAnything;NoErrorThrown', () => {
    const delegate = new Delegate<() => void>();
    delegate.CallAll();
    // no expectations, just verifying no error is thrown
  });
});