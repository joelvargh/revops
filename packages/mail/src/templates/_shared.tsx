/** @jsxImportSource react */
import type { ReactNode } from "react";
import {
	Body,
	Container,
	Head,
	Hr,
	Html,
	Preview,
	Section,
	Text,
} from "react-email";

export const brand = {
	orange: "#E8630A",
	dark: "#1a1a2e",
	white: "#ffffff",
	offWhite: "#f8fafb",
	gray: "#6b7280",
	muted: "#9ca3af",
	border: "#e5e7eb",
} as const;

export const styles = {
	main: {
		backgroundColor: brand.offWhite,
		fontFamily: '"Inter", system-ui, sans-serif',
	},
	container: {
		backgroundColor: brand.white,
		margin: "0 auto",
		padding: "0",
		marginTop: "16px",
		marginBottom: "16px",
		borderRadius: "12px",
		maxWidth: "480px",
		width: "100%",
		boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
		overflow: "hidden" as const,
	},
	header: {
		backgroundColor: brand.dark,
		padding: "20px",
		textAlign: "center" as const,
	},
	headerText: {
		color: brand.orange,
		fontSize: "18px",
		fontWeight: "700" as const,
		margin: "0",
	},
	box: { padding: "0 24px" },
	hr: { borderColor: brand.border, margin: "20px 0" },
	heading: {
		color: brand.dark,
		fontSize: "20px",
		fontWeight: "700" as const,
		textAlign: "center" as const,
		margin: "24px 0 8px",
	},
	paragraph: {
		color: brand.gray,
		fontSize: "14px",
		lineHeight: "24px",
		margin: "12px 0",
	},
	footer: {
		color: brand.muted,
		fontSize: "12px",
		textAlign: "center" as const,
		margin: "24px 0 0",
	},
	helpText: {
		color: brand.muted,
		fontSize: "12px",
		textAlign: "center" as const,
		margin: "8px 0",
	},
} as const;

export function EmailLayout({
	preview,
	children,
}: {
	preview: string;
	children: ReactNode;
}) {
	return (
		<Html lang="en">
			<Head />
			<Body style={styles.main}>
				<Preview>{preview}</Preview>
				<Container style={styles.container}>
					<Section style={styles.header}>
						<Text style={styles.headerText}>softnotions</Text>
					</Section>
					<Section style={styles.box}>
						{children}
						<Hr style={styles.hr} />
						<Text style={styles.footer}>Softnotions Technologies</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}
