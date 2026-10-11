export const MAIL_TRANSPORTS = ["smtp", "ses"];

// Prefer an explicit MAIL_TRANSPORT. Otherwise SMTP wins when a host is set (the easier path),
// then SES when IAM keys or a region+configuration set are present.
export function resolveMailTransport(env = process.env) {
	const explicit = String(env.MAIL_TRANSPORT || "")
		.trim()
		.toLowerCase();
	if (MAIL_TRANSPORTS.includes(explicit)) return explicit;
	if (env.SMTP_HOST) return "smtp";
	if (env.SES_ACCESS_KEY_ID || env.SES_CONFIGURATION_SET || env.SES_SNS_TOPIC_ARN) return "ses";
	return "smtp";
}

export function isSmtpConfigured(env = process.env) {
	return Boolean(env.SMTP_HOST);
}

export function isSesConfigured(env = process.env) {
	return Boolean(env.SES_ACCESS_KEY_ID && env.SES_SECRET_ACCESS_KEY);
}

// Domains you may send from without talking to SES. Comma-separated, e.g. mail.example.com,news.example.com.
export function getAllowedFromDomains(env = process.env) {
	const raw = env.MAIL_FROM_DOMAINS || env.SMTP_FROM_DOMAINS || "";
	return raw
		.split(",")
		.map((part) => part.trim().toLowerCase())
		.filter(Boolean);
}
