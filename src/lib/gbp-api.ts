const GBP_V4 = "https://mybusiness.googleapis.com/v4";

export type GbpPostPayload = {
  postType: "WHATS_NEW" | "OFFER" | "EVENT";
  content: string;
  callToAction?: { actionType: string; url: string } | null;
  imageUrl?: string | null;
  eventTitle?: string;
  // Offer-specific
  offerCouponCode?: string;
  offerRedeemUrl?: string;
  offerTerms?: string;
  offerStartDate?: string;
  offerStartTime?: string;
  offerEndDate?: string;
  offerEndTime?: string;
};

export type GbpApiError = { code: number; message: string };

async function gbpFetch(
  url: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    cache: "no-store",
  });
  return res;
}

function extractErrorMessage(text: string): string {
  try {
    type GbpError = {
      error?: {
        message?: string;
        details?: Array<{ fieldViolations?: Array<{ field?: string; description?: string }> }>;
      };
    };
    const json = JSON.parse(text) as GbpError;
    let msg = json.error?.message ?? text;
    const violations = json.error?.details?.flatMap((d) => d.fieldViolations ?? []) ?? [];
    if (violations.length) {
      msg += " — " + violations.map((v) => `${v.field ?? "?"}: ${v.description ?? "?"}`).join("; ");
    }
    return msg;
  } catch {
    return text;
  }
}

export async function publishGbpReply(
  accessToken: string,
  reviewName: string,
  replyText: string
): Promise<void> {
  const res = await gbpFetch(`${GBP_V4}/${reviewName}/reply`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ comment: replyText }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GBP publishReply failed (${res.status}): ${extractErrorMessage(text)}`);
  }
}

export async function createGbpPost(
  accessToken: string,
  locationName: string,
  post: GbpPostPayload
): Promise<string> {
  const topicType =
    post.postType === "OFFER" ? "OFFER" :
    post.postType === "EVENT" ? "EVENT" :
    "STANDARD";

  const body: Record<string, unknown> = {
    languageCode: "en-US",
    summary: post.content,
    topicType,
  };
  if (post.callToAction?.url) {
    body.callToAction = { actionType: post.callToAction.actionType || "LEARN_MORE", url: post.callToAction.url };
  }
  if (post.imageUrl) {
    body.media = [{ mediaFormat: "PHOTO", sourceUrl: post.imageUrl }];
  }

  // Event/Offer: event object (title required for OFFER, schedule only when BOTH dates present)
  if (post.postType === "EVENT" || post.postType === "OFFER") {
    const eventObj: Record<string, unknown> = {};
    if (post.eventTitle) eventObj.title = post.eventTitle;

    // Only build schedule when both start AND end date are provided
    if (post.offerStartDate && post.offerEndDate) {
      const [sy, sm, sd] = post.offerStartDate.split("-").map(Number);
      const [ey, em, ed] = post.offerEndDate.split("-").map(Number);
      const schedule: Record<string, unknown> = {
        startDate: { year: sy, month: sm, day: sd },
        endDate: { year: ey, month: em, day: ed },
      };
      if (post.offerStartTime) {
        const [h, min] = post.offerStartTime.split(":").map(Number);
        schedule.startTime = { hours: h, minutes: min };
      }
      if (post.offerEndTime) {
        const [h, min] = post.offerEndTime.split(":").map(Number);
        schedule.endTime = { hours: h, minutes: min };
      }
      eventObj.schedule = schedule;
    }

    if (Object.keys(eventObj).length > 0) body.event = eventObj;
  }

  // Offer-specific fields
  if (post.postType === "OFFER") {
    const offer: Record<string, unknown> = {};
    if (post.offerCouponCode) offer.couponCode = post.offerCouponCode;
    if (post.offerRedeemUrl) offer.redeemOnlineUrl = post.offerRedeemUrl;
    if (post.offerTerms) offer.termsConditions = post.offerTerms;
    if (Object.keys(offer).length > 0) body.offer = offer;
  }

  console.log("[GBP createPost] body:", JSON.stringify(body, null, 2));
  const res = await gbpFetch(`${GBP_V4}/${locationName}/localPosts`, accessToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[GBP createPost] error response:", text);
    throw new Error(`GBP createPost failed (${res.status}): ${extractErrorMessage(text)}`);
  }
  const json = (await res.json()) as { name?: string };
  return json.name ?? "";
}

export async function deleteGbpPost(
  accessToken: string,
  gbpPostId: string
): Promise<void> {
  const res = await gbpFetch(`${GBP_V4}/${gbpPostId}`, accessToken, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`GBP deletePost failed (${res.status}): ${extractErrorMessage(text)}`);
  }
}

export async function uploadGbpPhoto(
  accessToken: string,
  locationName: string,
  sourceUrl: string,
  category: string
): Promise<string> {
  const body = {
    mediaFormat: "PHOTO",
    sourceUrl,
    locationAssociation: { category },
  };
  const res = await gbpFetch(`${GBP_V4}/${locationName}/media`, accessToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GBP uploadPhoto failed (${res.status}): ${extractErrorMessage(text)}`);
  }
  const json = (await res.json()) as { name?: string };
  return json.name ?? "";
}

export async function deleteGbpPhoto(
  accessToken: string,
  gbpMediaId: string
): Promise<void> {
  const res = await gbpFetch(`${GBP_V4}/${gbpMediaId}`, accessToken, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`GBP deletePhoto failed (${res.status}): ${extractErrorMessage(text)}`);
  }
}

export type GbpQuestion = {
  name: string;
  text: string;
  createTime: string;
  topAnswers?: Array<{ text: string; name: string }>;
};

export async function listGbpQuestions(
  accessToken: string,
  locationName: string
): Promise<GbpQuestion[]> {
  const url = `${GBP_V4}/${locationName}/questions?answersPerQuestion=1&pageSize=50`;
  const res = await gbpFetch(url, accessToken);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GBP listQuestions failed (${res.status}): ${extractErrorMessage(text)}`);
  }
  const json = (await res.json()) as { questions?: GbpQuestion[] };
  return json.questions ?? [];
}

export async function answerGbpQuestion(
  accessToken: string,
  questionName: string,
  answerText: string
): Promise<string> {
  const res = await gbpFetch(`${GBP_V4}/${questionName}/answers/`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ answer: { text: answerText } }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GBP answerQuestion failed (${res.status}): ${extractErrorMessage(text)}`);
  }
  const json = (await res.json()) as { name?: string };
  return json.name ?? "";
}
