"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Search, SkipForward } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { client, orpc } from "@/lib/orpc";

export function ResearchQueue() {
	const queryClient = useQueryClient();
	const { data: companies, isLoading } = useQuery(
		orpc.research.queue.queryOptions({})
	);
	const { data: count } = useQuery(orpc.research.count.queryOptions({}));

	const submitMutation = useMutation({
		mutationFn: (input: {
			companyId: string;
			employees: number | null;
			revenueMm: number | null;
			industry: string | null;
		}) => client.research.submit(input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: orpc.research.key() });
			toast.success("Company data submitted will be scored next cycle");
		},
	});

	const skipMutation = useMutation({
		mutationFn: (companyId: string) => client.research.skip({ companyId }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: orpc.research.key() });
			toast.info("Company skipped (marked as RED)");
		},
	});

	if (isLoading) {
		return <p className="text-muted-foreground">Loading...</p>;
	}

	return (
		<div className="space-y-4">
			<Badge variant="secondary">{count ?? 0} companies need research</Badge>

			{companies?.length === 0 && (
				<p className="py-12 text-center text-muted-foreground">
					🎉 No companies need research. All automated!
				</p>
			)}

			<div className="grid gap-4 md:grid-cols-2">
				{companies?.map((company) => (
					<ResearchCard
						company={company}
						key={company.id}
						loading={submitMutation.isPending}
						onSkip={() => skipMutation.mutate(company.id)}
						onSubmit={(data) =>
							submitMutation.mutate({ companyId: company.id, ...data })
						}
					/>
				))}
			</div>
		</div>
	);
}

function ResearchCard({
	company,
	onSubmit,
	onSkip,
	loading,
}: {
	company: {
		id: string;
		name: string;
		city: string | null;
		state: string | null;
		category: string | null;
		website: string | null;
		domain: string | null;
	};
	onSubmit: (data: {
		employees: number | null;
		revenueMm: number | null;
		industry: string | null;
	}) => void;
	onSkip: () => void;
	loading: boolean;
}) {
	const [employees, setEmployees] = useState("");
	const [revenue, setRevenue] = useState("");
	const [industry, setIndustry] = useState("");

	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base">{company.name}</CardTitle>
					{company.website && (
						<a
							className="text-muted-foreground hover:text-primary"
							href={company.website}
							rel="noopener noreferrer"
							target="_blank"
						>
							<ExternalLink className="h-4 w-4" />
						</a>
					)}
				</div>
				<p className="text-muted-foreground text-xs">
					{company.city}, {company.state} • {company.category}
				</p>
				{company.domain && (
					<p className="font-mono text-muted-foreground text-xs">
						{company.domain}
					</p>
				)}
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="grid grid-cols-3 gap-2">
					<div className="space-y-1">
						<Label className="text-xs">Employees</Label>
						<Input
							onChange={(e) => setEmployees(e.target.value)}
							placeholder="e.g. 150"
							type="number"
							value={employees}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">Revenue ($M)</Label>
						<Input
							onChange={(e) => setRevenue(e.target.value)}
							placeholder="e.g. 25"
							type="number"
							value={revenue}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">Industry</Label>
						<Input
							onChange={(e) => setIndustry(e.target.value)}
							placeholder="e.g. Construction"
							value={industry}
						/>
					</div>
				</div>
				<div className="flex gap-2">
					<Button
						className="flex-1"
						disabled={loading || !(employees || revenue)}
						onClick={() =>
							onSubmit({
								employees: employees ? Number(employees) : null,
								revenueMm: revenue ? Number(revenue) : null,
								industry: industry || null,
							})
						}
						size="sm"
					>
						<Search className="mr-1 h-3 w-3" />
						Submit & Score
					</Button>
					<Button onClick={onSkip} size="sm" variant="ghost">
						<SkipForward className="mr-1 h-3 w-3" />
						Skip
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
