import { prisma } from "@/lib/prisma";

export async function getRecipientByToken(token: string) {
  return prisma.campaignRecipient.findUnique({
    where: { token },
    include: {
      contact: true,
      campaign: {
        include: {
          location: true,
        },
      },
    },
  });
}
