import Image from "next/image";

import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
			<div className="flex w-full max-w-sm flex-col gap-6">
				<div className="flex items-center justify-center">
					<Image
						alt="Softnotions"
						height={35}
						priority
						src="/logo.svg"
						width={160}
					/>
				</div>
				<LoginForm />
			</div>
		</div>
	);
}
