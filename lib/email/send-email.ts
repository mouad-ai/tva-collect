type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type ResendConstructor = new (apiKey: string) => {
  emails: {
    send(input: { from: string; to: string; subject: string; html: string; text?: string }): Promise<{ data?: unknown; error?: unknown }>;
  };
};

async function loadOptionalResend() {
  const runtimeImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<{ Resend?: ResendConstructor }>;
  return runtimeImport("resend").catch(() => null);
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  const provider = process.env.EMAIL_PROVIDER || "console";

  if (provider === "console" && process.env.NODE_ENV === "production") {
    // The console provider prints the full email body to stdout, including
    // raw password-reset and invite links — acceptable for local dev only.
    // A production deploy that forgot to set EMAIL_PROVIDER must fail loudly
    // here rather than silently leak every token into server logs.
    throw new Error(
      "EMAIL_PROVIDER=console (or unset) is not allowed when NODE_ENV=production — it would print password-reset and invite links to server logs. Set EMAIL_PROVIDER=resend or EMAIL_PROVIDER=smtp."
    );
  }

  if (provider === "console") {
    console.log("------ EMAIL DEBUG ------");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("Text:", text);
    console.log("HTML:", html);
    console.log("-------------------------");
    return { id: "console" };
  }

  if (provider !== "resend") {
    throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend");
  }

  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is required when EMAIL_PROVIDER=resend");
  }

  const resendModule = await loadOptionalResend();
  const Resend = resendModule?.Resend;
  if (!Resend) {
    throw new Error("Install the resend package or use EMAIL_PROVIDER=smtp/console.");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    text
  });

  if (error) {
    throw new Error(`Failed to send email: ${JSON.stringify(error)}`);
  }

  return data;
}
