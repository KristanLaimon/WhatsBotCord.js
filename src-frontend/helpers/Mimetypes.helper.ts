const isPath_regex = /^(?:(?:\/|[a-zA-Z]:\\|\\)(?:[\w-]+[\\/])*[\w-]+(?:\.[\w]+)?|(?:\.\/|\.\.\/)(?:[\w-]+[\\/])*[\w-]+(?:\.[\w]+)?)$/;

export const DEFAULT_MIMETYPE = "application/octet-stream";

const mimeTypes: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp",
  ".mp4": "video/mp4", ".avi": "video/x-msvideo", ".mkv": "video/x-matroska",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg",
  ".pdf": "application/pdf", ".txt": "text/plain", ".json": "application/json",
  "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "gif": "image/gif", "webp": "image/webp",
  "mp4": "video/mp4", "avi": "video/x-msvideo", "mkv": "video/x-matroska",
  "mp3": "audio/mpeg", "wav": "audio/wav", "ogg": "audio/ogg",
  "pdf": "application/pdf", "txt": "text/plain", "json": "application/json"
};

function _extractExtensionFrom_Path_Or_FileExtension(filePathOrExtensionOnly: string): string {
  let ext = filePathOrExtensionOnly;
  if (filePathOrExtensionOnly.match(isPath_regex)) {
    const parts = filePathOrExtensionOnly.split(/[/\\]/);
    const lastPart = parts[parts.length - 1];
    const dotIndex = lastPart.lastIndexOf('.');
    if (dotIndex !== -1 && dotIndex !== 0) {
      ext = lastPart.substring(dotIndex);
    } else {
      ext = "";
    }
  }
  return mimeTypes[ext.toLowerCase()] ?? DEFAULT_MIMETYPE;
}

/**
 * # Is Image
 *
 * Determines whether the given file path or extension refers to an **image**.
 *
 * @param filePathOrExtension - A string with either:
 *  - An extension (can start with a dot or not, e.g. `.jpg`, `png`)
 *  - A path (relative or absolute, e.g. `./pic.png`)
 *
 * @returns `true` if the file is an image type (`image/*`), otherwise `false`.
 *
 * @example
 * ```typescript
 * const isImage = MimeTypeHelper_IsImage("file.png"); // true
 * ```
 */
export function MimeTypeHelper_IsImage(filePathOrExtension: string): boolean {
  if (!filePathOrExtension || filePathOrExtension.trim() === "") return false;
  const res: string = _extractExtensionFrom_Path_Or_FileExtension(filePathOrExtension);
  return res.startsWith("image/");
}

/**
 * # Is Video
 *
 * Determines whether the given file path or extension refers to a **video**.
 *
 * @param filePathOrExtension - A string with either:
 *  - An extension (can start with a dot or not, e.g. `.jpg`, `png`)
 *  - A path (relative or absolute, e.g. `/movies/video.avi`)
 *
 * @returns `true` if the file is a video type (`video/*`), otherwise `false`.
 *
 * @example
 * ```typescript
 * const isVideo = MimeTypeHelper_IsVideo("file.mp4"); // true
 * ```
 */
export function MimeTypeHelper_IsVideo(filePathOrExtension: string): boolean {
  if (!filePathOrExtension || filePathOrExtension.trim() === "") return false;
  const res: string = _extractExtensionFrom_Path_Or_FileExtension(filePathOrExtension);
  return res.startsWith("video/");
}

/**
 * # Is Audio
 *
 * Determines whether the given file path or extension refers to an **audio**.
 *
 * @param filePathOrExtension - A string with either:
 *  - An extension (can start with a dot or not, e.g. `.mp3`, `wav`)
 *  - A path (relative or absolute, e.g. `./audio/song.mp3`)
 *
 * @returns `true` if the file is an audio type (`audio/*`), otherwise `false`.
 *
 * @example
 * ```typescript
 * const isAudio = MimeTypeHelper_IsAudio("file.mp3"); // true
 * ```
 */
export function MimeTypeHelper_IsAudio(filePathOrExtension: string): boolean {
  if (!filePathOrExtension || filePathOrExtension.trim() === "") return false;
  const res: string = _extractExtensionFrom_Path_Or_FileExtension(filePathOrExtension);
  return res.startsWith("audio/");
}

/**
 * # Get Mimetype Of
 *
 * Retrieves the MIME type of a file or buffer with a given extension.
 *
 * Supports two overloads:
 * 1. `MimeTypeHelper_GetMimeTypeOf({ source: string })`
 *    - `source`: The file path
 * 2. `MimeTypeHelper_GetMimeTypeOf({ source: Uint8Array; extensionType: string })`
 *    - `source`: The buffer containing the file data
 *    - `extensionType`: The file extension (e.g. `"pdf"`, `"zip"`) can start with a dot or not, e.g. `.jpg`, `png`
 *
 * Returns the determined MIME type as a string. If the MIME type cannot be
 * determined, it returns `"application/octet-stream"`.
 *
 * @param params Object containing either string source, or source Uint8Array + extension type string.
 * @returns The complete mimetype if found, otherwise, fallbacks to default "application/octet-stream"
 *
 * @note This is already being tested on WhatsSocket.sugarsenders.test.ts!, doesn't need a standaole suite test
 *
 * @example
 * ```typescript
 * const type = MimeTypeHelper_GetMimeTypeOf({ source: "file.png" }); // "image/png"
 * ```
 */
export function MimeTypeHelper_GetMimeTypeOf(params: { source: string } | { source: Uint8Array; extensionType: string }): string {
  //1. First overload
  if (typeof params.source === "string") {
    //Can return false if not found. Bad library API in my opinion tbh
    const toReturn: string = _extractExtensionFrom_Path_Or_FileExtension(params.source);
    return toReturn;
  }

  //2. Second overload
  if ("extensionType" in params) {
    //Can return false if not found. Bad library API in my opinion tbh
    const toReturn: string = _extractExtensionFrom_Path_Or_FileExtension(params.extensionType);
    return toReturn;
  }

  //Default
  return DEFAULT_MIMETYPE;
}
