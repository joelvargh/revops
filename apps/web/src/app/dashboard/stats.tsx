"use client";

import { useQuery } from "@tanstack/react-query";
import {
	Building2,
	CheckCircle,
	Clock,
	Search,
	Target,
	Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orpc } from "@/lib/orpc";

export function DashboardStats() {
	const { data: leads } = useQuery(orpc.leads.stats.queryOptions({}));
	const { data: review } = useQuery(orpc.review.count.queryOptions({}));
	const { data: research } = useQuery(orpc.research.count.queryOptions({}));

	const stats = [
		{
			label: "ICP Qualified",
			value: leads?.qualified ?? 0,
			icon: CheckCircle,
			color: "text-green-600",
		},
		{
			label: "Review Pending",
			value: review ?? 0,
			icon: Clock,
			color: "text-amber-600",
		},
		{
			label: "Research Needed",
			value: research ?? 0,
			icon: Search,
			color: "text-orange-600",
		},
		{
			label: "Contacts Acquired",
			value: leads?.contactAcquired ?? 0,
			icon: Users,
			color: "text-purple-600",
		},
		{
			label: "Ready for Outreach",
			value: leads?.ready ?? 0,
			icon: Target,
			color: "text-emerald-600",
		},
		{
			label: "Total Pipeline",
			value: leads?.total ?? 0,
			icon: Building2,
			color: "text-blue-600",
		},
	];

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{stats.map((stat) => (
				<Card key={stat.label}>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="font-medium text-muted-foreground text-sm">
							{stat.label}
						</CardTitle>
						<stat.icon className={`h-4 w-4 ${stat.color}`} />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-3xl">{stat.value}</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
