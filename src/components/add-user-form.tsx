"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { addAllowedUser, type FormState } from "@/app/actions";
import { SubmitButton } from "./submit-button";

export function AddUserForm() {
  const [state, action] = useActionState<FormState, FormData>(addAllowedUser, {});
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-[14px] font-medium">Discord user ID</span>
        <input name="id" required inputMode="numeric" placeholder="17 to 20 digits" className="field num" />
      </label>
      <label className="block">
        <span className="mb-2 block text-[14px] font-medium">Badge limit</span>
        <input name="limit" type="number" min={0} max={100} required defaultValue={5} className="field num !w-24" />
      </label>
      <SubmitButton className="btn btn-ghost">
        <UserPlus className="size-4" /> Add donor
      </SubmitButton>
      {(state.error || state.ok) && (
        <p role="status" className={`text-[13px] ${state.error ? "text-negative" : "text-positive"}`}>
          {state.error ?? state.ok}
        </p>
      )}
    </form>
  );
}
