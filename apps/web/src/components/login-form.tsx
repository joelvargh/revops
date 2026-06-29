"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function LoginForm({
	className,
	...props
}: React.ComponentPropsWithoutRef<"div">) {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState("");
	const [step, setStep] = useState<"email" | "otp">("email");
	const [loading, setLoading] = useState(false);

	async function handleSendOTP(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		const { error } = await authClient.emailOtp.sendVerificationOtp({
			email,
			type: "sign-in",
		});
		setLoading(false);
		if (error) {
			toast.error(
				error.message ?? "Failed to send code. Is this email registered?"
			);
			return;
		}
		toast.success("Code sent to your email");
		setStep("otp");
	}

	async function handleVerifyOTP(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		const { error } = await authClient.signIn.emailOtp({
			email,
			otp,
		});
		setLoading(false);
		if (error) {
			toast.error(error.message ?? "Invalid code. Please try again.");
			return;
		}
		toast.success("Signed in");
		router.push("/");
		router.refresh();
	}

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-xl">Welcome back</CardTitle>
					<CardDescription>
						{step === "email"
							? "Enter your email to receive a sign-in code"
							: `Enter the 6-digit code sent to ${email}`}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{step === "email" ? (
						<form onSubmit={handleSendOTP}>
							<div className="grid gap-6">
								<div className="grid gap-2">
									<Label htmlFor="email">Email</Label>
									<Input
										autoFocus
										id="email"
										onChange={(e) => setEmail(e.target.value)}
										placeholder="you@company.com"
										required
										type="email"
										value={email}
									/>
								</div>
								<Button className="w-full" disabled={loading} type="submit">
									{loading ? "Sending..." : "Send sign-in code"}
								</Button>
							</div>
						</form>
					) : (
						<form onSubmit={handleVerifyOTP}>
							<div className="grid gap-6">
								<div className="grid gap-2">
									<Label htmlFor="otp">Verification code</Label>
									<Input
										autoFocus
										className="text-center font-mono text-2xl tracking-[0.5em]"
										id="otp"
										inputMode="numeric"
										maxLength={6}
										onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
										pattern="[0-9]*"
										placeholder="000000"
										required
										type="text"
										value={otp}
									/>
									<p className="text-center text-muted-foreground text-xs">
										Code expires in 5 minutes
									</p>
								</div>
								<Button
									className="w-full"
									disabled={loading || otp.length !== 6}
									type="submit"
								>
									{loading ? "Verifying..." : "Verify & sign in"}
								</Button>
								<Button
									className="w-full text-sm"
									onClick={() => {
										setStep("email");
										setOtp("");
									}}
									type="button"
									variant="ghost"
								>
									Use a different email
								</Button>
							</div>
						</form>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
