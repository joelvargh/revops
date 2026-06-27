import { EditCampaignForm } from "./edit-form";

export default function EditCampaignPage() {
	return (
		<div className="flex flex-col gap-4 p-4 md:p-6">
			<div>
				<h1 className="font-semibold text-2xl">Edit Campaign</h1>
				<p className="text-muted-foreground text-sm">Update campaign name.</p>
			</div>
			<EditCampaignForm />
		</div>
	);
}
