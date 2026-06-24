/**
 * # Autobind Decorator
 *
 * Method decorator that ensures the decorated function is always invoked
 * with its original class instance as `this`.
 *
 * Supports both experimental (Stage 2) and standard (Stage 3) decorator signatures.
 *
 * Throws an error if applied to anything other than an instance method.
 *
 * @param target - The method being decorated (Stage 3) or target prototype (Stage 2).
 * @param propertyKeyOrContext - The decorator context (Stage 3) or property key (Stage 2).
 * @param descriptor - The property descriptor (Stage 2 only).
 * @returns A property descriptor (Stage 2) or `void` (Stage 3).
 *
 * @example
 * ```typescript
 * class MyClass {
 *   @autobind
 *   myMethod() { console.log(this); }
 * }
 * ```
 */
export function autobind<T, A extends any[], R>(
  target: (this: T, ...args: A) => R,
  context: ClassMethodDecoratorContext<T, (this: T, ...args: A) => R>
): void;

export function autobind(
  target: any,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor
): PropertyDescriptor;

export function autobind(
  target: any,
  propertyKeyOrContext: string | symbol | ClassMethodDecoratorContext,
  descriptor?: PropertyDescriptor
): any {
  // Check if standard TC39 Stage 3 decorator
  if (
    propertyKeyOrContext &&
    typeof propertyKeyOrContext === "object" &&
    "kind" in propertyKeyOrContext
  ) {
    const context = propertyKeyOrContext as ClassMethodDecoratorContext;
    if (context.kind !== "method") {
      throw new Error(`@autobind can only be applied to methods, not: ${String(context.name)}`);
    }

    if (context.static) {
      throw new Error(`@autobind cannot be applied to static methods: ${String(context.name)}`);
    }

    const methodName = context.name;
    context.addInitializer(function (this: any) {
      const originalMethod = this[methodName];
      if (typeof originalMethod === "function") {
        this[methodName] = originalMethod.bind(this);
      }
    });
    return;
  }

  // Experimental Stage 2 decorator path
  if (!descriptor) {
    throw new Error("@autobind helper expects a property descriptor when used as an experimental decorator.");
  }

  const originalMethod = descriptor.value;
  const propertyKey = propertyKeyOrContext as string;

  // Validate that the decorator is applied to a function
  if (typeof originalMethod !== "function") {
    throw new Error(`@autobind can only be applied to methods, not: ${propertyKey}`);
  }

  // Validate that the method is not static
  const isStatic = target.constructor === Function;
  if (isStatic) {
    throw new Error(`@autobind cannot be applied to static methods: ${propertyKey}`);
  }

  // Validate that the decorator is not applied to getters or setters
  if (descriptor.get || descriptor.set) {
    throw new Error(`@autobind cannot be applied to getters or setters: ${propertyKey}`);
  }

  return {
    configurable: true,
    enumerable: descriptor.enumerable,
    get() {
      // Bind the original method to the instance
      const bound = originalMethod.bind(this);

      // Define the property on the instance to allow reassignment
      Object.defineProperty(this, propertyKey, {
        value: bound,
        configurable: true, // Allow redefinition
        writable: true, // Allow reassignment
        enumerable: descriptor.enumerable,
      });

      return bound;
    },
    set(newValue: any) {
      // Allow the property to be reassigned (e.g., for mocking)
      Object.defineProperty(this, propertyKey, {
        value: newValue,
        configurable: true,
        writable: true,
        enumerable: descriptor.enumerable,
      });
    },
  };
}
