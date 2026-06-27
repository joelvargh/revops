import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "@revops/api/routers/index";

declare global {
  // biome-ignore lint/style/noVar: needed for globalThis
  var $client: AppRouterClient | undefined;
}

const link = new RPCLink({
  url: () => {
    if (typeof window === "undefined") {
      throw new Error("RPCLink is not allowed on the server side.");
    }
    return `${window.location.origin}/api/rpc`;
  },
  fetch(url, options) {
    return fetch(url, { ...options, credentials: "include" });
  },
});

export const client: AppRouterClient = globalThis.$client ?? createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
