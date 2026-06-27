"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8">
          <h1 className="text-xl font-bold">Application Error</h1>
          <p className="text-sm text-gray-600 max-w-md text-center">{error.message || "Something went wrong."}</p>
          <Button onClick={reset}>Reload</Button>
        </div>
      </body>
    </html>
  );
}
