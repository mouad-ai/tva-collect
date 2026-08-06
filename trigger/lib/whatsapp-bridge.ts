// Trigger.dev tasks run on Trigger.dev's own cloud infrastructure, not on
// the VPS — so this calls the bridge over the internet (its own subdomain,
// see deploy/nginx/tvacollect.conf), authenticated with a shared secret.
// The bridge itself is the only thing that holds the actual WhatsApp
// connection; see whatsapp-bridge/src/index.ts for why.

function bridgeUrl() {
  const url = process.env.WHATSAPP_BRIDGE_URL;
  if (!url) throw new Error("WHATSAPP_BRIDGE_URL is not configured.");
  return url.replace(/\/+$/, "");
}

function bridgeToken() {
  const token = process.env.WHATSAPP_BRIDGE_TOKEN;
  if (!token) throw new Error("WHATSAPP_BRIDGE_TOKEN is not configured.");
  return token;
}

export async function sendWhatsAppMessage(to: string, message: string) {
  const response = await fetch(`${bridgeUrl()}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Bridge-Token": bridgeToken() },
    body: JSON.stringify({ to, message })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`WhatsApp bridge /send failed (${response.status}): ${detail}`);
  }
  return response.json() as Promise<{ status: string; messageId?: string | null }>;
}
