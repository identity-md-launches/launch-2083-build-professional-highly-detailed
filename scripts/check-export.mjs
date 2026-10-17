import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, join, relative } from "node:path";

const root = resolve("dist");
const html = await readFile(join(root, "index.html"), "utf8");
for (const item of [
  "<title>SeedClock",
  'name="description"',
  'property="og:title"',
  'property="og:image"',
  'rel="icon"',
])
  assert.ok(html.includes(item), `Missing metadata: ${item}`);
const references = [
  ...html.matchAll(/(?:src|href|content)="(\.\/[^"]+)"/g),
].map((m) => m[1]);
for (const reference of references)
  assert.ok(
    (await stat(resolve(root, reference))).isFile(),
    `Missing export asset ${reference}`,
  );
assert.ok(!/(?:src|href)="\/(?!\/)/.test(html), "Root-relative asset in HTML");
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    assert.ok(
      !["node_modules", ".vite", ".cache"].includes(entry.name),
      `Cache or dependency directory: ${dir}/${entry.name}`,
    );
    if (entry.isDirectory()) files.push(...(await walk(join(dir, entry.name))));
    else files.push(join(dir, entry.name));
  }
  return files;
}
const files = await walk(root);
for (const file of await walk(resolve("public"))) {
  const exported = join(root, relative(resolve("public"), file));
  assert.ok(
    (await readFile(file)).equals(await readFile(exported)),
    `Public asset differs from export: ${file}`,
  );
}
let bytes = 0;
for (const file of files) {
  bytes += (await stat(file)).size;
  assert.ok(
    !/\.(tgz|map)$/.test(file),
    `Unnecessary packaging artifact ${file}`,
  );
  if (file.endsWith(".css")) {
    const css = await readFile(file, "utf8");
    assert.ok(!/url\(["']?\/(?!\/)/.test(css), `Root-relative URL in ${file}`);
  }
}
assert.ok(
  bytes < 8_388_608,
  "Production export exceeds the entire submission budget",
);
assert.equal(
  (await readFile(join(root, "social-card.png")))
    .subarray(0, 8)
    .toString("hex"),
  "89504e470d0a1a0a",
  "Share image is not PNG",
);
console.log(
  `PASS: ${files.length} export files, ${bytes.toLocaleString("en-US")} bytes; metadata, relative assets, PNG share image, and packaging checks.`,
);
