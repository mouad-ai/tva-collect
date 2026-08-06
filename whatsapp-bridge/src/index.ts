import express from "express";
import pino from "pino";
import QRCode from "qrcode";
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  type WASocket
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";

// This service is the ONLY place that holds the actual WhatsApp connection.
// It exists because Baileys needs a persistent, always-on socket (like
// keeping WhatsApp Web open in a browser tab, 24/7) — Trigger.dev tasks run
// and finish, they can't hold a socket open between runs. So Trigger.dev
// (and the main Next.js app) never talk to WhatsApp directly: they call this
// service's small HTTP API instead.
//
// This uses the UNOFFICIAL WhatsApp Web protocol (Baileys), not Meta's
// approved Business API. That's a deliberate, informed choice (free, no BSP
// fees) but it carries real risk: WhatsApp can detect and ban automated
// clients. Mitigations built into this file: outbound sends are paced with
// randomized delays (sendQueue below), and this service NEVER auto-sends a
// first message to a stranger — that decision is enforced one layer up, in
// the app/Trigger.dev, which requires human approval before calling /send
// for a brand-new lead. This file only executes sends it's told to make.

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

const PORT = Number(process.env.PORT || 8088);
const BRIDGE_TOKEN = process.env.WHATSAPP_BRIDGE_TOKEN;
const APP_WEBHOOK_URL = process.env.APP_WEBHOOK_URL; // e.g. https://app.tvacollect.com/api/whatsapp/inbound
const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || "./auth_session";

if (!BRIDGE_TOKEN) {
  logger.error("WHATSAPP_BRIDGE_TOKEN is required — refusing to start with an unauthenticated API.");
  process.exit(1);
}
if (!APP_WEBHOOK_URL) {
  logger.warn("APP_WEBHOOK_URL is not set — inbound messages will be logged but never forwarded to the app.");
}

let sock: WASocket | null = null;
let latestQrDataUrl: string | null = null;
let connectionState: "connecting" | "open" | "closed" = "connecting";

async function startSocket() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger: logger.child({ module: "baileys" }),
    auth: state,
    generateHighQualityLinkPreview: false,
    // Cold-start reconnects (deploys, VPS reboots) shouldn't require rescanning
    // a QR code — the auth state directory (a Docker volume) persists the
    // linked-device session across container restarts.
    syncFullHistory: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      latestQrDataUrl = await QRCode.toDataURL(qr);
      logger.info("New pairing QR code generated — fetch it from GET /qr");
    }

    if (connection === "open") {
      connectionState = "open";
      latestQrDataUrl = null;
      logger.info("WhatsApp connection open.");
    }

    if (connection === "close") {
      connectionState = "closed";
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      logger.warn({ statusCode, loggedOut }, "WhatsApp connection closed.");
      if (!loggedOut) {
        // Any other disconnect reason (network blip, restart signal, etc.) is
        // recoverable — reconnect. A real logout requires re-scanning a QR
        // code via GET /qr, which we don't do automatically for safety.
        startSocket().catch((error) => logger.error({ error }, "Reconnect failed."));
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const jid = msg.key.remoteJid;
      if (!jid || jid.endsWith("@g.us")) continue; // ignore group messages — leads are 1:1 only

      const body =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        "";
      if (!body) continue; // non-text inbound (media, reactions, etc.) — nothing for the AI to act on yet

      const phone = jid.replace(/@s\.whatsapp\.net$/, "");
      logger.info({ phone }, "Inbound WhatsApp message received.");
      await forwardInboundToApp({ phone, body, receivedAt: new Date().toISOString() });
    }
  });
}

async function forwardInboundToApp(payload: { phone: string; body: string; receivedAt: string }) {
  if (!APP_WEBHOOK_URL) return;
  try {
    const response = await fetch(APP_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Bridge-Token": BRIDGE_TOKEN! },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      logger.error({ status: response.status }, "App webhook rejected inbound message forward.");
    }
  } catch (error) {
    logger.error({ error }, "Failed to forward inbound message to app webhook.");
  }
}

// Outbound sends are paced, not fired instantly — a burst of perfectly
// timed, back-to-back messages is one of the more obvious "this is a bot"
// signals. Real human sends have irregular gaps between messages.
const sendQueue: Array<() => Promise<void>> = [];
let sendQueueRunning = false;

function randomDelayMs() {
  return 4000 + Math.floor(Math.random() * 8000); // 4-12s between sends
}

async function runSendQueue() {
  if (sendQueueRunning) return;
  sendQueueRunning = true;
  while (sendQueue.length > 0) {
    const job = sendQueue.shift()!;
    await job();
    if (sendQueue.length > 0) await new Promise((resolve) => setTimeout(resolve, randomDelayMs()));
  }
  sendQueueRunning = false;
}

function enqueueSend(jid: string, text: string): Promise<{ id: string | null | undefined }> {
  return new Promise((resolve, reject) => {
    sendQueue.push(async () => {
      try {
        if (!sock || connectionState !== "open") throw new Error("WhatsApp socket is not connected.");
        const result = await sock.sendMessage(jid, { text });
        resolve({ id: result?.key.id });
      } catch (error) {
        reject(error);
      }
    });
    runSendQueue();
  });
}

// --- HTTP API -----------------------------------------------------------

const app = express();
app.use(express.json());

function requireBridgeToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.header("X-Bridge-Token") || req.query.token;
  if (token !== BRIDGE_TOKEN) {
    res.status(401).json({ error: "Invalid or missing bridge token." });
    return;
  }
  next();
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", connection: connectionState });
});

// Only needed during initial setup (linking the phone) and again if the
// session ever gets logged out. Token-gated since a QR code is effectively
// a login credential for the linked WhatsApp account.
app.get("/qr", requireBridgeToken, (_req, res) => {
  if (connectionState === "open") {
    res.json({ status: "already_connected" });
    return;
  }
  if (!latestQrDataUrl) {
    res.status(202).json({ status: "waiting_for_qr" });
    return;
  }
  res.json({ status: "scan_required", qrDataUrl: latestQrDataUrl });
});

app.post("/send", requireBridgeToken, async (req, res) => {
  const { to, message } = req.body as { to?: string; message?: string };
  if (!to || !message) {
    res.status(400).json({ error: "Both 'to' (phone number, digits only) and 'message' are required." });
    return;
  }
  const digits = to.replace(/[^\d]/g, "");
  if (!digits) {
    res.status(400).json({ error: "'to' must contain a phone number." });
    return;
  }
  const jid = `${digits}@s.whatsapp.net`;
  try {
    const result = await enqueueSend(jid, message);
    res.json({ status: "queued_and_sent", messageId: result.id });
  } catch (error) {
    logger.error({ error, to: digits }, "Failed to send WhatsApp message.");
    res.status(502).json({ error: "Failed to send message.", detail: error instanceof Error ? error.message : String(error) });
  }
});

app.listen(PORT, () => {
  logger.info(`WhatsApp bridge HTTP API listening on :${PORT}`);
});

startSocket().catch((error) => {
  logger.error({ error }, "Failed to start WhatsApp socket.");
  process.exit(1);
});
