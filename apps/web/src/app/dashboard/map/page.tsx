export const dynamic = "force-dynamic";

import { TerritoryMap } from "./territory-map";

export default function MapPage() {
	return (
		<div className="flex h-full flex-col">
			<TerritoryMap />
		</div>
	);
}
