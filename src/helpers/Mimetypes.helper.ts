import mime from "mime";
import path from "node:path";

/**
 * Regex to check if a string is a **file extension only**.
 *
 * Examples that match:
 * - ".txt"
 * - ".png"
 *
 * Examples that do NOT match:
 * - "png"        (missing leading ".")
 * - "file.png"   (this is a path, not an extension)
 */
// const isExtension_regex = /^\.[a-zA-Z0-9]{1,}$/;

/**
 * Regex to check if a string is a valid **path** (relative or absolute).
 *
 * Examples that match:
 * - "./relative/path/to/file.png"
 * - "../up/one/dir/file.txt"
 * - "/absolute/path/to/file.jpeg"
 * - "C:\\Windows\\path\\file.gif"
 */
const isPath_regex = /^(?:(?:\/|[a-zA-Z]:\\|\\)(?:[\w-]+[\\/])*[\w-]+(?:\.[\w]+)?|(?:\.\/|\.\.\/)(?:[\w-]+[\\/])*[\w-]+(?:\.[\w]+)?)$/;

export const DEFAULT_MIMETYPE = "application/octet-stream";

/**
 * Extracts and resolves the **MIME type** from either:
 *  - A file extension (can begin with a dot or not, e.g. `.txt`, `png`)
 *  - A file path (relative or absolute, e.g. `./image.jpg`, `/usr/local/file.pdf`)
 *
 * @param filePathOrExtensionOnly - String containing a file extension or a file path.
 * @returns The resolved MIME type (e.g. `"image/png"`, `"video/mp4"`).
 *          Returns `"application/octet-stream"` if no match is found, or if givenValue is not either .<filetype> or a path
 */
function _extractExtensionFrom_Path_Or_FileExtension(filePathOrExtensionOnly: string): string {
  //Is path (./relative/path/to/file.png or /absolute/path/to/file.jpeg)
  if (filePathOrExtensionOnly.match(isPath_regex)) {
    const res: string | null = mime.getType(path.extname(filePathOrExtensionOnly));
    return res ?? DEFAULT_MIMETYPE;
  } else {
    //Is extension only (".txt", ".png") or any other else
    const res: string | null = mime.getType(filePathOrExtensionOnly);
    return res ?? DEFAULT_MIMETYPE;
  }
}

/**
 * Determines whether the given file path or extension refers to an **image**.
 *
 * @param filePathOrExtension - A string with either:
 *  - An extension (can start with a dot or not, e.g. `.jpg`, `png`)
 *  - A path (relative or absolute, e.g. `./pic.png`)
 *
 * @returns `true` if the file is an image type (`image/*`), otherwise `false`.
 */
export function MimeTypeHelper_IsImage(filePathOrExtension: string): boolean {
  if (!filePathOrExtension || filePathOrExtension.trim() === "") return false;
  const res: string = _extractExtensionFrom_Path_Or_FileExtension(filePathOrExtension);
  return res.startsWith("image/");
}

/**
 * Determines whether the given file path or extension refers to a **video**.
 *
 * @param filePathOrExtension - A string with either:
 *  - An extension (can start with a dot or not, e.g. `.jpg`, `png`)
 *  - A path (relative or absolute, e.g. `/movies/video.avi`)
 *
 * @returns `true` if the file is a video type (`video/*`), otherwise `false`.
 */
export function MimeTypeHelper_IsVideo(filePathOrExtension: string): boolean {
  if (!filePathOrExtension || filePathOrExtension.trim() === "") return false;
  const res: string = _extractExtensionFrom_Path_Or_FileExtension(filePathOrExtension);
  return res.startsWith("video/");
}

/**
 * Determines whether the given file path or extension refers to an **audio**.
 *
 * @param filePathOrExtension - A string with either:
 *  - An extension (can start with a dot or not, e.g. `.mp3`, `wav`)
 *  - A path (relative or absolute, e.g. `./audio/song.mp3`)
 *
 * @returns `true` if the file is an audio type (`audio/*`), otherwise `false`.
 */
export function MimeTypeHelper_IsAudio(filePathOrExtension: string): boolean {
  if (!filePathOrExtension || filePathOrExtension.trim() === "") return false;
  const res: string = _extractExtensionFrom_Path_Or_FileExtension(filePathOrExtension);
  return res.startsWith("audio/");
}

/**
 * Retrieves the MIME type of a file or buffer with a given extension.
 *
 * Supports two overloads:
 * 1. `MimeTypeHelper_GetMimeTypeOf({ source: string })`
 *    - `source`: The file path
 * 2. `MimeTypeHelper_GetMimeTypeOf({ source: Buffer; extensionType: string })`
 *    - `source`: The buffer containing the file data
 *    - `extensionType`: The file extension (e.g. `"pdf"`, `"zip"`) can start with a dot or not, e.g. `.jpg`, `png`
 *
 * Returns the determined MIME type as a string. If the MIME type cannot be
 * determined, it returns `"application/octet-stream"`.
 * @param params
 * @returns The complete mimetype if found, otherwise, fallbacks to default "application/octet-stream"
 *
 * @note This is already being tested on WhatsSocket.sugarsenders.test.ts!, doesn't need a standaole suite test
 */
export function MimeTypeHelper_GetMimeTypeOf(params: { source: string } | { source: Buffer; extensionType: string }): string {
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
