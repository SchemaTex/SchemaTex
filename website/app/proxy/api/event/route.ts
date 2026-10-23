export async function POST(request: Request) {
  const headers = new Headers();
  for (const name of ["content-type", "user-agent"]) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }

  // Cloudflare sets the visitor IP; x-real-ip can identify its edge instead.
  const ip = request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim();
  if (ip) {
    headers.set("X-Plausible-IP", ip);
    headers.set("X-Forwarded-For", ip);
  }

  const response = await fetch(
    "https://plausible-analytics-ce-production-205c.up.railway.app/api/event",
    { method: "POST", headers, body: await request.arrayBuffer() },
  );

  return new Response(response.body, { status: response.status });
}
