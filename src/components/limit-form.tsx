"use client";

import { Save } from "lucide-react";
import { setBadgeLimit } from "@/app/actions";
import { SubmitButton } from "./submit-button";

export function LimitForm({ userId, limit, badgeCount }: { userId: string; limit: number; badgeCount: number }) {
  return (
    <form
      action={setBadgeLimit.bind(null, userId)}
      onSubmit={(e) => {
        const next = Number(new FormData(e.currentTarget).get("limit"));
        const lost = badgeCount - next;
        if (lost > 0 && !confirm(`This deletes the last ${lost} badge(s) of ${userId}. Continue?`)) e.preventDefault();
      }}
      className="flex items-center gap-1"
    >
      <input
        name="limit"
        type="number"
        min={0}
        max={100}
        required
        defaultValue={limit}
        aria-label={`Badge limit for ${userId}`}
        className="field num !h-8 !w-16 !px-2 text-right"
      />
      <SubmitButton className="btn btn-quiet !h-8 !px-2" aria-label="Save limit" title="Save limit">
        <Save className="size-4" />
      </SubmitButton>
    </form>
  );
}
