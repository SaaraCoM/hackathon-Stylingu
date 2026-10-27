// vercel/api/worker/index.js
//
// Worker bundle shipped with the Vercel Function. It re-exposes the existing backend so the
// whole app (auth, sessions, rate limiting, REST routes) runs unchanged on Vercel.
//
// The real source lives in backend/src/index.js; this bundle imports it and re-exports one of
// the shapes the parent entrypoint (api/index.js) understands:
//   - function (req, res)
//   - object { fetch(request) }  (Hono / SmartRouter)
//   - object { handler(req, res) } or { handle(req, res) }
//
// backend/src/index.js is an Express app with top-level await. Vercel's nodejs@22 runtime
// supports top-level await inside ESM imports, so the worker just dynamic-imports that module
// and adapts its app to Vercel's Request/Response model.

import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Project root is three levels above vercel/api/worker.
const projectRoot = path.resolve(__dirname, "..", "..", "..");
const backendFile = path.resolve(projectRoot, "backend", "src", "index.js");

if (!fs.existsSync(backendFile)) {
  throw new Error(
    "worker/index.js requires backend/src/index.js at " + backendFile +
    ". Restore the backend bundle before deploying."
  );
}

// Resolve the backend module once, lazily. Vercel Functions run the real ESM backend
// (with top-level await) per invocation; dynamic import() is the correct Vercel entry path.
let backendModule = null;

const loadBackend = async () => {
  if (backendModule !== null) return backendModule;
  try {
    backendModule = await import(backendFile);
  } catch (err) {
    throw new Error(
      "worker/index.js failed to import backend/src/index.js: " + (err && err.message)
    );
  }
  if (!backendModule) {
    throw new Error("worker/index.js: backend/src/index.js import returned no module.");
  }
  return backendModule;
};

// Send a fetch-style reply back through a (req, res) response object.
const replyBody = (res, reply) => {
  if (res && typeof res.status === "function") res.status((reply && reply.status) || 200);
  if (res && res.headers && typeof res.headers.set === "function" && reply && reply.headers) {
    Object.keys(reply.headers).forEach((key) => {
      const values = reply.headers[key];
      const list = Array.isArray(values) ? values : [values];
      list.forEach((v) => res.headers.set(key, v));
    });
  }
  const body = reply && reply.body;
  if (body === undefined || body === null) return;
  if (typeof body === "string") return res.send(body);
  if (Buffer.isBuffer(body)) return res.send(body);
  if (body instanceof ReadableStream || (body && typeof body.pipe === "function"))
    return body.pipe(res);
  return res.json(body);
};

// Fetch-based entry point (used by api/index.js when it invokes the worker as fetch).
export const fetch = async (request) => {
  const mod = await loadBackend();
  const backend = mod.default || mod;
  if (typeof backend === "function") {
    return handleFunctionBackend(backend, request);
  }
  if (backend && typeof backend.fetch === "function") {
    return backend.fetch(request);
  }
  if (backend && typeof backend.handle === "function") {
    return handleHandleBackend(backend, request);
  }
  if (backend && typeof backend.listen === "function" && typeof backend.use === "function") {
    return handleExpressBackend(backend, request);
  }
  throw new Error(
    "backend/src/index.js did not export a fetch-based app. " +
    "Expected a function, { fetch(request) }, { handler(req,res) }, { handle(req,res) }, or an express app."
  );
};

const handleFunctionBackend = async (fn, request) => {
  const req = buildReq(request);
  const res = buildRes();
  await fn(req, res);
  return new Response(res.body, { status: res.status, headers: res.headersArray() });
};

const handleHandleBackend = async (backend, request) => {
  const req = buildReq(request);
  const res = buildRes();
  let ended = false;
  const finish = () => {
    ended = true;
    if (res._finishCb) res._finishCb();
  };
  res.writable.on = (ev, cb) => {
    if (ev === "finish") res._finishCb = cb;
    if (ev === "error") res._errorCb = cb;
  };
  res.writable.end = (chunk) => {
    if (chunk !== undefined && typeof chunk === "string") res.body += chunk;
    finish();
  };
  try {
    backend.handle(req, res);
  } catch (err) {
    throw err;
  }
  await new Promise((resolve, reject) => {
    if (ended) resolve();
    else res.writable.on("finish", resolve);
    res.writable.on("error", reject);
  });
  return new Response(res.body, { status: res.status, headers: res.headersArray() });
};

