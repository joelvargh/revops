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

	if (!data?.length) {
		return null;
	}

	return (
		<div className="overflow-hidden border-b">
			<div className="flex animate-marquee items-center gap-6 px-4 py-2">
				<span className="shrink-0 text-muted-foreground text-xs">
					Live Pipeline
				</span>
				<span className="text-muted-foreground/30">|</span>
				{data.map((item) => {
					const status = STATUS_LABELS[item.status] ?? {
						label: item.status,
						color: "text-muted-foreground",
					};
					return (
						<span
							className="flex shrink-0 items-center gap-1.5 text-xs"
							key={item.id}
						>
							<span className="max-w-[140px] truncate font-medium text-foreground/80">
								{item.name}
							</span>
							<span className={status.color}>{status.label}</span>
							{item.scoreTotal != null && (
								<span className="text-muted-foreground">
									({item.scoreTotal})
								</span>
							)}
						</span>
					);
				})}
			</div>
		</div>
	);
}
