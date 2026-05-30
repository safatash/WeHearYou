import { prisma } from "@/lib/prisma";
import { getValidGoogleAccessToken } from "@/lib/google-oauth";
import { listGbpQuestions } from "@/lib/gbp-api";
import { isEmailSendingConfigured, sendTeamNotificationEmail } from "@/lib/email";

export async function runGbpSync(): Promise<{ locationsProcessed: number; questionsUpserted: number; newUnanswered: number }> {
  let locationsProcessed = 0;
  let questionsUpserted = 0;
  let newUnanswered = 0;

  const locations = await prisma.location.findMany({
    where: { googleConnectionId: { not: null }, googleLocationName: { not: null } },
    include: {
      googleConnection: {
        select: { id: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true, tokenType: true },
      },
      organization: { select: { name: true, users: { include: { user: { select: { email: true } } } } } },
    },
  });

  for (const location of locations) {
    if (!location.googleConnection || !location.googleLocationName) continue;

    const syncedAt = new Date();

    try {
      const accessToken = await getValidGoogleAccessToken(location.googleConnection);
      const questions = await listGbpQuestions(accessToken, location.googleLocationName);

      for (const q of questions) {
        const existingAnswer = q.topAnswers?.[0];
        const existing = await prisma.gbpQuestion.findUnique({ where: { gbpQuestionId: q.name } });
        const isNew = !existing;
        const upserted = await prisma.gbpQuestion.upsert({
          where: { gbpQuestionId: q.name },
          update: { questionText: q.text, syncedAt },
          create: {
            locationId: location.id,
            gbpQuestionId: q.name,
            questionText: q.text,
            askedAt: new Date(q.createTime),
            answerText: existingAnswer?.text ?? null,
            answeredAt: existingAnswer ? syncedAt : null,
            gbpAnswerId: existingAnswer?.name ?? null,
            syncedAt,
          },
        });
        questionsUpserted++;

        // Detect newly created unanswered questions (created within this sync run)
        if (isNew && !upserted.answeredAt) {
          newUnanswered++;

          // Send notification to org owners/admins if email is configured
          if (isEmailSendingConfigured()) {
            const locationName = location.name ?? location.googleLocationName;
            for (const membership of location.organization.users) {
              const email = membership.user?.email;
              if (email) {
                await sendTeamNotificationEmail({
                  to: email,
                  contactName: "A customer",
                  locationName,
                  eventType: "NEW_GBP_QUESTION",
                });
              }
            }
          }
        }
      }

      await prisma.gbpSyncLog.create({
        data: { locationId: location.id, syncType: "QUESTIONS", status: "SUCCESS", itemsSynced: questions.length, syncedAt },
      });
      locationsProcessed++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown sync error";
      await prisma.gbpSyncLog.create({
        data: { locationId: location.id, syncType: "QUESTIONS", status: "FAILED", error: msg, syncedAt },
      });
    }
  }

  return { locationsProcessed, questionsUpserted, newUnanswered };
}
