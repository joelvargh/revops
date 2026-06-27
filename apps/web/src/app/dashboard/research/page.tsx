export const dynamic = "force-dynamic";

import { ResearchQueue } from "./research-queue";

export default function ResearchPage() {
	return (
		<div className="flex flex-col gap-4 p-4 md:p-6">
			<div>
				<h1 className="font-semibold text-2xl">Manual Research</h1>
				<p className="text-muted-foreground text-sm">
					Companies where both Sonar and Apollo couldn't find data. Manually
					fill in employee count and revenue.
				</p>
			</div>
			<ResearchQueue />
		</div>
	);
}
