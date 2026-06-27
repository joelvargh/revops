import { render } from "react-email";
import { Resend } from "resend";

import { OtpEmail } from "./templates/otp";

export type { OtpEmailProps } from "./templates/otp";

let resendClient: Resend | null = null;

function getResend() {
	if (!resendClient) {
		resendClient = new Resend(process.env.RESEND_API_KEY);
	}
	return resendClient;
}

function getFrom() {
	return process.env.MAIL_FROM ?? "RevOps <revops@email.galaxylabs.co.in>";
}

export async function sendOtpEmail(email: string, otp: string) {
	console.log(`[Mail] Sending OTP to ${email}`);
	const html = await render(OtpEmail({ otp }));
	const { data, error } = await getResend().emails.send({
		from: getFrom(),
		to: email,
		subject: `Your sign-in code: ${otp}`,
		html,
	});
	if (error) {
		console.error("[Mail] Resend error:", error);
		throw new Error(`Failed to send OTP email: ${error.message}`);
	}
	console.log("[Mail] Sent OK:", data);
}

export async function sendEmail(opts: {
	to: string;
	subject: string;
	html: string;
}) {
	const { error } = await getResend().emails.send({ from: getFrom(), ...opts });
	if (error) {
		throw new Error(`Failed to send email: ${error.message}`);
	}
}
