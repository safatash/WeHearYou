import { redirect } from "next/navigation";
import { GBP_NEW_POST_PATH } from "@/lib/gbp-post-navigation";

/**
 * Compatibility redirect for saved legacy links. The standalone creation form
 * is retired; all new Google posts now use the canonical drawer route.
 */
export default function LegacyNewGbpPostPage() {
  redirect(GBP_NEW_POST_PATH);
}
