import { CreateCampaignForm } from "./create-form";

export default function CreateCampaignPage() {
	return (
		<div className="flex flex-col gap-4 p-4 md:p-6">
			<div>
				<h1 className="font-semibold text-2xl">Create Campaign</h1>
				<p className="text-muted-foreground text-sm">
					Set up a new discovery campaign.
				</p>
			</div>
			<CreateCampaignForm />
		</div>
	);
}
