import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMutableFirmUser } from "@/lib/auth";
import { isSameOriginRequest, rejectCrossOrigin } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";

const rowSchema = z.object({
  companyName: z.string().trim().min(1),
  contactName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  ice: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  city: z.string().optional().nullable()
});

const schema = z.object({
  rows: z.array(rowSchema).min(1).max(500)
});

function clean(value?: string | null) {
  return value && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return rejectCrossOrigin();
  const user = await requireMutableFirmUser();
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ created: 0, updated: 0, skipped: 0, errors: ["Fichier invalide."] }, { status: 400 });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [index, row] of body.data.rows.entries()) {
    const companyName = row.companyName.trim();
    const ice = clean(row.ice);
    try {
      const existing = await prisma.client.findFirst({
        where: {
          firmId: user.firmId,
          OR: [
            ...(ice ? [{ ice }] : []),
            { companyName: { equals: companyName, mode: "insensitive" } }
          ]
        }
      });

      const data = {
        companyName,
        contactName: clean(row.contactName),
        phone: clean(row.phone),
        email: clean(row.email),
        ice,
        taxId: clean(row.taxId),
        city: clean(row.city)
      };

      if (existing) {
        await prisma.client.update({ where: { id: existing.id }, data });
        updated += 1;
      } else {
        await prisma.client.create({ data: { ...data, firmId: user.firmId } });
        created += 1;
      }
    } catch {
      skipped += 1;
      errors.push(`Ligne ${index + 2}: impossible a importer.`);
    }
  }

  return NextResponse.json({ created, updated, skipped, errors });
}

