import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await requireUser();
  const params = new URL(request.url).searchParams;
  const clientId = params.get("clientId") || undefined;
  const collectionPeriodId = params.get("collectionPeriodId") || undefined;
  const documents = await prisma.uploadedDocument.findMany({
    where: {
      firmId: user.firmId,
      clientCollection: {
        clientId,
        collectionPeriodId
      }
    },
    include: {
      requiredDocument: true,
      clientCollection: { include: { client: true, collectionPeriod: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(documents);
}
