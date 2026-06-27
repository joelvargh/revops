"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { client, orpc } from "@/lib/orpc";

export function GeographyPanel() {
	const queryClient = useQueryClient();
	const { data: countries, isLoading } = useQuery(
		orpc.geography.countries.list.queryOptions()
	);

	const [newCountry, setNewCountry] = useState({ name: "", code: "" });

	const createCountry = useMutation({
		mutationFn: () => client.geography.countries.create(newCountry),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: orpc.geography.key() });
			toast.success("Country created");
			setNewCountry({ name: "", code: "" });
		},
		onError: () => toast.error("Failed to create country"),
	});

	const deleteCountry = useMutation({
		mutationFn: (countryId: string) =>
			client.geography.countries.delete({ countryId }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: orpc.geography.key() });
			toast.success("Country deleted");
		},
		onError: () => toast.error("Failed to delete country"),
	});

	if (isLoading) {
		return <p className="text-muted-foreground">Loading...</p>;
	}

	return (
		<div className="grid gap-6">
			<Card>
				<CardHeader>
					<CardTitle>Add Country</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						className="flex gap-2"
						onSubmit={(e) => {
							e.preventDefault();
							createCountry.mutate();
						}}
					>
						<Input
							onChange={(e) =>
								setNewCountry({ ...newCountry, name: e.target.value })
							}
							placeholder="Country name"
							required
							value={newCountry.name}
						/>
						<Input
							className="w-24"
							onChange={(e) =>
								setNewCountry({ ...newCountry, code: e.target.value })
							}
							placeholder="ISO code"
							required
							value={newCountry.code}
						/>
						<Button disabled={createCountry.isPending} type="submit">
							Add
						</Button>
					</form>
				</CardContent>
			</Card>

			{countries?.map((country) => (
				<CountryCard
					country={country}
					key={country.id}
					onDelete={() => deleteCountry.mutate(country.id)}
				/>
			))}
		</div>
	);
}

