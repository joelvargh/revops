"use client";

import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  FILTERED: { label: "filtered", color: "text-blue-600" },
  EXCLUDED: { label: "excluded", color: "text-gray-400" },
  ENRICHMENT_PENDING: { label: "enriching", color: "text-orange-500" },
  RESEARCH_PENDING: { label: "needs research", color: "text-yellow-600" },
  ICP_QUALIFIED: { label: "qualified", color: "text-green-600" },
  ICP_REVIEW_PENDING: { label: "needs review", color: "text-amber-600" },
  ICP_DISQUALIFIED: { label: "disqualified", color: "text-red-400" },
  ICP_REVIEW_APPROVED: { label: "approved", color: "text-green-600" },
  ICP_REVIEW_REJECTED: { label: "rejected", color: "text-red-500" },
  CONTACT_ACQUIRED: { label: "contacts found", color: "text-purple-600" },
  READY: { label: "ready ✓", color: "text-emerald-600" },
};

export function PipelineTicker() {
  const { data } = useQuery({
    ...orpc.activity.recent.queryOptions({}),
    refetchInterval: 30_000,
  });

  if (!data?.length) return null;

  return (
    <div className="border-b overflow-hidden">
      <div className="flex items-center gap-6 px-4 py-2 animate-marquee">
        <span className="text-xs text-muted-foreground shrink-0">Live Pipeline</span>
        <span className="text-muted-foreground/30">|</span>
        {data.map((item) => {
          const status = STATUS_LABELS[item.status] ?? { label: item.status, color: "text-muted-foreground" };
          return (
            <span key={item.id} className="flex items-center gap-1.5 text-xs shrink-0">
              <span className="text-foreground/80 font-medium truncate max-w-[140px]">{item.name}</span>
              <span className={status.color}>{status.label}</span>
              {item.scoreTotal != null && <span className="text-muted-foreground">({item.scoreTotal})</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}
