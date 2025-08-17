import { expect, test, describe, it, beforeAll, beforeEach, mock, afterAll, afterEach, spyOn, jest } from "bun:test";

const restoreAllMocks = jest.restoreAllMocks;
const clearAllMocks = jest.clearAllMocks;
const moduleMocking = mock.module;

/**
 * This module is a common interface to provide a self-contained weakly-coupled
 * testing suite utilites for the whole proyect independent of the testing framework used.
 * 
 * If someday It's neeeded to change the testing framework, this module will be the only one to change!
 */
export {
  expect,
  test,
  describe,
  it,
  beforeAll,
  beforeEach,
  mock as fn,
  afterAll,
  afterEach,
  spyOn,
  restoreAllMocks,
  clearAllMocks,
  moduleMocking as mockModule
}