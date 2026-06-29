"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { client, orpc } from "@/lib/orpc";

const CATEGORIES = [
	{
		key: "enrichment",
		label: "Enrichment",
		description: "Sonar/Perplexity prompts",
	},
	{
		key: "icp",
		label: "ICP Scoring",
		description: "Thresholds and rubric scores",
	},
	{
		key: "prefilter",
		label: "Pre-Filter",
		description: "Rules to filter companies before scoring",
	},
	{
		key: "discovery",
		label: "Discovery",
		description: "Scraping limits and configuration",
	},
	{
		key: "contacts",
		label: "Contacts",
		description: "Apollo reveals and seniority filters",
	},
];

const TEXTAREA_KEYS = new Set(["sonar_system_prompt", "icp_scoring_weights"]);
const NUMBER_KEYS = new Set([
	"score_green_threshold",
	"score_amber_min",
	"max_cells_per_day",
	"max_reveals_per_day",
]);

export function SettingsPanel() {
	const queryClient = useQueryClient();
	const { data: settings, isLoading } = useQuery(
		orpc.settings.list.queryOptions({})
	);
	const [edits, setEdits] = useState<Record<string, string>>({});

	const updateMutation = useMutation({
		mutationFn: (input: {
			key: string;
			value: string | number | boolean | string[] | Record<string, unknown>;
		}) => client.settings.update(input),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: orpc.settings.key() });
			// Only clear the edit after confirmed success
			setEdits((prev) => {
				const n = { ...prev };
				delete n[variables.key];
				return n;
			});
			toast.success("Setting updated");
		},
		onError: () => toast.error("Failed to save"),
	});

	function handleSave(key: string) {
		const raw = edits[key];
		if (raw === undefined) {
			return;
		}
		let parsed: string | number | boolean | string[] | Record<string, unknown>;
		if (NUMBER_KEYS.has(key)) {
			parsed = Number(raw);
		} else {
			try {
				parsed = JSON.parse(raw) as typeof parsed;
			} catch {
				parsed = raw;
			}
		}
		updateMutation.mutate({ key, value: parsed });
	}

	if (isLoading) {
		return <p className="text-muted-foreground">Loading settings...</p>;
	}
	if (!settings) {
		return <p className="text-destructive">Failed to load settings.</p>;
	}

	const grouped = CATEGORIES.map((cat) => ({
		...cat,
		settings: settings?.filter((s) => s.category === cat.key) ?? [],
	}));

	return (
		<div className="grid gap-6">
			{grouped.map((group) => (
				<Card key={group.key}>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							{group.label}
							<Badge className="text-xs" variant="secondary">
								{group.settings.length}
							</Badge>
						</CardTitle>
						<p className="text-muted-foreground text-sm">{group.description}</p>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{group.settings.map((setting) => {
								const displayValue =
									edits[setting.key] ??
									(typeof setting.value === "string"
										? setting.value
										: JSON.stringify(setting.value, null, 2));
								const isEdited = edits[setting.key] !== undefined;
								const isTextarea = TEXTAREA_KEYS.has(setting.key);
								const isNumber = NUMBER_KEYS.has(setting.key);

								return (
									<div className="flex flex-col gap-1.5" key={setting.key}>
										<div className="flex items-center justify-between">
											<div>
												<Label className="font-medium text-sm">
													{setting.label ?? setting.key}
												</Label>
												<p className="font-mono text-muted-foreground text-xs">
													{setting.key}
												</p>
											</div>
											{isEdited && (
												<Button
													disabled={updateMutation.isPending}
													onClick={() => handleSave(setting.key)}
													size="sm"
													variant="outline"
												>
													<Save className="mr-1 h-3 w-3" /> Save
												</Button>
											)}
										</div>
										{isTextarea ? (
											<textarea
												className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
												onChange={(e) =>
													setEdits({ ...edits, [setting.key]: e.target.value })
												}
												value={displayValue}
											/>
										) : (
											<Input
												className="font-mono text-xs"
												onChange={(e) =>
													setEdits({ ...edits, [setting.key]: e.target.value })
												}
												type={isNumber ? "number" : "text"}
												value={displayValue}
											/>
										)}
									</div>
								);
							})}
							{group.settings.length === 0 && (
								<p className="text-muted-foreground text-sm">
									No settings configured for this category.
								</p>
							)}
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
