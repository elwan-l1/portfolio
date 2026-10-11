import { defineMiddleware } from "nitro";

const COMPRESSIBLE = /^(text\/html|application\/json|image\/svg\+xml)/;

// nitro compresses only prebuilt assets, so server-rendered responses are gzipped here
export default defineMiddleware(async (event, next) => {
  const response = await next();
  if (!(response instanceof Response) || !response.body) return response;
  if (!event.req.headers.get("accept-encoding")?.includes("gzip")) return response;
  if (response.headers.has("content-encoding")) return response;
  if (!COMPRESSIBLE.test(response.headers.get("content-type") ?? "")) return response;

  const headers = new Headers(response.headers);
  headers.set("content-encoding", "gzip");
  headers.delete("content-length");
  headers.append("vary", "accept-encoding");
  return new Response(response.body.pipeThrough(new CompressionStream("gzip")), {
    status: response.status,
    headers,
  });
});
