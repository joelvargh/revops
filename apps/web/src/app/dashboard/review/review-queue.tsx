"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { client, orpc } from "@/lib/orpc";

interface ScoreBreakdown {
	company_size: number;
	decision_maker: number;
	industry_fit: number;
	revenue: number;
}

export function ReviewQueue() {
	const queryClient = useQueryClient();
	const {
		data: companies,
		isLoading,
		isError,
	} = useQuery(orpc.review.queue.queryOptions({}));
	const { data: count } = useQuery(orpc.review.count.queryOptions({}));

	// Track pending per company to avoid disabling all cards at once
	const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

	const approveMutation = useMutation({
		mutationFn: (companyId: string) => client.review.approve({ companyId }),
		onMutate: (id) => setPendingIds((s) => new Set(s).add(id)),
		onSettled: (_, __, id) =>
			setPendingIds((s) => {
				const n = new Set(s);
				n.delete(id);
				return n;
			}),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: orpc.review.key() }),
	});

	const rejectMutation = useMutation({
		mutationFn: (companyId: string) => client.review.reject({ companyId }),
		onMutate: (id) => setPendingIds((s) => new Set(s).add(id)),
		onSettled: (_, __, id) =>
			setPendingIds((s) => {
				const n = new Set(s);
				n.delete(id);
				return n;
			}),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: orpc.review.key() }),
	});

	// Keyboard shortcuts — only fire when no input/textarea is focused
	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement).tagName;
			if (
				tag === "INPUT" ||
				tag === "TEXTAREA" ||
				(e.target as HTMLElement).isContentEditable
			) {
				return;
			}
			if (!companies?.length || e.metaKey || e.ctrlKey) {
				return;
			}
			const first = companies[0];
			if (e.key === "a") {
				e.preventDefault();
				approveMutation.mutate(first.id);
			}
			if (e.key === "r") {
				e.preventDefault();
				rejectMutation.mutate(first.id);
			}
		},
		[companies, approveMutation, rejectMutation]
	);

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);

	if (isLoading) {
		return <p className="text-muted-foreground">Loading queue...</p>;
	}
	if (isError) {
		return <p className="text-destructive">Failed to load review queue.</p>;
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-4">
				<Badge className="text-sm" variant="secondary">
					{count ?? 0} companies awaiting review
				</Badge>
				<span className="text-muted-foreground text-xs">
					Keyboard: <kbd className="rounded bg-muted px-1">A</kbd> approve •{" "}
					<kbd className="rounded bg-muted px-1">R</kbd> reject
				</span>
			</div>

			{companies?.length === 0 && (
				<p className="py-12 text-center text-muted-foreground">
					🎉 Review queue is empty!
				</p>
			)}

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{companies?.map((company, i) => {
					const breakdown = company.scoreBreakdown as ScoreBreakdown | null;
					const isPending = pendingIds.has(company.id);
					return (
						<Card
							className={i === 0 ? "ring-2 ring-primary" : ""}
							key={company.id}
						>
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<CardTitle className="truncate text-base">
										{company.name}
									</CardTitle>
									<Badge className="font-bold text-lg" variant="outline">
										{company.scoreTotal}
									</Badge>
								</div>
								<p className="text-muted-foreground text-sm">
									{[company.city, company.state].filter(Boolean).join(", ")}
									{company.category ? ` • ${company.category}` : ""}
								</p>
							</CardHeader>
							<CardContent className="space-y-3">
								{breakdown && (
									<div className="space-y-1.5">
										<ScoreBar
											label="Industry"
											max={30}
											value={breakdown.industry_fit}
										/>
										<ScoreBar
											label="Size"
											max={25}
											value={breakdown.company_size}
										/>
										<ScoreBar
											label="Revenue"
											max={25}
											value={breakdown.revenue}
										/>
										<ScoreBar
											label="Decision Maker"
											max={20}
											value={breakdown.decision_maker}
										/>
									</div>
								)}
								<div className="grid grid-cols-2 gap-2 pt-1 text-muted-foreground text-xs">
									{company.employeeCount && (
										<span>
											👥 {company.employeeCount.toLocaleString()} employees
										</span>
									)}
									{company.revenueMm && (
										<span>💰 ${company.revenueMm}M revenue</span>
									)}
									{company.industry && <span>🏭 {company.industry}</span>}
								</div>
								<div className="flex gap-2 pt-2">
									<Button
										className="flex-1"
										disabled={isPending}
										onClick={() => approveMutation.mutate(company.id)}
										size="sm"
									>
										<Check className="mr-1 h-3 w-3" />
										Approve
									</Button>
									<Button
										className="flex-1"
										disabled={isPending}
										onClick={() => rejectMutation.mutate(company.id)}
										size="sm"
										variant="outline"
									>
										<X className="mr-1 h-3 w-3" />
										Reject
									</Button>
									{company.website && (
										<Button asChild size="sm" variant="ghost">
											<a
												href={company.website}
												rel="noopener noreferrer"
												target="_blank"
											>
												<ExternalLink className="h-3 w-3" />
											</a>
										</Button>
									)}
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
}

function ScoreBar({
	label,
	value,
	max,
}: {
	label: string;
	value: number;
	max: number;
}) {
	return (
		<div className="flex items-center gap-2 text-xs">
			<span className="w-24 text-muted-foreground">{label}</span>
			<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
				<div
					className="h-full rounded-full bg-primary"
					style={{ width: `${(value / max) * 100}%` }}
				/>
			</div>
			<span className="w-8 text-right font-medium">
				{value}/{max}
			</span>
		</div>
	);
}
