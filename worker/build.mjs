/* build.mjs — prepara deploy/ para Sites:
 * worker.js (bundle sin dependencias externas ni sourcemaps),
 * public/ (copia del frontend) y manifest.json. */
import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

mkdirSync("../deploy", { recursive: true });

await build({
  entryPoints: ["src/index.js"],
  bundle: true,
  format: "esm",
  platform: "node", // node builtins (node:net/tls/crypto) quedan externos: los da workerd
  minify: true,
  legalComments: "none",
  outfile: "../deploy/worker.js"
});

rmSync("../deploy/public", { recursive: true, force: true });
cpSync("../frontend/public", "../deploy/public", { recursive: true });

writeFileSync(
  "../deploy/manifest.json",
  JSON.stringify(
    {
      entrypoint: "index.js",
      compatibilityDate: "2026-10-27",
      modules: [{ name: "index.js", type: "esm", path: "./worker.js" }],
      assetsDirectory: "./public"
    },
    null,
    2
  ) + "\n"
);

console.log("deploy/ listo: worker.js + public/ + manifest.json");
