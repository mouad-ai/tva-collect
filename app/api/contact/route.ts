import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1),
  firmName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  numberOfClients: z.coerce.number().int().positive().optional().or(z.literal("")),
  message: z.string().optional()
});

export async function POST(request: Request) {
  const form = await request.formData();
  const body = schema.safeParse(Object.fromEntries(form));
  if (!body.success) {
    return NextResponse.redirect(new URL("/contact?error=1", request.url));
  }
  await prisma.lead.create({
    data: {
      name: body.data.name,
      firmName: body.data.firmName,
      phone: body.data.phone,
      email: body.data.email,
      numberOfClients: body.data.numberOfClients === "" ? null : Number(body.data.numberOfClients),
      message: body.data.message || null
    }
  });
  return NextResponse.redirect(new URL("/contact?sent=1", request.url));
}
