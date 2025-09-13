import { beforeEach, describe, expect, it, mock } from "bun:test";
import path from "node:path";
import { isCompiled, isDev } from "../Envs.js";

const EnvsModulePath = "../Envs";

it("Envs are normal at the beginning", () => {
  expect(isCompiled).toBe(false);
  expect(isDev).toBe(true);
});

describe("Compilation Mode", () => {
  beforeEach(() => {
    mock.module(EnvsModulePath, () => ({
      isCompiled: true,
      isDev: true,
    }));
  });

  it("GetPath_WhenUsingSingleStringPath_ShouldReturnRelativeToCWD", async () => {
    const { GetPath } = await import("./BunPath"); // import after mock
    const filePath = "path/to/file";
    const expectedPath = path.join(process.cwd(), filePath);
    expect(GetPath(filePath)).toBe(expectedPath);
  });

  it("GetPath_WhenUsingMultiplePathsArray_ShouldReturnRelativeToCWD", async () => {
    const { GetPath } = await import("./BunPath");
    const filePaths = ["path", "to", "file"];
    const expectedPath = path.join(process.cwd(), ...filePaths);
    expect(GetPath(...filePaths)).toBe(expectedPath);
  });
});

describe("No Compilation Mode", () => {
  beforeEach(() => {
    mock.module(EnvsModulePath, () => ({
      isCompiled: false,
      isDev: true,
    }));
  });

  it("GetPath_WhenOneSinglePathStringProvided_ShouldReturnPathWithoutCWD", async () => {
    const { GetPath } = await import("./BunPath");
    const filePath = "path/to/file";
    const expectedPath = path.join(filePath);
    expect(GetPath(filePath)).toBe(expectedPath);
  });

  it("GetPath_WhenNoFilePathsProvided_ShouldReturnEmptyString", async () => {
    const { GetPath } = await import("./BunPath");
    expect(GetPath()).toBe("");
  });
});
