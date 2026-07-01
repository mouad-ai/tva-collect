type EmailInput = {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, string | number | null | undefined>;
};

export async function sendEmail(input: EmailInput) {
  const enabled = process.env.EMAIL_ENABLED === "true";
  const hasProvider = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);

  if (enabled && process.env.NODE_ENV === "production" && !hasProvider) {
    throw new Error("Email provider is enabled but SMTP configuration is missing.");
  }

  if (!enabled || !hasProvider) {
    console.info("[dev-email]", JSON.stringify(input, null, 2));
    return { delivered: false, devLogged: true };
  }

  console.info("[email-provider-placeholder]", JSON.stringify(input, null, 2));
  return { delivered: false, devLogged: false };
}
