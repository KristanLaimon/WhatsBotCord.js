// scripts/fix-imports.mjs
import fs from "node:fs";
import path from "node:path";

const buildDir = path.resolve("build");

function fixFile(file) {
  let content = fs.readFileSync(file, "utf8");

  // Regex: match import/export "...";
  // Only add .js if path is relative ("./" or "../") and not already .js/.json/.mjs
  content = content.replace(/(from\s+["'])(\.{1,2}\/[^"']+)(["'])/g, (match, start, importPath, end) => {
    if (importPath.endsWith(".js") || importPath.endsWith(".json") || importPath.endsWith(".mjs")) {
      return match; // already fine
    }
    return `${start}${importPath}.js${end}`;
  });

  fs.writeFileSync(file, content, "utf8");
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      fixFile(fullPath);
    }
  }
}

walk(buildDir);
// eslint-disable-next-line no-undef
console.log("✅ Fixed imports in build/");
