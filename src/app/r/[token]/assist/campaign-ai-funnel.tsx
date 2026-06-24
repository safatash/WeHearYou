"use client";
import { AiFunnelFlow } from "@/app/f/[slug]/ai-funnel/ai-funnel-flow";
import type { AiFunnelProps } from "@/app/f/[slug]/ai-funnel/build-props";
import { recordCampaignPositiveReview } from "../actions";

export function CampaignAiFunnel({ props, token, rating }: { props: AiFunnelProps; token: string; rating: number }) {
  return (
    <AiFunnelFlow
      {...props}
      initialScreen="pos-intro"
      initialRating={rating}
      onRecordPositive={(i) => recordCampaignPositiveReview({ token, rating: i.rating, body: i.body })}
    />
  );
}
