import { GetPath } from './BunPath';
import path from 'node:path';
import { describe, test, it, expect, beforeEach, mockModule } from "@/TestSuite";

const EnvsModulePath = "../Envs";

test("Envs path can be mocked (Good path to file)", () => {
  expect(() => {
    mockModule(EnvsModulePath, () => ({}));
  }).not.toThrow();
})

describe("No Compilation Mode", () => {
  beforeEach(() => {
    mockModule(EnvsModulePath, () => {
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
    mockModule(EnvsModulePath, () => {
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






