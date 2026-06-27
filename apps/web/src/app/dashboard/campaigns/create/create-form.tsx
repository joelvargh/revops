"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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

export function CreateCampaignForm() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [name, setName] = useState("");
	const [searchTerm, setSearchTerm] = useState("");
	const [countryId, setCountryId] = useState("");
	const [regionId, setRegionId] = useState("");
	const [cellSize, setCellSize] = useState("0.5");

	const { data: countries } = useQuery(
		orpc.geography.countries.list.queryOptions()
	);
	const { data: regions } = useQuery({
		...orpc.geography.regions.list.queryOptions({ input: { countryId } }),
		enabled: !!countryId,
	});

	const selectedRegion = regions?.find(
		(r: { id: string }) => r.id === regionId
	);
	const hasExistingCells = selectedRegion?.cellsGenerated;

	const mutation = useMutation({
		mutationFn: () =>
			client.campaigns.create({
				name,
				searchTerm,
				regionId,
				cellSize: hasExistingCells ? undefined : Number(cellSize),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["campaigns"] });
			toast.success("Campaign created");
			router.push("/dashboard/campaigns");
		},
		onError: (err) => toast.error(err.message || "Failed to create campaign"),
	});

	return (
		<form
			className="grid max-w-lg gap-4"
			onSubmit={(e) => {
				e.preventDefault();
				if (name && searchTerm && regionId) {
					mutation.mutate();
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
					placeholder="HVAC contractors"
					required
					value={searchTerm}
				/>
			</div>
			<div className="space-y-1">
				<Label>Country</Label>
				<Select
					onValueChange={(v) => {
						setCountryId(v);
						setRegionId("");
					}}
					value={countryId}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select country" />
					</SelectTrigger>
					<SelectContent>
						{countries?.map((c: { id: string; name: string; code: string }) => (
							<SelectItem key={c.id} value={c.id}>
								{c.name} ({c.code})
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			{countryId && (
				<div className="space-y-1">
					<Label>Region</Label>
					<Select onValueChange={setRegionId} value={regionId}>
						<SelectTrigger>
							<SelectValue placeholder="Select region" />
						</SelectTrigger>
						<SelectContent>
							{regions?.map((r: { id: string; name: string; code: string }) => (
								<SelectItem key={r.id} value={r.id}>
									{r.name} ({r.code})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}
			{selectedRegion && (
				<div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
					{hasExistingCells ? (
						<>
							<p className="font-medium text-green-700">
								✓ Using existing{" "}
								{(selectedRegion as { _count?: { cells: number } })._count
									?.cells ?? 0}{" "}
								grid cells
							</p>
							<p className="text-muted-foreground text-xs">
								Cell size: {selectedRegion.cellSize}° — Discovery runs will be
								created for this campaign using the existing grid.
							</p>
						</>
					) : (
						<>
							<p className="font-medium text-amber-700">
								⚠ No grid cells generated for this region yet
							</p>
							<div className="space-y-1">
								<Label className="text-xs">Cell Size (degrees)</Label>
								<Select onValueChange={setCellSize} value={cellSize}>
									<SelectTrigger className="h-8">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="0.25">
											0.25° (Fine — more cells, slower)
										</SelectItem>
										<SelectItem value="0.5">0.5° (Default)</SelectItem>
										<SelectItem value="1.0">
											1.0° (Coarse — fewer cells, faster)
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<p className="text-muted-foreground text-xs">
								Cells will be auto-generated on campaign creation.
							</p>
						</>
					)}
				</div>
			)}
			<Button
				disabled={mutation.isPending || !name || !searchTerm || !regionId}
				type="submit"
			>
				{mutation.isPending ? "Creating..." : "Create Campaign"}
			</Button>
		</form>
	);
}
