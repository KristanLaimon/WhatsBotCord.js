/**
 * Method decorator that ensures the decorated function is always invoked
 * with its original class instance as `this`.
 *
 * Throws an error if applied to anything other than an instance method.
 */
export function autobind(target: any, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const originalMethod = descriptor.value;

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
