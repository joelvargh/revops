"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orpc } from "@/lib/orpc";

export default function CampaignDetailPage() {
	const { id } = useParams<{ id: string }>();
	const { data: campaigns } = useQuery(orpc.campaigns.list.queryOptions({}));
	const campaign = campaigns?.find((c: { id: string }) => c.id === id) as
		| {
				id: string;
				name: string;
				status: string;
				searchTerm: string;
				createdAt: Date;
				regions: {
					region: { name: string; code: string; _count?: { cells: number } };
				}[];
				stats: {
					total: number;
					completed: number;
					pending: number;
					failed: number;
				};
		  }
		| undefined;

	if (!campaigns) {
		return <p className="p-6 text-muted-foreground">Loading...</p>;
	}
	if (!campaign) {
		return <p className="p-6 text-muted-foreground">Campaign not found.</p>;
	}

	const { total, completed, pending, failed } = campaign.stats;
	const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<h1 className="font-semibold text-2xl">{campaign.name}</h1>
					<Badge
						variant={campaign.status === "ACTIVE" ? "default" : "secondary"}
					>
						{campaign.status}
					</Badge>
				</div>
				<Button asChild variant="outline">
					<Link href={`/dashboard/campaigns/${id}/edit`}>Edit</Link>
				</Button>
			</div>

			{/* Progress */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="font-medium text-muted-foreground text-sm">
						Discovery Progress
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center justify-between text-sm">
						<span>
							{completed} of {total} cells completed
						</span>
						<span className="font-semibold text-primary">{progress}%</span>
					</div>
					<div className="h-3 w-full overflow-hidden rounded-full bg-muted">
						<div
							className="h-full rounded-full bg-primary transition-all duration-500"
							style={{ width: `${progress}%` }}
						/>
					</div>
					<div className="flex gap-4 text-muted-foreground text-xs">
						<span>✓ {completed} completed</span>
						<span>◷ {pending} pending</span>
						{failed > 0 && (
							<span className="text-destructive">✗ {failed} failed</span>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Details */}
			<Card>
				<CardHeader>
					<CardTitle className="font-medium text-muted-foreground text-sm">
						Details
					</CardTitle>
				</CardHeader>
				<CardContent>
					<dl className="grid gap-3 text-sm md:grid-cols-2">
						<div>
							<dt className="text-muted-foreground">Search Term</dt>
							<dd className="font-medium">{campaign.searchTerm}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Region</dt>
							<dd className="font-medium">
								{campaign.regions.map((r) => r.region.name).join(", ") || "—"}
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Total Grid Cells</dt>
							<dd className="font-medium">{total}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Created</dt>
							<dd className="font-medium">
								{new Date(campaign.createdAt).toLocaleDateString()}
							</dd>
						</div>
					</dl>
				</CardContent>
			</Card>
		</div>
	);
}
