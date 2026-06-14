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

const files = walk(__dirname);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    // We want to reduce all `../../../` to `../../` and `../../` to `../` ONLY for paths that cross the boundary where `core` was removed.
    // Actually, since `core` was completely flattened, ANY relative path that goes up from `bot` or `whats_socket` and targets outside of them needs to be shortened by one `../`.
    // The easiest way is: any relative path that goes up at least one `../` and targets a sibling folder like `helpers`, `libs`, `types`, `bot`, `whats_socket`.
    // Wait! If `bot/internals/ChatContext.ts` wants to reach `helpers`, it used to be `../../../helpers`. Now it's `../../helpers`.
    // If `whats_socket/WhatsSocket.ts` wants to reach `helpers`, it used to be `../../helpers`. Now it's `../helpers`.
    // Let's just do:
    content = content.replace(/from "(\.\.\/)+([^/"]+)([^"]*)"/g, (match, p1, p2, p3) => {
        // p2 is the target folder name
        const roots = ["helpers", "libs", "types", "bot", "whats_socket"];
        if (roots.includes(p2)) {
            // We need to remove one "../" from p1
            const count = p1.length / 3;
            if (count > 0) {
                const newP1 = "../".repeat(count - 1);
                return `from "${newP1 === "" ? "./" : newP1}${p2}${p3}"`;
            }
        }
        return match;
    });

    fs.writeFileSync(file, content, 'utf8');
});

console.log("Done patching imports");
