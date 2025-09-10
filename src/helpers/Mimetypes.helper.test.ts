import { describe, expect, it } from "bun:test";
import { MimeTypeHelper_IsImage, MimeTypeHelper_IsVideo } from "./Mimetypes.helper";

describe("MimeTypeHelper_IsImage", () => {
  const imageFileTypes: string[] = [
    ".png", // Portable Network Graphics
    ".jpeg", // Joint Photographic Experts Group
    ".jpg", // JPG alternate
    ".gif", // Graphics Interchange Format
    ".webp", // WebP by Google
    ".bmp", // Bitmap
    ".tiff", // Tagged Image File Format
    ".tif", // TIFF alternate
    ".heif", // High Efficiency Image Format
    ".heic", // High Efficiency Image Format (Apple)
    ".ico", // Icon
    ".avif", // AV1 Image File Format
    ".jp2", // JPEG 2000
    ".exr", // OpenEXR
    ".svg", // Scalable Vector Graphics
  ];
  const commonImgsPaths = imageFileTypes.map((extensionStr) => "./image" + extensionStr);

  it("ShouldRecognizeAsImagePath", () => {
    for (const img of commonImgsPaths) {
      const res: boolean = MimeTypeHelper_IsImage(img);
      expect(res).toBe(true);
    }
  });

  it("ShouldRecognizeAsExtensionStandalone_WITHDOT", (): void => {
    for (const extension of imageFileTypes) {
      const res: boolean = MimeTypeHelper_IsImage(extension);
      console.log(extension);
      expect(res).toBe(true);
    }
  });

  it("ShouldRecognizeExtensionStandalone_WITH_NO_DOT", (): void => {
    for (const extension of imageFileTypes) {
      const withoutDot: string = extension.replace(".", "");
      const res: boolean = MimeTypeHelper_IsImage(withoutDot);
      expect(res).toBe(true);
    }
  });
});

describe("MimeTypeHelper_IsVideo", () => {
  const videoFileTypes: string[] = [".mp4", ".mov", ".avi", ".wmv", ".flv", ".mkv", ".webm", ".mpg", ".mpeg", ".m4v", ".3gp", ".ogv"];
  const commonVideosPaths = videoFileTypes.map((ext) => "./video" + ext);

  it("ShouldRecognizeAsVideoPath", () => {
    for (const video of commonVideosPaths) {
      const res: boolean = MimeTypeHelper_IsVideo(video);
      expect(res).toBe(true);
    }
  });

  it("ShouldRecognizeAsExtensionStandalone_WITHDOT", (): void => {
    for (const extension of videoFileTypes) {
      const res: boolean = MimeTypeHelper_IsVideo(extension);
      expect(res).toBe(true);
    }
  });

  it("ShouldRecognizeExtensionStandalone_WITH_NO_DOT", (): void => {
    for (const extension of videoFileTypes) {
      const withoutDot: string = extension.replace(".", "");
      const res: boolean = MimeTypeHelper_IsVideo(withoutDot);
      expect(res).toBe(true);
    }
  });
});
