/* eslint-disable no-undef */
import fs from "node:fs";

if (fs.existsSync("./build")) {
  console.log("Found build folder, cleaning...");
  fs.rmSync("./build", { recursive: true });
  console.log("Build folder cleared and deleted.. Transpiling now");
}