const handleExpressBackend = async (app, request) => {
  const req = buildReq(request);
  const res = buildRes();
  await new Promise((resolve, reject) => {
    try {
      app(req, res);
    } catch (err) {
      reject(err);
      return;
    }
    res.writable.on("finish", resolve);
    res.writable.on("error", reject);
  });
  return new Response(res.body, { status: res.status, headers: res.headersArray() });
};

// (req, res) handler wrapper around the backend's (req,res) export.
export const handler = async (req, res) => {
  const mod = await loadBackend();
  const backend = mod.default || mod;
  const fn =
    typeof backend === "function"
      ? backend
      : backend && typeof backend.handler === "function"
      ? backend.handler
      : backend && typeof backend.handle === "function"
      ? backend.handle
      : null;
  if (!fn) {
    return replyBody(res, { status: 500, headers: {}, body: JSON.stringify({ ok: false, error: "backend export not callable as (req,res)" }) });
  }
  try {
    await fn(req, res);
    return replyBody(res, res.toReply ? res.toReply() : {});
  } catch (err) {
    console.error("worker handler error:", err && err.stack || err);
    if (res && typeof res.status === "function") res.status(500);
    if (res && typeof res.json === "function") return res.json({ ok: false, error: (err && err.message) || "backend error" });
    if (res && typeof res.send === "function") return res.send(JSON.stringify({ ok: false, error: (err && err.message) || "backend error" }));
  }
};

// Alias for handle(req, res).
export const handle = handler;

// Default export: the most versatile shape for api/index.js.
export default { fetch, handler, handle };

// ---- internal adapters ----

// Minimal Request-like object for Express.
const buildReq = (request) => {
  const url = new URL(request.url);
  const headers = {};
  request.headers.forEach((v, k) => { headers[k] = v; });
  return {
    method: request.method,
    url: request.url,
    originalUrl: request.url,
    baseUrl: url.pathname,
    path: url.pathname + url.search,
    query: Object.fromEntries(url.searchParams),
    params: {},
    headers,
    get(name) { return headers[name] || headers[name.toLowerCase()] || ""; },
    header(name) { return this.get(name); },
    body: null,
    raw: request,
  };
};

// Minimal Response-like builder for Express.
const buildRes = () => {
  const headers = new Headers();
  let status = 200;
  let ended = false;
  const bodyParts = [];
  const writable = {
    write() {},
    end(chunk) {
      if (chunk !== undefined) {
        if (typeof chunk === "string") bodyParts.push(chunk);
        else if (Buffer.isBuffer(chunk)) bodyParts.push(chunk.toString());
        else if (chunk instanceof ReadableStream || (chunk && typeof chunk.pipe === "function")) {
          bodyParts.push(chunk);
        }
      }
      ended = true;
      if (writable._finishCb) writable._finishCb();
    },
    on(ev, cb) {
      if (ev === "finish") writable._finishCb = cb;
      if (ev === "error") writable._errorCb = cb;
    },
    once(ev, cb) { writable.on(ev, cb); },
  };
  const res = {
    status(code) { status = code; return res; },
    set(field, value) {
      if (Array.isArray(value)) value.forEach((v) => headers.append(field, v));
      else headers.set(field, value);
      return res;
    },
    get(field) { return headers.get(field); },
    headers,
    body: "",
    send(body) {
      if (ended) return res;
      if (typeof body === "string") bodyParts.push(body);
      else if (Buffer.isBuffer(body)) bodyParts.push(body.toString());
      else if (body instanceof ReadableStream || (body && typeof body.pipe === "function")) {
        bodyParts.push(body);
      } else bodyParts.push(String(body));
      ended = true;
      if (writable._finishCb) writable._finishCb();
      return res;
    },
    json(obj) {
      const body = JSON.stringify(obj);
      res.set("Content-Type", "application/json");
      res.send(body);
      return res;
    },
    writable,
    toReply() {
      let body = "";
      for (const part of bodyParts) {
        if (part instanceof ReadableStream || (part && typeof part.pipe === "function")) continue;
        body += part;
      }
      const outHeaders = {};
      headers.forEach((v, k) => { outHeaders[k] = v; });
      return { status, headers: outHeaders, body };
    },
    headersArray() {
      const out = {};
      headers.forEach((v, k) => { out[k] = v; });
      return out;
    },
  };
  return res;
};
