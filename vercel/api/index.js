"use strict";
// Vercel Function entrypoint (api/index.js).
//
// Dynamically imports the worker bundle at runtime and exposes (req, res) as the handler
// Vercel invokes per request. The real app logic stays in vercel/api/worker/index.js.
//
// Accepted worker export shapes:
//   - function (req, res)
//   - object { fetch(request) }  (Hono / SmartRouter)
//   - object { handler(req, res) } or { handle(req, res) }

const path = require("path");
const fs = require("fs");

const workerFile = path.resolve(__dirname, "worker", "index.js");

if (!fs.existsSync(workerFile)) {
  throw new Error(
    "api/index.js requires vercel/api/worker/index.js at " + workerFile +
    ". Restore the worker bundle before deploying."
  );
}

let handlerFn = null;
let handlerLoadError = null;

async function loadHandler() {
  if (handlerFn) return handlerFn;
  if (handlerLoadError) throw handlerLoadError;
  try {
    const mod = await import(workerFile);
    const exported = mod && mod.default ? mod.default : mod;
    let fn;
    if (typeof exported === "function") {
      fn = exported;
    } else if (exported && typeof exported.fetch === "function") {
      fn = async (req, res) => {
        const reply = await exported.fetch(req);
        if (res && typeof res.status === "function") res.status(reply.status || 200);
        if (res && res.headers && typeof res.headers.set === "function" && reply.headers) {
          Object.keys(reply.headers).forEach((key) => {
            const values = reply.headers[key];
            const list = Array.isArray(values) ? values : [values];
            list.forEach((v) => res.headers.set(key, v));
          });
        }
        const body = reply.body;
        if (body === undefined || body === null) return;
        if (typeof body === "string") return res.send(body);
        if (Buffer.isBuffer(body)) return res.send(body);
        if (body instanceof ReadableStream || (body && typeof body.pipe === "function"))
          return body.pipe(res);
        return res.json(body);
      };
    } else if (exported && typeof exported.handler === "function") {
      fn = exported.handler;
    } else if (exported && typeof exported.handle === "function") {
      fn = exported.handle;
    } else {
      throw new Error(
        "worker/index.js must export a function, { fetch(request) }, { handler(req,res) }, or { handle(req,res) }."
      );
    }
    handlerFn = fn;
    return fn;
  } catch (err) {
    handlerLoadError = err;
    throw new Error("api/index.js failed to load worker/index.js: " + (err && err.message));
  }
}

// Vercel invokes this function per request.
async function handler(req, res) {
  const fn = await loadHandler();
  return fn(req, res);
}

module.exports = handler;
exports.handler = handler;
exports.default = handler;
