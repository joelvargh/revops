export const dynamic = "force-dynamic";

import { Dashboard } from "./dashboard";

export default function DashboardPage() {
	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<div>
				<h1 className="font-semibold text-2xl">Pipeline Overview</h1>
				<p className="text-muted-foreground text-sm">
					Real-time status of your lead discovery pipeline.
				</p>
			</div>
			<Dashboard />
		</div>
	);
}
