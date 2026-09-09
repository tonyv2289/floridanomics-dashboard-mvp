import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { assertPublicDataset, assertPublicText } from "./lib/public-data";

const root = path.resolve(process.argv[2] ?? "public");
let checked = 0;
async function scan(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink() || (await lstat(file)).isSymbolicLink()) throw new Error("Public symlinks are not allowed.");
    if (/^(?:\.env(?:\..*)?|\.git|\.openai)$|\.(?:pem|key|p12|pfx|map)$/i.test(entry.name)) {
      throw new Error("Private/configuration or source-map file in public output.");
    }
    if (entry.isDirectory()) { await scan(file); continue; }
    const text = await readFile(file, "utf8");
    assertPublicText(text);
    if (entry.name.endsWith(".json")) {
      const data = JSON.parse(text) as Record<string, unknown>;
      if ("competition" in data) assertPublicDataset(data);
    }
    checked++;
  }
}
await scan(root);
console.log(`Public artifact privacy gate passed (${checked} files).`);
