"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<html lang="en">
			<body className="font-sans antialiased">
				<div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8">
					<h1 className="font-bold text-xl">Application Error</h1>
					<p className="max-w-md text-center text-gray-600 text-sm">
						{error.message || "Something went wrong."}
					</p>
					<Button onClick={reset}>Reload</Button>
				</div>
			</body>
		</html>
	);
}
