import fs from "node:fs";
import path from "node:path";

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, files);
    } else if (full.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

let count = 0;
for (const file of walk(path.join(process.cwd(), "app"))) {
  let content = fs.readFileSync(file, "utf8");
  const next = content
    .replace(/<div className="overflow-x-auto">\s*\n\s*<table>/g, '<div className="table-wrap">\n          <table className="data-table">')
    .replace(/card overflow-hidden/g, "card min-w-0 overflow-hidden");
  if (next !== content) {
    fs.writeFileSync(file, next);
    count += 1;
  }
}

console.log(`Updated ${count} file(s) with data-table classes.`);
