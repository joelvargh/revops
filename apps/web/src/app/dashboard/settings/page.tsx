export const dynamic = "force-dynamic";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeographyPanel } from "./geography-panel";
import { SettingsPanel } from "./settings-panel";

export default function SettingsPage() {
	return (
		<div className="flex flex-col gap-4 p-4 md:p-6">
			<div>
				<h1 className="font-semibold text-2xl">Settings</h1>
				<p className="text-muted-foreground text-sm">
					Configure pipeline behavior, ICP rubric, and limits.
				</p>
			</div>
			<Tabs defaultValue="general">
				<TabsList>
					<TabsTrigger value="general">General</TabsTrigger>
					<TabsTrigger value="geography">Geography</TabsTrigger>
				</TabsList>
				<TabsContent value="general">
					<SettingsPanel />
				</TabsContent>
				<TabsContent value="geography">
					<GeographyPanel />
				</TabsContent>
			</Tabs>
		</div>
	);
}
