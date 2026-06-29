"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { client, orpc } from "@/lib/orpc";

export function EditCampaignForm() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [name, setName] = useState("");

	const { data: campaigns } = useQuery(orpc.campaigns.list.queryOptions({}));
	const campaign = campaigns?.find((c) => c.id === id);

	useEffect(() => {
		if (campaign) {
			setName(campaign.name);
		}
	}, [campaign]);

	const mutation = useMutation({
		mutationFn: () => client.campaigns.update({ campaignId: id, name }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: orpc.campaigns.key() });
			router.push(`/dashboard/campaigns/${id}`);
		},
	});

	if (!campaigns) {
		return <p className="text-muted-foreground">Loading...</p>;
	}
	if (!campaign) {
		return <p className="text-muted-foreground">Campaign not found.</p>;
	}

	return (
		<form
			className="grid max-w-lg gap-4"
			onSubmit={(e) => {
				e.preventDefault();
				if (name) {
					mutation.mutate();
				}
			}}
		>
			<div className="space-y-1">
				<Label>Campaign Name</Label>
				<Input
					onChange={(e) => setName(e.target.value)}
					required
					value={name}
				/>
			</div>
			<Button disabled={mutation.isPending} type="submit">
				{mutation.isPending ? "Saving..." : "Save Changes"}
			</Button>
		</form>
	);
}
