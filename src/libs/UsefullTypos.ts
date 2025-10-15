export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/**
 * Recursively makes all properties of an object required.
 */
export type DeepRequired<T> = T extends (...args: any[]) => any
  ? T
  : T extends any[]
  ? DeepRequiredArray<T[number]>
  : T extends object
  ? DeepRequiredObject<T>
  : T;

/** @private */
interface DeepRequiredArray<T> extends Array<DeepRequired<T>> {}

/** @private */
type DeepRequiredObject<T> = {
  [P in keyof T]-?: DeepRequired<T[P]>;
};
