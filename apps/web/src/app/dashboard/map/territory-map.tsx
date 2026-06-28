"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Layers } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import {
	Layer,
	Map as MapGL,
	type MapRef,
	Popup,
	Source,
} from "react-map-gl/maplibre";

import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";

interface CellInfo {
	bboxEast: number;
	bboxNorth: number;
	bboxSouth: number;
	bboxWest: number;
	col: number;
	resultsFound: number;
	resultsNew: number;
	row: number;
	status: string;
}

export function TerritoryMap() {
	const mapRef = useRef<MapRef>(null);
	const [selectedCampaign, setSelectedCampaign] = useState<string>("");
	const [comboboxOpen, setComboboxOpen] = useState(false);
	const [hoverInfo, setHoverInfo] = useState<{
		lng: number;
		lat: number;
		cell: CellInfo;
	} | null>(null);
	const [mode, setMode] = useState<"coverage" | "quality">("coverage");

	const { data: campaigns } = useQuery(orpc.campaigns.list.queryOptions({}));

	const { data: cells } = useQuery(
		orpc.campaigns.gridCells.queryOptions({
			input: { campaignId: selectedCampaign },
			enabled: !!selectedCampaign,
		})
	);

	const { data: heatmapData } = useQuery(
		orpc.campaigns.heatmap.queryOptions({
			input: { campaignId: selectedCampaign },
			enabled: !!selectedCampaign && mode === "quality",
		})
	);

	const geojson = {
		type: "FeatureCollection" as const,
		features: (cells ?? []).map((cell) => ({
			type: "Feature" as const,
			properties: {
				status: cell.status,
				resultsFound: cell.resultsFound,
				row: cell.row,
				col: cell.col,
			},
			geometry: (cell.geometry as {
				type: "Polygon";
				coordinates: number[][][];
			} | null) ?? {
				type: "Polygon" as const,
				coordinates: [
					[
						[cell.bboxWest, cell.bboxSouth],
						[cell.bboxEast, cell.bboxSouth],
						[cell.bboxEast, cell.bboxNorth],
						[cell.bboxWest, cell.bboxNorth],
						[cell.bboxWest, cell.bboxSouth],
					],
				],
			},
		})),
	};

	const heatmapGeojson = {
		type: "FeatureCollection" as const,
		features: (heatmapData ?? []).map((cell) => ({
			type: "Feature" as const,
			properties: {
				avgScore: cell.avgScore,
				count: cell.count,
				row: cell.row,
				col: cell.col,
			},
			geometry: {
				type: "Polygon" as const,
				coordinates: [
					[
						[cell.bboxWest, cell.bboxSouth],
						[cell.bboxEast, cell.bboxSouth],
						[cell.bboxEast, cell.bboxNorth],
						[cell.bboxWest, cell.bboxNorth],
						[cell.bboxWest, cell.bboxSouth],
					],
				],
			},
		})),
	};

	const stats = cells
		? {
				total: cells.length,
				completed: cells.filter((c) => c.status === "COMPLETED").length,
				running: cells.filter((c) => c.status === "RUNNING").length,
				pending: cells.filter((c) => c.status === "PENDING").length,
				failed: cells.filter((c) => c.status === "FAILED").length,
				totalResults: cells.reduce((sum, c) => sum + c.resultsFound, 0),
			}
		: null;

	const onHover = useCallback(
		(e: { features?: unknown[]; lngLat: { lng: number; lat: number } }) => {
			const feature = e.features?.[0] as
				| { properties?: Record<string, unknown> }
				| undefined;
			if (feature?.properties) {
				const props = feature.properties;
				const cell = cells?.find(
					(c) => c.row === props.row && c.col === props.col
				);
				if (cell) {
					setHoverInfo({ lng: e.lngLat.lng, lat: e.lngLat.lat, cell });
					return;
				}
			}
			setHoverInfo(null);
		},
		[cells]
	);

	return (
		<div className="relative h-full w-full overflow-hidden">
			{/* Map */}
			{selectedCampaign ? (
				<MapGL
					initialViewState={{ longitude: -95.4, latitude: 29.8, zoom: 8 }}
					interactiveLayerIds={["cells-fill"]}
					mapStyle="https://tiles.openfreemap.org/styles/liberty"
					onMouseLeave={() => setHoverInfo(null)}
					onMouseMove={onHover}
					ref={mapRef}
					style={{ width: "100%", height: "100%" }}
				>
					<Source
						data={mode === "coverage" ? geojson : heatmapGeojson}
						id="cells"
						type="geojson"
					>
						{/* Fill */}
						<Layer
							id="cells-fill"
							paint={
								mode === "coverage"
									? {
											"fill-color": [
												"match",
												["get", "status"],
												"COMPLETED",
												"#22c55e",
												"RUNNING",
												"#3b82f6",
												"FAILED",
												"#ef4444",
												"#6b7280",
											],
											"fill-opacity": [
												"match",
												["get", "status"],
												"COMPLETED",
												0.25,
												"RUNNING",
												0.4,
												"FAILED",
												0.3,
												0.12,
											],
										}
									: {
											"fill-color": [
												"interpolate",
												["linear"],
												["get", "avgScore"],
												0,
												"#ef4444", // red = low score
												50,
												"#f59e0b", // amber = medium
												70,
												"#22c55e", // green = high
												100,
												"#10b981", // emerald = excellent
											],
											"fill-opacity": 0.4,
										}
							}
							type="fill"
						/>
						{/* Borders */}
						<Layer
							id="cells-border"
							paint={{
								"line-color": [
									"match",
									["get", "status"],
									"COMPLETED",
									"#22c55e",
									"RUNNING",
									"#3b82f6",
									"FAILED",
									"#ef4444",
									"#6b7280",
								],
								"line-width": 1,
								"line-opacity": 0.5,
							}}
							type="line"
						/>
					</Source>

					{/* US State Boundaries */}
					<Source
						data="https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json"
						id="state-boundaries"
						type="geojson"
					>
						<Layer
							id="state-borders"
							paint={{
								"line-color": "#334155",
								"line-width": 1.5,
								"line-opacity": 0.6,
							}}
							type="line"
						/>
						<Layer
							id="state-fill"
							paint={{ "fill-color": "#64748b", "fill-opacity": 0.03 }}
							type="fill"
						/>
					</Source>

					{/* Hover popup */}
					{hoverInfo && (
						<Popup
							anchor="bottom"
							closeButton={false}
							latitude={hoverInfo.lat}
							longitude={hoverInfo.lng}
							offset={10}
						>
							<div className="min-w-[120px] space-y-0.5 text-xs">
								<p className="font-semibold">
									Cell ({hoverInfo.cell.row}, {hoverInfo.cell.col})
								</p>
								<p className="text-muted-foreground">{hoverInfo.cell.status}</p>
								{hoverInfo.cell.resultsFound > 0 && (
									<p className="font-medium text-primary">
										{hoverInfo.cell.resultsFound.toLocaleString()} businesses
									</p>
								)}
							</div>
						</Popup>
					)}
				</MapGL>
			) : (
				<div className="flex h-full items-center justify-center bg-muted/30">
					<div className="space-y-3 text-center">
						<Layers className="mx-auto h-12 w-12 text-muted-foreground/50" />
						<p className="text-muted-foreground">
							Select a campaign to view territory coverage
						</p>
					</div>
				</div>
			)}

			{/* Floating controls — top left */}
			<div className="absolute top-4 left-4 z-10 flex gap-2">
				<div className="rounded-lg border bg-background/70 p-2 shadow-lg backdrop-blur-xl">
					<Popover onOpenChange={setComboboxOpen} open={comboboxOpen}>
						<PopoverTrigger asChild>
							<Button
								aria-expanded={comboboxOpen}
								className="h-8 w-[220px] justify-between border-0"
								role="combobox"
								variant="ghost"
							>
								{selectedCampaign
									? campaigns?.find((c) => c.id === selectedCampaign)?.name
									: "Select campaign"}
								<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-[220px] p-0">
							<Command>
								<CommandInput placeholder="Search campaigns..." />
								<CommandList>
									<CommandEmpty>No campaigns found.</CommandEmpty>
									<CommandGroup>
										{campaigns?.map((c) => (
											<CommandItem
												key={c.id}
												onSelect={() => {
													setSelectedCampaign(c.id);
													setComboboxOpen(false);
													const rgn = (
														c as {
															regions?: {
																region: {
																	bboxWest: number;
																	bboxSouth: number;
																	bboxEast: number;
																	bboxNorth: number;
																};
															}[];
														}
													).regions?.[0]?.region;
													if (rgn && mapRef.current) {
														mapRef.current.fitBounds(
															[
																[rgn.bboxWest, rgn.bboxSouth],
																[rgn.bboxEast, rgn.bboxNorth],
															],
															{ padding: 40, duration: 1000 }
														);
													}
												}}
												value={c.name}
											>
												<Check
													className={cn(
														"mr-2 h-4 w-4",
														selectedCampaign === c.id
															? "opacity-100"
															: "opacity-0"
													)}
												/>
												{c.name}
											</CommandItem>
										))}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				</div>
				{selectedCampaign && (
					<div className="flex rounded-lg border bg-background/70 shadow-lg backdrop-blur-xl">
						<Button
							className="h-8 rounded-r-none text-xs"
							onClick={() => setMode("coverage")}
							size="sm"
							variant={mode === "coverage" ? "default" : "ghost"}
						>
							Coverage
						</Button>
						<Button
							className="h-8 rounded-l-none text-xs"
							onClick={() => setMode("quality")}
							size="sm"
							variant={mode === "quality" ? "default" : "ghost"}
						>
							Quality
						</Button>
					</div>
				)}
			</div>

			{/* Floating stats — bottom left */}
			{stats && stats.total > 0 && (
				<div className="absolute bottom-6 left-4 z-10">
					<div className="space-y-2 rounded-lg border bg-background/70 px-4 py-3 shadow-lg backdrop-blur-xl">
						<div className="flex items-center gap-3 text-sm">
							<span className="font-semibold">
								{stats.completed}/{stats.total} cells
							</span>
							<span className="text-muted-foreground">•</span>
							<span className="font-medium text-primary">
								{stats.totalResults.toLocaleString()} leads
							</span>
						</div>
						{/* Progress bar */}
						<div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full transition-all duration-500"
								style={{
									width: `${(stats.completed / stats.total) * 100}%`,
									background: "linear-gradient(90deg, #22c55e, #16a34a)",
								}}
							/>
						</div>
						<p className="text-muted-foreground text-xs">
							{Math.round((stats.completed / stats.total) * 100)}% complete
						</p>
					</div>
				</div>
			)}

			{/* Floating legend — bottom right */}
			{selectedCampaign && (
				<div className="absolute right-4 bottom-6 z-10">
					<div className="rounded-lg border bg-background/70 px-3 py-2 shadow-lg backdrop-blur-xl">
						{mode === "coverage" ? (
							<div className="flex flex-col gap-1.5 text-xs">
								<div className="flex items-center gap-2">
									<span className="h-2.5 w-2.5 rounded-sm bg-green-500" />
									Completed
								</div>
								<div className="flex items-center gap-2">
									<span className="h-2.5 w-2.5 animate-pulse rounded-sm bg-blue-500" />
									Running
								</div>
								<div className="flex items-center gap-2">
									<span className="h-2.5 w-2.5 rounded-sm bg-gray-500" />
									Pending
								</div>
								<div className="flex items-center gap-2">
									<span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
									Failed
								</div>
							</div>
						) : (
							<div className="flex flex-col gap-1.5 text-xs">
								<div className="flex items-center gap-2">
									<span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
									High quality (70+)
								</div>
								<div className="flex items-center gap-2">
									<span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
									Medium (50-69)
								</div>
								<div className="flex items-center gap-2">
									<span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
									Low (&lt;50)
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
