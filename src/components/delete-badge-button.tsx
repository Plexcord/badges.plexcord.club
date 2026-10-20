"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteBadge } from "@/app/actions";

export function DeleteBadgeButton({ id, className = "" }: { id: number; className?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Delete badge"
      title="Delete badge"
      onPointerDown={(e) => e.stopPropagation()} // don't start a drag in the reorder list
      onClick={() => confirm("Delete this badge? This can't be undone.") && start(() => deleteBadge(id))}
      className={`btn btn-quiet !h-8 !px-2 hover:!bg-neg-bg hover:!text-negative ${className}`}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </button>
  );
}
