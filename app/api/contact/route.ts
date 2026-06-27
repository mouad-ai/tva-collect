import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1),
  firmName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  city: z.string().optional(),
  numberOfClients: z.coerce.number().int().positive().optional().or(z.literal("")),
  numberOfAssistants: z.coerce.number().int().nonnegative().optional().or(z.literal("")),
  currentWorkflow: z.string().optional(),
  painLevel: z.string().optional(),
  leadSource: z.string().optional(),
  biggestProblem: z.string().optional(),
  preferredDemoDate: z.string().optional(),
  preferredDemoTime: z.string().optional(),
  redirectTo: z.string().optional(),
  message: z.string().optional()
});

export async function POST(request: Request) {
  const form = await request.formData();
  const body = schema.safeParse(Object.fromEntries(form));
  const redirectTo = body.success && body.data.redirectTo === "/demo" ? "/demo" : "/contact";
  if (!body.success) {
    return NextResponse.redirect(new URL(`${redirectTo}?error=1`, request.url));
  }
  await prisma.lead.create({
    data: {
      name: body.data.name,
      firmName: body.data.firmName,
      phone: body.data.phone,
      email: body.data.email,
      city: body.data.city || null,
      numberOfClients: body.data.numberOfClients === "" ? null : Number(body.data.numberOfClients),
      numberOfAssistants: body.data.numberOfAssistants === "" ? null : Number(body.data.numberOfAssistants),
      currentWorkflow: body.data.currentWorkflow || null,
      painLevel: body.data.painLevel || null,
      leadSource: body.data.leadSource || "SITE",
      stage: body.data.preferredDemoDate ? "DEMO_SCHEDULED" : "NEW",
      biggestProblem: body.data.biggestProblem || null,
      preferredDemoAt:
        body.data.preferredDemoDate
          ? new Date(`${body.data.preferredDemoDate}T${body.data.preferredDemoTime || "09:00"}:00`)
          : null,
      message: body.data.message || null
    }
  });
  return NextResponse.redirect(new URL(`${redirectTo}?sent=1`, request.url));
}
