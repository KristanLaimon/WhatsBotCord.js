const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const frontendRoot = __dirname;
const files = walk(frontendRoot);

const roots = ["helpers", "libs", "types", "bot", "whats_socket", "mocks"];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Calculate how many directories deep the file is from `dist-frontend`
    const relativePath = path.relative(frontendRoot, file);
    // e.g. "bot\bot.ts" -> split by '\' -> ["bot", "bot.ts"]. depth is 1
    // e.g. "bot\internals\ChatContext.ts" -> ["bot", "internals", "ChatContext.ts"]. depth is 2
    const depth = relativePath.split(path.sep).length - 1;
    
    // The correct prefix to go up to `dist-frontend` is "../".repeat(depth)
    // Wait, if depth=1 (bot.ts), it needs "../" to reach dist-frontend.
    // If depth=2 (bot/internals/ChatContext.ts), it needs "../../".
    
    content = content.replace(/from "(\.\.\/|\.\/)+([^/"]+)([^"]*)"/g, (match, prefix, folder, rest) => {
        if (roots.includes(folder)) {
            let correctPrefix = "../".repeat(depth);
            if (correctPrefix === "") correctPrefix = "./";
            return `from "${correctPrefix}${folder}${rest}"`;
        }
        return match;
    });

    fs.writeFileSync(file, content, 'utf8');
});

console.log("Fixed all imports to match dist-frontend depth correctly");
