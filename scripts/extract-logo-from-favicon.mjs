import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const pub = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const svg = fs.readFileSync(path.join(pub, "favicon.svg"), "utf8");
const match = svg.match(/data:image\/png;base64,([^"]+)/);
if (!match) throw new Error("PNG introuvable dans favicon.svg");
const out = path.join(pub, "nanotech-logo.png");
fs.writeFileSync(out, Buffer.from(match[1], "base64"));
console.log("Wrote", out, fs.statSync(out).size, "bytes");
