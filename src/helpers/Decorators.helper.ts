/**
 * Method decorator that ensures the decorated function is always invoked
 * with its original class instance as `this`.
 *
 * Throws an error if applied to anything other than an instance method.
 */
export function autobind(target: any, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const originalMethod = descriptor.value;

  // Must be a function
  if (typeof originalMethod !== "function") {
    throw new Error(`@autobind can only be applied to methods, not: ${propertyKey}`);
  }

  // Must be an instance method, not a static method
  const isStatic = target.constructor === Function; // static methods have target === constructor
  if (isStatic) {
    throw new Error(`@autobind cannot be applied to static methods: ${propertyKey}`);
  }

  // Must not be a getter/setter
  if (descriptor.get || descriptor.set) {
    throw new Error(`@autobind cannot be applied to getters or setters: ${propertyKey}`);
  }

  return {
    configurable: true,
    get() {
      const bound = originalMethod.bind(this);
      Object.defineProperty(this, propertyKey, {
        value: bound,
        configurable: true,
        writable: true,
      });
      return bound;
    },
  };
}
