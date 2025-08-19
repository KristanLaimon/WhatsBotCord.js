import { GetPath } from './BunPath';
// import { isCompiled } from './Envs';
import path from 'node:path';
import { describe, test, it, expect, beforeEach, mockModule } from "@/TestSuite";

test("Envs path can be mocked (Good path to file)", () => {
  expect(() => {
    mockModule("../Envs", () => ({}));
  }).not.toThrow();
})

describe("No Compilation Mode", () => {
  beforeEach(() => {
    mockModule("../Envs", () => {
      return { isCompiled: true, isDev: true };
    })
  })

  it('GetPath_WhenUsingSingleStringPath_ShouldReturnRelativeToCWD', () => {
    const filePath = 'path/to/file';
    const expectedPath = path.join(process.cwd(), filePath);
    const res = GetPath(filePath);
    expect(res).toBe(expectedPath);
  });

  it('GetPath_WhenUsingMultiplePathsArray_ShouldReturnRelativeToCWD', () => {
    const filePaths = ['path', 'to', 'file'];
    const expectedPath = path.join(process.cwd(), ...filePaths);
    expect(GetPath(...filePaths)).toBe(expectedPath);
  });

  it('GetPath_WhenEmptyStringProvided_ShouldReturnEmptyString', () => {
    expect(GetPath()).toBe('');
  });
})

describe("Compilation Mode", () => {
  beforeEach(() => {
    mockModule("./Envs", () => {
      return { isCompiled: false, isDev: true };
    })
  })

  it('GetPath_WhenOneSinglePathStringProvided_ShouldReturnPathWithoutCWD', () => {
    const filePath = 'path/to/file';
    const expectedPath = path.join(filePath);
    expect(GetPath(filePath)).toBe(expectedPath);
  });

  it('GetPath_WhenNoFilePathsProvided_ShouldReturnEmptyString', () => {
    expect(GetPath()).toBe('');
  });
});






