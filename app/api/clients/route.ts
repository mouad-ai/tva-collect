import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const clientSchema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().nullable(),
  ice: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export async function GET(request: Request) {
  const user = await requireUser();
  const search = new URL(request.url).searchParams.get("search") || "";
  const clients = await prisma.client.findMany({
    where: {
      firmId: user.firmId,
      OR: search
        ? [
            { companyName: { contains: search, mode: "insensitive" } },
            { contactName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } }
          ]
        : undefined
    },
    orderBy: { companyName: "asc" }
  });
  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const user = await requireUser();
  const body = clientSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Client invalide." }, { status: 400 });
  const client = await prisma.client.create({
    data: {
      ...body.data,
      email: body.data.email || null,
      firmId: user.firmId
    }
  });
  return NextResponse.json(client, { status: 201 });
}
