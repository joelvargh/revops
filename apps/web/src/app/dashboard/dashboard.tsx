"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle, Clock, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { orpc } from "@/lib/orpc";

const pipelineOrder = [
	"DISCOVERED",
	"FILTERED",
	"ICP_QUALIFIED",
	"CONTACT_ACQUIRED",
	"READY",
];

const chartConfig = {
	count: { label: "Companies", color: "hsl(142 71% 45%)" },
} satisfies ChartConfig;

export function Dashboard() {
	const { data } = useQuery(orpc.stats.dashboard.queryOptions({}));

	if (!data) {
		return <div className="text-muted-foreground text-sm">Loading...</div>;
	}

	const stats = [
		{
			label: "Total Leads",
			value: data.totalLeads,
			icon: Building2,
			color: "text-green-700",
		},
		{
			label: "Qualified",
			value: data.qualified,
			icon: CheckCircle,
			color: "text-emerald-600",
		},
		{
			label: "Pending Review",
			value: data.pendingReview,
			icon: Clock,
			color: "text-amber-600",
		},
		{
			label: "Contacts Acquired",
			value: data.contactsAcquired,
			icon: Users,
			color: "text-green-600",
		},
	];

	const pipelineData = pipelineOrder.map((status) => ({
		status: status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
		count: data.pipelineBreakdown.find((p) => p.status === status)?.count ?? 0,
	}));

	return (
		<div className="flex flex-col gap-6">
			{/* Stats Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{stats.map((s) => (
					<Card key={s.label}>
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<CardTitle className="font-medium text-muted-foreground text-sm">
								{s.label}
							</CardTitle>
							<s.icon className={`h-4 w-4 ${s.color}`} />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-3xl">{s.value}</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Pipeline Chart */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Pipeline Breakdown</CardTitle>
				</CardHeader>
				<CardContent>
					<ChartContainer className="h-[300px] w-full" config={chartConfig}>
						<BarChart accessibilityLayer data={pipelineData}>
							<CartesianGrid vertical={false} />
							<XAxis
								axisLine={false}
								dataKey="status"
								fontSize={12}
								tickLine={false}
								tickMargin={8}
							/>
							<YAxis axisLine={false} tickLine={false} />
							<ChartTooltip content={<ChartTooltipContent />} />
							<Bar
								dataKey="count"
								fill="var(--color-count)"
								radius={[4, 4, 0, 0]}
							/>
						</BarChart>
					</ChartContainer>
				</CardContent>
			</Card>

			<div className="grid gap-6 lg:grid-cols-2">
				{/* Recent Activity */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Recent Activity</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{data.recentActivity.map((item) => (
								<div
									className="flex items-center justify-between gap-2"
									key={item.id}
								>
									<div className="min-w-0">
										<p className="truncate font-medium text-sm">{item.name}</p>
										<p className="text-muted-foreground text-xs">
											→ {item.status.replace(/_/g, " ")}
										</p>
									</div>
									<Badge
										className="shrink-0 text-green-700 text-xs"
										variant="outline"
									>
										{new Date(item.updatedAt).toLocaleDateString()}
									</Badge>
								</div>
							))}
							{data.recentActivity.length === 0 && (
								<p className="text-muted-foreground text-sm">
									No recent activity
								</p>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Active Campaigns */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Active Campaigns</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{data.activeCampaigns.map((c) => (
								<div
									className="flex items-center justify-between gap-2"
									key={c.id}
								>
									<div className="min-w-0">
										<p className="truncate font-medium text-sm">{c.name}</p>
										<p className="text-muted-foreground text-xs">
											{c.found} found · {c.qualified} qualified
										</p>
									</div>
									<Badge className="shrink-0 bg-green-100 text-green-800 hover:bg-green-100">
										{c.found > 0
											? Math.round((c.qualified / c.found) * 100)
											: 0}
										%
									</Badge>
								</div>
							))}
							{data.activeCampaigns.length === 0 && (
								<p className="text-muted-foreground text-sm">
									No active campaigns
								</p>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
