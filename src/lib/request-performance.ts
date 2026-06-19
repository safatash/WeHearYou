export type RequestRecipientInput = {
  sentAt: Date | null;
  openedAt: Date | null;
  completedAt: Date | null;
  channel: string;
};

export type RequestPerformance = {
  requestsSent: number;
  openRate: number | null;
  clickRate: number | null;
  conversionRate: number | null;
  bestChannel: string | null;
  latestCampaignName: string | null;
  lastRequestSentAt: Date | null;
  hasData: boolean;
};

export function computeRequestPerformance(input: {
  recipients: RequestRecipientInput[];
  campaigns: Array<{ name: string; createdAt: Date }>;
}): RequestPerformance {
  const sent = input.recipients.filter((r) => r.sentAt);
  const requestsSent = sent.length;

  const ratio = (n: number) => (requestsSent ? n / requestsSent : null);
  const opened = sent.filter((r) => r.openedAt).length;
  const completed = sent.filter((r) => r.completedAt).length;

  // Best channel by conversion (completed / sent within channel).
  const byChannel = new Map<string, { sent: number; completed: number }>();
  for (const r of sent) {
    const agg = byChannel.get(r.channel) ?? { sent: 0, completed: 0 };
    agg.sent += 1;
    if (r.completedAt) agg.completed += 1;
    byChannel.set(r.channel, agg);
  }
  let bestChannel: string | null = null;
  let bestRate = -1;
  for (const [channel, agg] of byChannel) {
    const rate = agg.completed / agg.sent;
    if (rate > bestRate) {
      bestRate = rate;
      bestChannel = channel;
    }
  }

  const latestCampaign = [...input.campaigns].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )[0];
  const lastRequestSentAt = sent
    .map((r) => r.sentAt as Date)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  return {
    requestsSent,
    openRate: ratio(opened),
    clickRate: ratio(completed),
    conversionRate: ratio(completed),
    bestChannel,
    latestCampaignName: latestCampaign?.name ?? null,
    lastRequestSentAt,
    hasData: requestsSent > 0,
  };
}

export function getLocationRequestPerformance(location: {
  campaigns: Array<{
    name: string;
    channel: string;
    createdAt: Date;
    recipients: Array<{ sentAt: Date | null; openedAt: Date | null; completedAt: Date | null }>;
  }>;
}): RequestPerformance {
  const recipients: RequestRecipientInput[] = location.campaigns.flatMap((c) =>
    c.recipients.map((r) => ({ ...r, channel: c.channel })),
  );
  return computeRequestPerformance({
    recipients,
    campaigns: location.campaigns.map((c) => ({ name: c.name, createdAt: c.createdAt })),
  });
}
