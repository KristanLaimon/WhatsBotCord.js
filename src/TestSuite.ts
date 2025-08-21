import { expect, test, describe, it, beforeAll, beforeEach, vi, afterAll, afterEach } from "vitest";

const restoreAllMocks = vi.restoreAllMocks;
const clearAllMocks = vi.clearAllMocks;
const resetModules = vi.resetModules;
const moduleMocking = vi.mock;
const moduleMockingPerText = vi.doMock;
const mock = vi.fn;
const spyOn = vi.spyOn;
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
  moduleMocking as mockModule,
  moduleMockingPerText as doMockModule,
  resetModules
}