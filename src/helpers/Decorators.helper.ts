/**
 * Method decorator that ensures the decorated function is always invoked
 * with its original class instance as `this`.
 *
 * Useful for preserving context when passing methods as callbacks,
 * event handlers, or asynchronous operations.
 *
 * @returns Updated property descriptor with bound method behavior
 */
export function autobind(_target: any, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const originalMethod = descriptor.value;
  if (typeof originalMethod !== "function") {
    throw new Error(`@autobindd can only be applied to methods, not: ${propertyKey}`);
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
