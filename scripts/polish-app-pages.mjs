import fs from "node:fs";
import path from "node:path";

const appRoot = path.join(process.cwd(), "app", "app");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (full.endsWith(".tsx")) files.push(full);
  }
  return files;
}

let count = 0;
for (const file of walk(appRoot)) {
  let content = fs.readFileSync(file, "utf8");
  const next = content
    .replace(/<div className="grid gap-6">/g, '<div className="content-stack">')
    .replace(/className="font-black"/g, 'className="font-extrabold"')
    .replace(/className="text-2xl font-black"/g, 'className="text-2xl font-extrabold tracking-tight"')
    .replace(/className="mb-4 font-black"/g, 'className="mb-4 font-extrabold"')
    .replace(/className="mb-2 font-black"/g, 'className="mb-2 font-extrabold"');
  if (next !== content) {
    fs.writeFileSync(file, next);
    count += 1;
  }
}

console.log(`Updated ${count} app page(s).`);
