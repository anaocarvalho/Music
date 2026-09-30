// Thin pass-through proxy so the browser can call the Suno API without CORS issues.
// The user's API key is sent by the browser in the Authorization header and is
// forwarded as-is. Nothing is stored or logged here.

const UPSTREAMS = {
  suno: { base: "https://api.sunoapi.org/", allow: /^api\/v1\/[a-z0-9\-/]+$/i },
  upload: { base: "https://sunoapiorg.redpandaai.co/", allow: /^api\/file-(base64|stream|url)-upload$/i },
};

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const url = new URL(req.url);
  const match = url.pathname.match(/^\/api\/(suno|upload)\/(.+)$/);
  if (!match) return json({ code: 404, msg: "Unknown route" }, 404);

  const [, kind, rest] = match;
  const upstream = UPSTREAMS[kind];
  if (!upstream.allow.test(rest)) return json({ code: 404, msg: "Route not allowed" }, 404);

  const auth = req.headers.get("authorization");
  if (!auth) return json({ code: 401, msg: "Missing API key" }, 401);

  const headers = { authorization: auth };
  const ct = req.headers.get("content-type");
  if (ct) headers["content-type"] = ct;

  try {
    const res = await fetch(upstream.base + rest + url.search, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
    });
    const body = await res.arrayBuffer();
    return new Response(body, {
      status: res.status,
      headers: { ...cors, "content-type": res.headers.get("content-type") || "application/json" },
    });
  } catch (err) {
    return json({ code: 502, msg: "Upstream request failed: " + (err?.message || err) }, 502);
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json" } });
}

export const config = { path: ["/api/suno/*", "/api/upload/*"] };
