interface MessagePreviewProps {
  type: "review" | "video";
  channel: "sms" | "email";
  subject?: string;
  sms?: string;
  sample: string;
  location: string;
}

export function MessagePreview({
  type,
  channel,
  subject,
  sms,
  sample,
  location,
}: MessagePreviewProps) {
  // Default values
  const defaultSubject = "How was your experience with [Location]?";
  const defaultSms = `Hi {first}, we'd love to hear about your experience at {location}. Click here to leave a review: {link}`;

  const finalSubject = subject || defaultSubject;
  const finalSms = sms || defaultSms;

  // Substitute tokens
  const substituteTokens = (text: string) => {
    return text
      .replace(/\{location\}/g, location || "[Location]")
      .replace(/\{first\}/g, "John")
      .replace(/\{link\}/g, "review.link");
  };

  const previewText =
    channel === "sms" ? substituteTokens(finalSms) : sample;
  const previewSubject = channel === "email" ? substituteTokens(finalSubject) : "";

  return (
    <div className="flex justify-center">
      {/* Phone Mockup */}
      <div className="relative w-full max-w-xs">
        {/* Phone Frame */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-[3rem] border-8 border-slate-950 bg-white shadow-2xl">
          {/* Notch */}
          <div className="absolute left-1/2 top-0 z-20 w-1/3 -translate-x-1/2 rounded-b-3xl bg-slate-950 py-1" />

          {/* Status Bar */}
          <div className="bg-slate-50 px-4 py-2 text-center text-xs font-semibold text-slate-700">
            {new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

          {/* Content */}
          <div className="h-full overflow-y-auto bg-white">
            {channel === "sms" ? (
              // SMS Thread
              <div className="space-y-3 p-4">
                {/* Incoming Message */}
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-3xl rounded-tl-sm bg-slate-100 px-4 py-2 text-sm text-slate-900">
                    {previewText}
                  </div>
                </div>
              </div>
            ) : (
              // Email Preview
              <div className="space-y-4 p-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">To:</p>
                  <p className="text-sm text-slate-700">john@example.com</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Subject:</p>
                  <p className="text-sm font-medium text-slate-900">{previewSubject}</p>
                </div>
                <div className="border-t border-slate-200 pt-4">
                  <p className="text-sm text-slate-700 leading-relaxed">{previewText}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
