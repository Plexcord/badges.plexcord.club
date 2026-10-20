"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export function SubmitButton({ children, ...props }: ComponentProps<"button">) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} {...props}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : children}
    </button>
  );
}
