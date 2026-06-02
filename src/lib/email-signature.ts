export function buildEmailSignatureSnippet(params: {
  appUrl: string;
  slug: string;
}): string {
  const { appUrl, slug } = params;
  const base = appUrl.replace(/\/$/, "");

  const happyUrl = `${base}/review/${slug}/google?src=email_signature&amp;medium=email&amp;placement=happy_button`;
  const unhappyUrl = `${base}/review/${slug}/feedback?src=email_signature&amp;medium=email&amp;placement=unhappy_button`;

  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif">
  <tr>
    <td style="padding-top:10px;border-top:1px solid #e5e7eb">
      <span style="font-size:12px;color:#6b7280;margin-right:8px">How was your visit?</span>
      <a href="${happyUrl}" style="display:inline-block;background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:6px;padding:6px 12px;text-decoration:none;font-size:12px;font-weight:700;color:#15803d;margin-right:6px">&#128077; Great</a>
      <a href="${unhappyUrl}" style="display:inline-block;background:#fff7ed;border:1.5px solid #fed7aa;border-radius:6px;padding:6px 12px;text-decoration:none;font-size:12px;font-weight:700;color:#c2410c">&#128078; Not great</a>
    </td>
  </tr>
</table>`;
}
