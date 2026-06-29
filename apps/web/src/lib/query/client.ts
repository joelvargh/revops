import {
	defaultShouldDehydrateQuery,
	QueryCache,
	QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { serializer } from "./serializer";

export function createQueryClient() {
	return new QueryClient({
		queryCache: new QueryCache({
			onError: (error, query) => {
				if (typeof window !== "undefined") {
					toast.error(`Error: ${error.message}`, {
						action: {
							label: "retry",
							onClick: () => {
								query.invalidate();
							},
						},
					});
				}
			},
		}),
		defaultOptions: {
			queries: {
				queryKeyHashFn(queryKey) {
					const [json, meta] = serializer.serialize(queryKey);
					return JSON.stringify({ json, meta });
				},
				staleTime: 60 * 1000,
			},
			dehydrate: {
				shouldDehydrateQuery: (query) =>
					defaultShouldDehydrateQuery(query) ||
					query.state.status === "pending",
				serializeData(data) {
					const [json, meta] = serializer.serialize(data);
					return { json, meta };
				},
			},
			hydrate: {
				deserializeData(data: unknown) {
					const d = data as {
						json: unknown;
						meta: Parameters<typeof serializer.deserialize>[1];
					};
					return serializer.deserialize(d.json, d.meta);
				},
			},
		},
	});
}
