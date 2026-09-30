// The Suno API requires a callBackUrl on every task. The app polls for results,
// so this endpoint simply acknowledges the webhook.
export default async () =>
  new Response(JSON.stringify({ code: 200, msg: "received" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

export const config = { path: "/api/callback" };
