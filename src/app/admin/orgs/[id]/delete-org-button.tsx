"use client";

import { useRef } from "react";
import { deleteOrg } from "@/app/admin/actions";

export function DeleteOrgButton({ orgId, orgName }: { orgId: string; orgName: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={deleteOrg}>
      <input type="hidden" name="orgId" value={orgId} />
      <button
        type="button"
        onClick={() => {
          if (confirm(`Permanently delete "${orgName}" and all its data? This cannot be undone.`)) {
            formRef.current?.requestSubmit();
          }
        }}
        className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
      >
        Delete organization
      </button>
    </form>
  );
}
