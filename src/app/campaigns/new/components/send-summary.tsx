interface SendSummaryProps {
  type: string;
  location: string;
  channels: {
    sms: boolean;
    email: boolean;
  };
  recipients: number;
}

export function SendSummary({
  type,
  location,
  channels,
  recipients,
}: SendSummaryProps) {
  // Calculate estimated sends
  const enabledChannels = (channels.sms ? 1 : 0) + (channels.email ? 1 : 0);
  const estimatedSends = recipients * enabledChannels;

  // Get channel labels
  const channelLabels = [];
  if (channels.sms) channelLabels.push("SMS");
  if (channels.email) channelLabels.push("Email");
  const channelString = channelLabels.join(" & ");

  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
      <h3 className="text-lg font-semibold text-slate-950">Summary</h3>

      <div className="mt-5 space-y-4">
        {/* Type */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-600">Type</p>
          <p className="text-sm font-semibold text-slate-900">{type}</p>
        </div>

        {/* Location */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-600">Location</p>
          <p className="text-sm font-semibold text-slate-900">{location}</p>
        </div>

        {/* Channels */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-600">Channels</p>
          <p className="text-sm font-semibold text-slate-900">{channelString}</p>
        </div>

        {/* Recipients */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-600">Recipients</p>
          <p className="text-sm font-semibold text-slate-900">{recipients}</p>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200" />

        {/* Estimated Sends */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-600">Estimated sends</p>
          <p className="text-base font-bold text-indigo-600">{estimatedSends}</p>
        </div>
      </div>
    </div>
  );
}
