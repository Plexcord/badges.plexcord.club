"use client";
/* eslint-disable @next/next/no-img-element -- badges are small user images served by our own route */

import { useActionState, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, Reorder } from "motion/react";
import { Check, Clock, GripVertical, ImagePlus, Link2, Loader2, Pencil, Send, X } from "lucide-react";
import { reorderBadges, submitRequest, type FormState } from "@/app/actions";
import { DeleteBadgeButton } from "./delete-badge-button";

type Badge = { id: number; tooltip: string; badge: string };
type Request = {
  id: number;
  tooltip: string;
  image: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  badgeId: number | null;
  createdAt: string;
};

export function BadgeManager({
  badges,
  requests,
  limit,
  used,
}: {
  badges: Badge[];
  requests: Request[];
  limit: number;
  used: number;
}) {
  const [items, setItems] = useState(badges);
  const latest = useRef(badges);
  const saved = useRef(badges.map((b) => b.id).join());
  const [saving, startSaving] = useTransition();
  const [target, setTarget] = useState<number | null>(null);

  const saveOrder = () => {
    const ids = latest.current.map((b) => b.id);
    if (ids.join() === saved.current) return;
    startSaving(async () => {
      await reorderBadges(ids);
      saved.current = ids.join();
    });
  };

  const waitingNew = Math.max(0, used - items.length);

  return (
    <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section aria-labelledby="worn-title" className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
          <h2 id="worn-title" className="text-[16px] font-semibold">
            Worn on your profile
          </h2>
          <span className="flex items-center gap-1.5 text-[13px] text-muted" aria-live="polite">
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Saving order…
              </>
            ) : (
              items.length > 1 && "Drag to change the order"
            )}
          </span>
        </div>

        <QuotaTrack worn={items.length} waiting={waitingNew} limit={limit} />

        {items.length === 0 ? (
          <p className="mx-5 mb-5 rounded-lg border border-dashed border-control px-4 py-3 text-[14px] text-muted">
            Nothing on your profile yet. Request your first badge on the right.
          </p>
        ) : (
          <Reorder.Group
            axis="y"
            values={items}
            onReorder={(next) => {
              latest.current = next;
              setItems(next);
            }}
            className="pb-2"
          >
            {items.map((b, i) => (
              <Reorder.Item
                key={b.id}
                value={b}
                onDragEnd={saveOrder}
                whileDrag={{ scale: 1.01, boxShadow: "0 8px 24px -8px rgb(0 0 0 / 0.6)" }}
                className={`relative flex cursor-grab items-center gap-3 bg-panel px-5 py-3 active:cursor-grabbing ${i ? "border-t border-rule" : ""} ${target === b.id ? "!bg-accent-50" : ""}`}
              >
                <GripVertical className="size-4 shrink-0 text-muted" aria-hidden />
                <span className="num w-5 text-[13px] text-muted">{i + 1}.</span>
                <img src={b.badge} alt="" width={40} height={40} className="size-10 shrink-0 rounded-md bg-surface object-contain" draggable={false} />
                <span className="mr-auto min-w-0 truncate text-[14px] font-medium">{b.tooltip}</span>
                <button
                  type="button"
                  onClick={() => setTarget(b.id)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="btn btn-quiet !h-8 !px-2.5 text-[13px]"
                >
                  <Pencil className="size-3.5" /> <span className="hidden sm:inline">Change</span>
                </button>
                <DeleteBadgeButton id={b.id} />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </section>

      <div className="space-y-4">
        <RequestForm badges={items} target={target} setTarget={setTarget} full={used >= limit} limit={limit} />

        {requests.length > 0 && (
          <section aria-labelledby="requests-title" className="panel">
            <h2 id="requests-title" className="px-5 pt-4 text-[16px] font-semibold">
              Your requests
            </h2>
            <ul className="py-2">
              {requests.slice(0, 6).map((r, i) => (
                <li key={r.id} className={`flex items-center gap-3 px-5 py-2.5 ${i ? "border-t border-rule" : ""}`}>
                  {r.status === "PENDING" ? (
                    <img src={`/api/pending/${r.image}`} alt="" width={32} height={32} className="size-8 shrink-0 rounded-md bg-surface object-contain" />
                  ) : (
                    <span className="size-8 shrink-0 rounded-md bg-surface" aria-hidden />
                  )}
                  <div className="mr-auto min-w-0">
                    <p className="truncate text-[14px]">{r.tooltip}</p>
                    <p className="num text-[12px] text-muted">
                      {r.badgeId ? "Change" : "New badge"} · {r.createdAt.slice(0, 10)}
                    </p>
                  </div>
                  <StatusPill status={r.status} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

// Plan track: as long as the limit; worn in the hue, waiting in its pale tint, both ends labelled.
function QuotaTrack({ worn, waiting, limit }: { worn: number; waiting: number; limit: number }) {
  const pct = (n: number) => `${limit ? Math.min(100, (n / limit) * 100) : 0}%`;
  return (
    <div className="px-5 pt-3 pb-4">
      <div className="flex h-2 overflow-hidden rounded-full bg-surface" role="img" aria-label={`${worn} worn and ${waiting} waiting of ${limit} slots`}>
        <span className="h-full bg-accent" style={{ width: pct(worn) }} />
        <span className="h-full bg-accent-200" style={{ width: pct(waiting) }} />
      </div>
      <div className="num mt-1.5 flex justify-between text-[12px] text-muted">
        <span>
          {worn} worn{waiting ? ` · ${waiting} waiting` : ""}
        </span>
        <span>Limit {limit}</span>
      </div>
    </div>
  );
}

function RequestForm({
  badges,
  target,
  setTarget,
  full,
  limit,
}: {
  badges: Badge[];
  target: number | null;
  setTarget: (id: number | null) => void;
  full: boolean;
  limit: number;
}) {
  const [mode, setMode] = useState<"file" | "url">("file");
  const [preview, setPreview] = useState<string | null>(null);
  const editing = badges.find((b) => b.id === target);
  // React resets the form fields itself after a successful action.
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, form) => {
    const result = await submitRequest(prev, form);
    if (result.ok) {
      setPreview(null);
      setTarget(null);
    }
    return result;
  }, {});

  return (
    <section id="request" aria-labelledby="request-title" className="panel scroll-mt-16 p-5">
      <div className="flex items-center justify-between">
        <h2 id="request-title" className="text-[16px] font-semibold">
          {editing ? "Change a badge" : "Request a badge"}
        </h2>
        {editing && (
          <button type="button" onClick={() => setTarget(null)} className="btn btn-quiet !h-8 !px-2 text-[13px]">
            <X className="size-3.5" /> Cancel
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex items-center gap-3 rounded-lg bg-accent-50 p-2.5 text-[14px] text-accent-dark">
              <img src={editing.badge} alt="" width={28} height={28} className="size-7 rounded" />
              <span className="min-w-0 truncate">
                Replacing <span className="font-medium">{editing.tooltip}</span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {full && !editing && (
        <p className="mt-3 rounded-lg bg-warn-bg px-3 py-2 text-[13px] text-warn-ink">
          All {limit} slots are in use. Delete a badge or change an existing one instead.
        </p>
      )}

      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="badgeId" value={editing?.id ?? ""} />

        <label className="block">
          <span className="mb-2 block text-[14px] font-medium">Tooltip</span>
          <input
            name="tooltip"
            required
            maxLength={100}
            defaultValue=""
            key={target ?? "new"}
            placeholder={editing?.tooltip ?? "Shown when someone hovers the badge"}
            className="field"
          />
        </label>

        <div>
          <span className="mb-2 block text-[14px] font-medium">Picture</span>
          <div className="mb-2 flex gap-1 rounded-lg bg-surface p-1 text-[13px]" role="tablist">
            {(["file", "url"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setPreview(null);
                }}
                className={`relative flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md transition-colors ${mode === m ? "font-medium text-ink" : "text-muted hover:text-ink"}`}
              >
                {mode === m && <motion.span layoutId="picture-mode" className="absolute inset-0 rounded-md bg-panel" transition={{ duration: 0.2 }} />}
                <span className="relative flex items-center gap-1.5">
                  {m === "file" ? <ImagePlus className="size-3.5" /> : <Link2 className="size-3.5" />}
                  {m === "file" ? "Upload" : "Image URL"}
                </span>
              </button>
            ))}
          </div>

          {mode === "file" ? (
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-control p-3 transition-colors hover:border-accent hover:bg-accent-50">
              {preview ? (
                <img src={preview} alt="" width={40} height={40} className="size-10 rounded-md object-contain" />
              ) : (
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface">
                  <ImagePlus className="size-4 text-muted" />
                </span>
              )}
              <span className="text-[13px] text-muted">
                <span className="block text-[14px] text-ink">Choose an image</span>
                Images only: PNG, GIF, WEBP or JPG · up to 10 MB · 128 × 128 is plenty
              </span>
              <input
                type="file"
                name="image"
                accept="image/png,image/gif,image/webp,image/jpeg"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setPreview(f ? URL.createObjectURL(f) : null);
                }}
              />
            </label>
          ) : (
            <input name="imageUrl" type="url" placeholder="https://cdn.discordapp.com/…" className="field" aria-label="Image URL" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button disabled={pending || (full && !editing)} className="btn btn-primary">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send for review
          </button>
          <AnimatePresence mode="wait">
            {(state.error || state.ok) && (
              <motion.p
                key={state.error ?? state.ok}
                role="status"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`text-[13px] ${state.error ? "text-negative" : "text-positive"}`}
              >
                {state.error ?? state.ok}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </form>
    </section>
  );
}

export function StatusPill({ status }: { status: Request["status"] }) {
  const styles = {
    PENDING: ["bg-warn-bg text-warn-ink", Clock, "Waiting"],
    APPROVED: ["bg-pos-bg text-positive", Check, "Approved"],
    REJECTED: ["bg-neg-bg text-negative", X, "Rejected"],
  } as const;
  const [cls, Icon, label] = styles[status];
  return (
    <span className={`pill ${cls}`}>
      <Icon className="size-3" /> {label}
    </span>
  );
}
