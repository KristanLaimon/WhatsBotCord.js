import { describe, expect, it } from "bun:test";
import { autobind } from "./Decorators.helper";

describe("@autobind", () => {
  it("WhenUsingOnNonMethods_ShouldThrowError", () => {
    class TestClass {
      prop = 123;
    }

    const descriptor: PropertyDescriptor = {
      value: 123,
      writable: true,
      configurable: true,
    };

    expect(() => autobind(TestClass.prototype, "prop", descriptor)).toThrow("@autobind can only be applied to methods");
  });

  it("WhenUsingOnStaticMethod_ShouldThrowError", () => {
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    class TestClass {
      static staticMethod() {}
    }

    const descriptor = Object.getOwnPropertyDescriptor(TestClass, "staticMethod")!;
    expect(() => autobind(TestClass, "staticMethod", descriptor)).toThrow("@autobind cannot be applied to static methods");
  });

  it("WhenUsingOnGetter_ShouldThrowError", () => {
    class TestClass {
      get something() {
        return 42;
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(TestClass.prototype, "something")!;
    expect(() => autobind(TestClass.prototype, "something", descriptor)).toThrow("@autobind can only be applied to methods, not: something");
  });

  it("WhenUsingOnValidInstanceMethod_ShouldBindThis", () => {
    class TestClass {
      value = 10;
      @autobind
      getValue() {
        return this.value;
      }
    }

    const inst = new TestClass();
    const { getValue } = inst;
    expect(getValue()).toBe(10); // should still work even detached

    class TestClassWrong {
      private value = 10;
      //notautobind
      getValue() {
        return this.value;
      }
    }

    const inst2 = new TestClassWrong();
    const { getValue: getValue2 } = inst2;
    expect(() => {
      getValue2();
    }).toThrowError();
  });
});
