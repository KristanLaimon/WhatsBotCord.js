import { GetPath } from './BunPath';
// import { isCompiled } from './Envs';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach, spyOn, restoreAllMocks, mockModule, test } from "./TestSuite";
import { isCompiled } from './Envs';


describe("No Compilation Mode", () => {
  mockModule("./Envs", () => {
    return {
      isCompiled: true
    }
  })

  test("isgood", () => {

  });
})

beforeEach(() => {
  spyOn(require('./Envs'), 'isCompiled').mockImplementation(() => {
    return true; // Default to true, will be overridden in some individual tests
  });
});

afterEach(() => {
  restoreAllMocks();
});

it('should return path with process.cwd() when isCompiled is true', () => {
  const filePath = 'path/to/file';
  const expectedPath = path.join(process.cwd(), filePath);
  expect(GetPath(filePath)).toBe(expectedPath);
});

it('should return path without process.cwd() when isCompiled is false', () => {
  spyOn(require('./Envs'), 'isCompiled').mockImplementation(() => false);
  const filePath = 'path/to/file';
  const expectedPath = path.join(filePath);
  expect(GetPath(filePath)).toBe(expectedPath);
});

it('should handle multiple file paths', () => {
  const filePaths = ['path', 'to', 'file'];
  const expectedPath = path.join(process.cwd(), ...filePaths);
  expect(GetPath(...filePaths)).toBe(expectedPath);
});

it('should handle a single file path', () => {
  const filePath = 'path/to/file';
  const expectedPath = path.join(process.cwd(), filePath);
  expect(GetPath(filePath)).toBe(expectedPath);
});

it('should return empty string when no file paths are provided', () => {
  expect(GetPath()).toBe('');
});