function CountryCard({
	country,
	onDelete,
}: {
	country: {
		id: string;
		name: string;
		code: string;
		_count: { regions: number };
	};
	onDelete: () => void;
}) {
	const queryClient = useQueryClient();
	const { data: regions } = useQuery(
		orpc.geography.regions.list.queryOptions({
			input: { countryId: country.id },
		})
	);

	const [newRegion, setNewRegion] = useState({
		name: "",
		code: "",
		bboxSouth: "",
		bboxWest: "",
		bboxNorth: "",
		bboxEast: "",
		cellSize: "0.1",
	});

	const createRegion = useMutation({
		mutationFn: () =>
			client.geography.regions.create({
				countryId: country.id,
				name: newRegion.name,
				code: newRegion.code,
				bboxSouth: Number(newRegion.bboxSouth),
				bboxWest: Number(newRegion.bboxWest),
				bboxNorth: Number(newRegion.bboxNorth),
				bboxEast: Number(newRegion.bboxEast),
				cellSize: Number(newRegion.cellSize),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: orpc.geography.key() });
			toast.success("Region created");
			setNewRegion({
				name: "",
				code: "",
				bboxSouth: "",
				bboxWest: "",
				bboxNorth: "",
				bboxEast: "",
				cellSize: "0.1",
			});
		},
		onError: () => toast.error("Failed to create region"),
	});

	const deleteRegion = useMutation({
		mutationFn: (regionId: string) =>
			client.geography.regions.delete({ regionId }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: orpc.geography.key() });
			toast.success("Region deleted");
		},
		onError: () => toast.error("Failed to delete region"),
	});

	const generateCells = useMutation({
		mutationFn: ({ regionId, cellSize }: { regionId: string; cellSize?: number }) =>
			client.geography.regions.generateCells({ regionId, cellSize }),
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: orpc.geography.key() });
			toast.success(`Generated ${data.cellCount} cells`);
		},
		onError: () => toast.error("Failed to generate cells"),
	});

	const [regenCellSize, setRegenCellSize] = useState<Record<string, string>>({});

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						{country.name} <Badge variant="secondary">{country.code}</Badge>
					</CardTitle>
					<Button onClick={onDelete} size="sm" variant="destructive">
						Delete
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{regions?.map((r) => (
					<div
						className="flex items-center justify-between rounded border p-3"
						key={r.id}
					>
						<div className="text-sm">
							<p className="font-medium">
								{r.name} ({r.code})
							</p>
							<p className="text-muted-foreground text-xs">
								Bbox: S{r.bboxSouth} W{r.bboxWest} N{r.bboxNorth} E{r.bboxEast}{" "}
								| Cell size: {r.cellSize}
							</p>
							<p className="text-xs">
								{r.cellsGenerated ? (
									<Badge variant="secondary">{r._count.cells} cells</Badge>
								) : (
									<Badge variant="outline">No cells</Badge>
								)}
							</p>
						</div>
						<div className="flex items-center gap-1">
							{r.cellsGenerated ? (
								<>
									<Select
										value={regenCellSize[r.id] || String(r.cellSize)}
										onValueChange={(v) => setRegenCellSize({ ...regenCellSize, [r.id]: v })}
									>
										<SelectTrigger className="h-8 w-20 text-xs">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="0.1">0.1°</SelectItem>
											<SelectItem value="0.25">0.25°</SelectItem>
											<SelectItem value="0.5">0.5°</SelectItem>
											<SelectItem value="1">1.0°</SelectItem>
										</SelectContent>
									</Select>
									<Button
										disabled={generateCells.isPending}
										onClick={() => generateCells.mutate({ regionId: r.id, cellSize: Number(regenCellSize[r.id] || r.cellSize) })}
										size="sm"
										variant="outline"
									>
										Regenerate Cells
									</Button>
								</>
							) : (
								<Button
									disabled={generateCells.isPending}
									onClick={() => generateCells.mutate({ regionId: r.id })}
									size="sm"
									variant="outline"
								>
									Generate Cells
								</Button>
							)}
							<Button
								onClick={() => deleteRegion.mutate(r.id)}
								size="sm"
								variant="destructive"
							>
								Delete
							</Button>
						</div>
					</div>
				))}

				<form
					className="grid grid-cols-4 gap-2"
					onSubmit={(e) => {
						e.preventDefault();
						createRegion.mutate();
					}}
				>
					<div className="col-span-2 space-y-1">
						<Label className="text-xs">Name</Label>
						<Input
							onChange={(e) =>
								setNewRegion({ ...newRegion, name: e.target.value })
							}
							placeholder="Region name"
							required
							value={newRegion.name}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">Code</Label>
						<Input
							onChange={(e) =>
								setNewRegion({ ...newRegion, code: e.target.value })
							}
							placeholder="Code"
							required
							value={newRegion.code}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">Cell Size</Label>
						<Input
							onChange={(e) =>
								setNewRegion({ ...newRegion, cellSize: e.target.value })
							}
							required
							step="0.01"
							type="number"
							value={newRegion.cellSize}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">South</Label>
						<Input
							onChange={(e) =>
								setNewRegion({ ...newRegion, bboxSouth: e.target.value })
							}
							required
							step="any"
							type="number"
							value={newRegion.bboxSouth}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">West</Label>
						<Input
							onChange={(e) =>
								setNewRegion({ ...newRegion, bboxWest: e.target.value })
							}
							required
							step="any"
							type="number"
							value={newRegion.bboxWest}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">North</Label>
						<Input
							onChange={(e) =>
								setNewRegion({ ...newRegion, bboxNorth: e.target.value })
							}
							required
							step="any"
							type="number"
							value={newRegion.bboxNorth}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">East</Label>
						<Input
							onChange={(e) =>
								setNewRegion({ ...newRegion, bboxEast: e.target.value })
							}
							required
							step="any"
							type="number"
							value={newRegion.bboxEast}
						/>
					</div>
					<div className="col-span-4">
						<Button disabled={createRegion.isPending} size="sm" type="submit">
							Add Region
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
