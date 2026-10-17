import assert from "node:assert/strict";
import { readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const reportPath = "artifacts/bundle-size.json";
const forbidden = new Set([
  "node_modules",
  ".vite",
  ".cache",
  ".npm",
  ".pnpm-store",
]);
const files = [];
async function walk(directory = ".") {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (directory === "." && [".git", ".github", ".imd"].includes(entry.name))
      continue;
    if (path === "test/scratch" || path === reportPath) continue;
    if (entry.name.startsWith(".env")) continue;
    assert.ok(
      !forbidden.has(entry.name),
      `Generated dependency/cache path: ${path}`,
    );
    assert.ok(
      !entry.isSymbolicLink(),
      `Submission contains a symlink: ${path}`,
    );
    if (entry.isDirectory()) await walk(path);
    else {
      assert.ok(
        !/\.(tgz|zip|tar|tsbuildinfo)$/.test(path),
        `Unnecessary packaging artifact: ${path}`,
      );
      assert.notEqual(
        entry.name,
        ".gitmodules",
        "No submodule configuration may be delivered",
      );
      files.push({ path, bytes: (await stat(path)).size });
    }
  }
}
await walk();
const groups = {};
for (const file of files) {
  const group = file.path.includes("/")
    ? file.path.split("/")[0] + "/"
    : "root files";
  groups[group] = (groups[group] || 0) + file.bytes;
}
const otherBytes = files.reduce((sum, file) => sum + file.bytes, 0);
const report = {
  measurement:
    "Uncompressed submitted files, including this report; excludes VCS metadata, supplied .imd inputs, and deleted test/scratch",
  limitBytes: 8_388_608,
  totalBytes: otherBytes,
  fileCount: files.length + 1,
  groups,
  noDependencyDirectories: true,
  noArchivesOrSymlinks: true,
  ignoreFileBudgetBytes: 256,
  actualIgnoreFileBytes: (await stat(".gitignore")).size,
};
const originalArtifacts = groups["artifacts/"] || 0;
let json;
for (let i = 0; i < 8; i++) {
  json = JSON.stringify(report, null, 2) + "\n";
  report.totalBytes = otherBytes + Buffer.byteLength(json);
  report.groups["artifacts/"] = originalArtifacts + Buffer.byteLength(json);
}
json = JSON.stringify(report, null, 2) + "\n";
assert.equal(report.totalBytes, otherBytes + Buffer.byteLength(json));
assert.ok(report.totalBytes < report.limitBytes, "Submission exceeds 8 MiB");
assert.ok(report.actualIgnoreFileBytes <= report.ignoreFileBudgetBytes);
await writeFile(reportPath, json);
console.log(
  `PASS: ${report.fileCount} files, ${report.totalBytes.toLocaleString("en-US")} bytes uncompressed / ${report.limitBytes.toLocaleString("en-US")} byte budget.`,
);
