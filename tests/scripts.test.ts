import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// This intentionally never runs the scripts for real — backup.sh/restore.sh
// touch a real database and real files, which has no place in a unit test.
// It only confirms they still parse as valid shell (`bash -n`), so a typo
// that would break them at 3am doesn't silently ship. Skips gracefully on a
// platform without bash rather than failing CI for an unrelated reason.
async function bashAvailable() {
  try {
    await execFileAsync("bash", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

for (const script of ["scripts/backup.sh", "scripts/restore.sh"]) {
  test(`${script} is syntactically valid shell`, async (t) => {
    if (!(await bashAvailable())) {
      t.skip("bash not available on this platform");
      return;
    }
    const scriptPath = path.join(process.cwd(), script);
    assert.equal(existsSync(scriptPath), true, `${script} should exist`);
    await assert.doesNotReject(execFileAsync("bash", ["-n", scriptPath]));
  });
}
