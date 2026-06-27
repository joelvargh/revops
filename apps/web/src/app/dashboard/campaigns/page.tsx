export const dynamic = "force-dynamic";

import { CampaignsTable } from "./campaigns-table";

export default function CampaignsPage() {
	return (
		<div className="flex flex-col gap-4 p-4 md:p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Campaigns</h1>
					<p className="text-muted-foreground text-sm">
						Create and manage discovery campaigns.
					</p>
				</div>
				<a
					className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
					href="/dashboard/campaigns/create"
				>
					New Campaign
				</a>
			</div>
			<CampaignsTable />
		</div>
	);
}
