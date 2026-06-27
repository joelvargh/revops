/** @jsxImportSource react */
import { Section, Text } from "react-email";

import { brand, EmailLayout, styles } from "./_shared";

export interface OtpEmailProps {
	otp: string;
}

export function OtpEmail({ otp }: OtpEmailProps) {
	return (
		<EmailLayout preview={`Your sign-in code: ${otp}`}>
			<Text style={styles.heading}>Sign-In Code</Text>
			<Text style={{ ...styles.paragraph, textAlign: "center" as const }}>
				Use this code to sign in. It expires in 5 minutes.
			</Text>
			<Section
				style={{
					backgroundColor: brand.offWhite,
					borderRadius: "8px",
					border: `2px solid ${brand.orange}`,
					padding: "24px",
					margin: "24px 0",
				}}
			>
				<Text
					style={{
						color: brand.orange,
						fontSize: "36px",
						fontWeight: "700",
						letterSpacing: "8px",
						textAlign: "center" as const,
						margin: "0",
						fontFamily: "monospace",
					}}
				>
					{otp}
				</Text>
			</Section>
			<Text style={styles.helpText}>
				If you didn't request this code, ignore this email.
			</Text>
		</EmailLayout>
	);
}

OtpEmail.PreviewProps = { otp: "847291" } as OtpEmailProps;
export default OtpEmail;
