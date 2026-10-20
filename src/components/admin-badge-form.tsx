"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { adminAddBadge, type FormState } from "@/app/actions";
import { SubmitButton } from "./submit-button";

// Admins give anyone a badge directly, skipping review and the donor's limit.
export function AdminBadgeForm() {
  const [state, action] = useActionState<FormState, FormData>(adminAddBadge, {});
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-[14px] font-medium">Discord user ID</span>
        <input name="userId" required inputMode="numeric" placeholder="17 to 20 digits" className="field num" />
      </label>
      <label className="block">
        <span className="mb-2 block text-[14px] font-medium">Tooltip</span>
        <input name="tooltip" required maxLength={100} placeholder="Shown when someone hovers the badge" className="field" />
      </label>
      <label className="block">
        <span className="mb-2 block text-[14px] font-medium">Image</span>
        <input
          name="image"
          type="file"
          accept="image/png,image/gif,image/webp,image/jpeg"
          className="block w-full text-[13px] text-muted file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-surface file:px-3 file:text-[13px] file:font-medium file:text-ink"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-[14px] text-muted">…or an image URL</span>
        <input name="imageUrl" type="url" placeholder="https://cdn.discordapp.com/…" className="field" />
      </label>
      <SubmitButton className="btn btn-primary">
        <Plus className="size-4" /> Add badge
      </SubmitButton>
      {(state.error || state.ok) && (
        <p role="status" className={`text-[13px] ${state.error ? "text-negative" : "text-positive"}`}>
          {state.error ?? state.ok}
        </p>
      )}
    </form>
  );
}
