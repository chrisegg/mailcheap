import "server-only";
import {
	getAllowedFromDomains,
	isSesConfigured,
	isSmtpConfigured,
	resolveMailTransport,
} from "@/lib/mail-transport";
import { getSesAccount, listSesDomains, sendSesEmail } from "@/lib/ses";
import { getSmtpStatus, listSmtpDomains, sendSmtpEmail } from "@/lib/smtp";

export { getAllowedFromDomains, resolveMailTransport } from "@/lib/mail-transport";

export function getMailTransport() {
	return resolveMailTransport();
}

export async function sendEmail(options) {
	const transport = resolveMailTransport();
	if (transport === "ses") {
		const { sesMessageId } = await sendSesEmail(options);
		return { messageId: sesMessageId, transport };
	}
	const { messageId } = await sendSmtpEmail(options);
	return { messageId, transport };
}

export function listMailDomains(options) {
	const transport = resolveMailTransport();
	if (transport === "ses") return listSesDomains(options);
	return listSmtpDomains();
}

export async function getMailAccount({ fresh = false } = {}) {
	const transport = resolveMailTransport();
	if (transport === "ses") {
		const account = await getSesAccount({ fresh });
		return { transport, ...account };
	}

	const smtp = getSmtpStatus();
	if (!smtp.configured) {
		return {
			transport,
			configured: false,
			error: smtp.error,
			productionAccess: false,
			sendingEnabled: false,
			max24HourSend: 0,
			maxSendRate: 0,
			sentLast24Hours: 0,
			enforcementStatus: null,
			reviewStatus: null,
			host: null,
			port: null,
			fromDomains: smtp.fromDomains,
		};
	}

	return {
		transport,
		configured: true,
		error: null,
		productionAccess: true,
		sendingEnabled: true,
		max24HourSend: 0,
		maxSendRate: Number.parseInt(process.env.SEND_RATE_PER_SECOND || "10", 10) || 10,
		sentLast24Hours: 0,
		enforcementStatus: "HEALTHY",
		reviewStatus: null,
		host: smtp.host,
		port: smtp.port,
		secure: smtp.secure,
		user: smtp.user,
		fromDomains: smtp.fromDomains,
	};
}

export function getMailSetupHint(env = process.env) {
	const transport = resolveMailTransport(env);
	if (transport === "smtp") {
		if (!isSmtpConfigured(env)) {
			return "Set SMTP_HOST (and usually SMTP_USER / SMTP_PASS), then SENDING_ENABLED=true.";
		}
		return null;
	}
	if (!isSesConfigured(env)) {
		return "Set SES_ACCESS_KEY_ID and SES_SECRET_ACCESS_KEY, or switch to MAIL_TRANSPORT=smtp.";
	}
	return null;
}
