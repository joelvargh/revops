"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Pause, Play, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { client, orpc } from "@/lib/orpc";

export function CampaignsList() {
	const queryClient = useQueryClient();
	const [showCreate, setShowCreate] = useState(false);

	const { data: campaigns, isLoading } = useQuery(
		orpc.campaigns.list.queryOptions({})
	);
	const { data: regions } = useQuery(orpc.campaigns.regions.queryOptions({}));

	const createMutation = useMutation({
		mutationFn: (input: {
			name: string;
			searchTerm: string;
			regionId: string;
		}) => client.campaigns.create(input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: orpc.campaigns.key() });
			setShowCreate(false);
		},
	});

	const updateStatusMutation = useMutation({
		mutationFn: (input: {
			campaignId: string;
			status: "ACTIVE" | "PAUSED" | "COMPLETED";
		}) => client.campaigns.updateStatus(input),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: orpc.campaigns.key() }),
	});

	const deleteMutation = useMutation({
		mutationFn: (input: { campaignId: string }) =>
			client.campaigns.delete(input),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: orpc.campaigns.key() }),
	});

	if (isLoading) {
		return <p className="text-muted-foreground">Loading campaigns...</p>;
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex justify-end">
				<Button onClick={() => setShowCreate(!showCreate)}>
					<Plus className="mr-2 h-4 w-4" />
					New Campaign
				</Button>
			</div>

			{showCreate && (
				<Card>
					<CardHeader>
						<CardTitle>Create Campaign</CardTitle>
					</CardHeader>
					<CardContent>
						<CreateCampaignForm
							loading={createMutation.isPending}
							onSubmit={(data) => createMutation.mutate(data)}
							regions={regions ?? []}
						/>
					</CardContent>
				</Card>
			)}

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{campaigns?.map((campaign) => (
					<Card key={campaign.id}>
						<CardHeader className="pb-2">
							<div className="flex items-center justify-between">
								<CardTitle className="text-base">{campaign.name}</CardTitle>
								<Badge
									variant={
										campaign.status === "ACTIVE"
											? "default"
											: campaign.status === "PAUSED"
												? "secondary"
												: "outline"
									}
								>
									{campaign.status}
								</Badge>
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="text-muted-foreground text-sm">
								<p>
									Search:{" "}
									<span className="text-foreground">{campaign.searchTerm}</span>
								</p>
								<p>
									Region:{" "}
									<span className="text-foreground">
										{campaign.regions.map((r) => r.region.name).join(", ")}
									</span>
								</p>
							</div>

							{/* Progress */}
							<div className="space-y-1">
								<div className="flex justify-between text-muted-foreground text-xs">
									<span>
										{campaign.stats.completed}/{campaign.stats.total} cells
									</span>
									<span>
										{campaign.stats.total > 0
											? Math.round(
													(campaign.stats.completed / campaign.stats.total) *
														100
												)
											: 0}
										%
									</span>
								</div>
								<div className="h-2 overflow-hidden rounded-full bg-muted">
									<div
										className="h-full rounded-full bg-primary"
										style={{
											width: `${campaign.stats.total > 0 ? (campaign.stats.completed / campaign.stats.total) * 100 : 0}%`,
										}}
									/>
								</div>
							</div>

							{/* Actions */}
							<div className="flex gap-2 pt-2">
								<Button
									onClick={() =>
										updateStatusMutation.mutate({
											campaignId: campaign.id,
											status:
												campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
										})
									}
									size="sm"
									variant="outline"
								>
									{campaign.status === "ACTIVE" ? (
										<Pause className="mr-1 h-3 w-3" />
									) : (
										<Play className="mr-1 h-3 w-3" />
									)}
									{campaign.status === "ACTIVE" ? "Pause" : "Resume"}
								</Button>
								<Button asChild size="sm" variant="outline">
									<a href={`/map?campaign=${campaign.id}`}>
										<MapPin className="mr-1 h-3 w-3" />
										Map
									</a>
								</Button>
								<Button
									className="ml-auto text-destructive"
									onClick={() =>
										deleteMutation.mutate({ campaignId: campaign.id })
									}
									size="sm"
									variant="ghost"
								>
									<Trash2 className="h-3 w-3" />
								</Button>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{campaigns?.length === 0 && (
				<p className="py-8 text-center text-muted-foreground">
					No campaigns yet. Create one to start discovering leads.
				</p>
			)}
		</div>
	);
}

function CreateCampaignForm({
	regions,
	onSubmit,
	loading,
}: {
	regions: { id: string; name: string; country: { code: string } }[];
	onSubmit: (data: {
		name: string;
		searchTerm: string;
		regionId: string;
	}) => void;
	loading: boolean;
}) {
	const [name, setName] = useState("");
	const [searchTerm, setSearchTerm] = useState("");
	const [regionId, setRegionId] = useState("");

	return (
		<form
			className="grid gap-4 md:grid-cols-4"
			onSubmit={(e) => {
				e.preventDefault();
				if (name && searchTerm && regionId) {
					onSubmit({ name, searchTerm, regionId });
				}
			}}
		>
			<div className="space-y-1">
				<Label>Campaign Name</Label>
				<Input
					onChange={(e) => setName(e.target.value)}
					placeholder="Construction TX Q3"
					required
					value={name}
				/>
			</div>
			<div className="space-y-1">
				<Label>Search Term</Label>
				<Input
					onChange={(e) => setSearchTerm(e.target.value)}
					placeholder="general contractors"
					required
					value={searchTerm}
				/>
			</div>
			<div className="space-y-1">
				<Label>Region</Label>
				<Select onValueChange={setRegionId} value={regionId}>
					<SelectTrigger>
						<SelectValue placeholder="Select region" />
					</SelectTrigger>
					<SelectContent>
						{regions.map((r) => (
							<SelectItem key={r.id} value={r.id}>
								{r.name} ({r.country.code})
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="flex items-end">
				<Button className="w-full" disabled={loading} type="submit">
					{loading ? "Creating..." : "Create & Generate Cells"}
				</Button>
			</div>
		</form>
	);
}
