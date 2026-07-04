import net from "node:net";
import tls from "node:tls";
import { sendEmail as sendProviderEmail } from "@/lib/email/send-email";

type EmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for SMTP email.`);
  return value;
}

function smtpAddress(value: string) {
  return value.replace(/[\r\n<>]/g, "").trim();
}

function smtpData(input: EmailInput, from: string) {
  const safeFrom = smtpAddress(from);
  const safeTo = smtpAddress(input.to);
  const subject = input.subject.replace(/[\r\n]/g, " ").trim();
  const body = input.text.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
  return [
    `From: ${safeFrom}`,
    `To: ${safeTo}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    body
  ].join("\r\n");
}

function readSmtpLine(socket: net.Socket | tls.TLSSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      if (!lines.length) return;
      const last = lines[lines.length - 1];
      if (/^\d{3} /.test(last)) {
        cleanup();
        resolve(buffer);
      }
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };
    socket.on("data", onData);
    socket.on("error", onError);
  });
}

async function smtpCommand(socket: net.Socket | tls.TLSSocket, command: string, accepted: number[]) {
  socket.write(`${command}\r\n`);
  const response = await readSmtpLine(socket);
  const code = Number(response.slice(0, 3));
  if (!accepted.includes(code)) throw new Error(`SMTP command failed (${code}): ${response.trim()}`);
  return response;
}

function connectSocket(host: string, port: number, secure: boolean) {
  return new Promise<net.Socket | tls.TLSSocket>((resolve, reject) => {
    const socket = secure ? tls.connect(port, host) : net.connect(port, host);
    socket.once("connect", () => resolve(socket));
    socket.once("secureConnect", () => resolve(socket));
    socket.once("error", reject);
    socket.setTimeout(15000, () => {
      socket.destroy(new Error("SMTP connection timed out."));
    });
  });
}

async function sendSmtpEmail(input: EmailInput) {
  const host = requireEnv("SMTP_HOST");
  const port = Number(process.env.SMTP_PORT || 587);
  const user = requireEnv("SMTP_USER");
  const password = requireEnv("SMTP_PASSWORD");
  const from = process.env.SMTP_FROM || process.env.ADMIN_EMAIL || user;
  let socket = await connectSocket(host, port, port === 465);

  await readSmtpLine(socket);
  const ehlo = await smtpCommand(socket, `EHLO ${process.env.SMTP_HELO_HOST || "tvacollect.local"}`, [250]);
  if (port !== 465 && ehlo.toUpperCase().includes("STARTTLS")) {
    await smtpCommand(socket, "STARTTLS", [220]);
    socket = tls.connect({ socket, servername: host });
    await new Promise<void>((resolve, reject) => {
      socket.once("secureConnect", resolve);
      socket.once("error", reject);
    });
    await smtpCommand(socket, `EHLO ${process.env.SMTP_HELO_HOST || "tvacollect.local"}`, [250]);
  }
  await smtpCommand(socket, "AUTH LOGIN", [334]);
  await smtpCommand(socket, Buffer.from(user).toString("base64"), [334]);
  await smtpCommand(socket, Buffer.from(password).toString("base64"), [235]);
  await smtpCommand(socket, `MAIL FROM:<${smtpAddress(from)}>`, [250]);
  await smtpCommand(socket, `RCPT TO:<${smtpAddress(input.to)}>`, [250, 251]);
  await smtpCommand(socket, "DATA", [354]);
  socket.write(`${smtpData(input, from)}\r\n.\r\n`);
  const dataResponse = await readSmtpLine(socket);
  const dataCode = Number(dataResponse.slice(0, 3));
  if (dataCode !== 250) throw new Error(`SMTP DATA failed (${dataCode}): ${dataResponse.trim()}`);
  await smtpCommand(socket, "QUIT", [221]);
  socket.end();
  return { sent: true, logged: false };
}

export async function sendEmail(input: EmailInput) {
  const provider = process.env.EMAIL_PROVIDER || "console";
  if (provider === "console" || provider === "resend") {
    return sendProviderEmail({
      to: input.to,
      subject: input.subject,
      html: input.html || `<pre>${input.text.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char] || char)}</pre>`,
      text: input.text
    });
  }
  if (!provider) {
    throw new Error("EMAIL_PROVIDER is required in production before sending email.");
  }
  if (provider === "smtp") return sendSmtpEmail(input);
  throw new Error(`EMAIL_PROVIDER=${provider} is not supported.`);
}

export async function sendInviteEmail(input: { to: string; name?: string | null; firmName: string; inviteLink: string }) {
  return sendEmail({
    to: input.to,
    subject: `Invitation TVA Collect - ${input.firmName}`,
    text: `Bonjour ${input.name || ""},\n\nVotre cabinet vous invite sur TVA Collect.\nConfigurez votre mot de passe ici : ${input.inviteLink}\n`
  });
}

export async function sendPasswordResetEmail(input: { to: string; name?: string | null; resetLink: string }) {
  return sendEmail({
    to: input.to,
    subject: "Réinitialisation de votre mot de passe TVA Collect",
    html: `<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
  <h2>Réinitialisation de votre mot de passe TVA Collect</h2>

  <p>Bonjour${input.name ? ` ${input.name}` : ""},</p>

  <p>Nous avons reçu une demande de réinitialisation de votre mot de passe TVA Collect.</p>

  <p>
    <a href="${input.resetLink}"
       style="display:inline-block;padding:12px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;">
      Réinitialiser mon mot de passe
    </a>
  </p>

  <p>Ce lien expire dans 30 minutes.</p>

  <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>

  <p>Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :</p>
  <p>${input.resetLink}</p>
</div>`,
    text: `Bonjour${input.name ? ` ${input.name}` : ""},\n\nNous avons reçu une demande de réinitialisation de votre mot de passe TVA Collect.\n\nRéinitialiser votre mot de passe : ${input.resetLink}\n\nCe lien expire dans 30 minutes.\n\nSi vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.\n`
  });
}
