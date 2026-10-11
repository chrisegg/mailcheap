import "server-only";
import nodemailer from "nodemailer";
import { isSendingEnabled } from "@/lib/config";
import { getAllowedFromDomains, isSmtpConfigured } from "@/lib/mail-transport";

let transporter;

function readPort(env = process.env) {
	const port = Number.parseInt(env.SMTP_PORT || "587", 10);
	return Number.isInteger(port) && port > 0 ? port : 587;
}

function readSecure(env = process.env, port = readPort(env)) {
	const raw = env.SMTP_SECURE;
	if (raw === "true") return true;
	if (raw === "false") return false;
	return port === 465;
}

export function getSmtpStatus(env = process.env) {
	if (!isSmtpConfigured(env)) {
		return {
			configured: false,
			host: null,
			port: null,
			secure: null,
			user: null,
			fromDomains: getAllowedFromDomains(env),
			error: "SMTP_HOST is not set",
		};
	}
	const port = readPort(env);
	return {
		configured: true,
		host: env.SMTP_HOST,
		port,
		secure: readSecure(env, port),
		user: env.SMTP_USER || null,
		fromDomains: getAllowedFromDomains(env),
		error: null,
	};
}

function getTransporter() {
	if (!isSmtpConfigured()) throw new Error("SMTP is not configured (SMTP_HOST)");
	transporter ??= nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: readPort(),
		secure: readSecure(),
		auth:
			process.env.SMTP_USER || process.env.SMTP_PASS
				? {
						user: process.env.SMTP_USER || "",
						pass: process.env.SMTP_PASS || "",
					}
				: undefined,
		connectionTimeout: 10_000,
		greetingTimeout: 10_000,
		socketTimeout: 30_000,
	});
	return transporter;
}

export function listSmtpDomains() {
	const status = getSmtpStatus();
	if (!status.configured) return { error: status.error };
	// Without MAIL_FROM_DOMAINS we don't invent a domain from the SMTP host (smtp.sendgrid.net ≠ your brand).
	return status.fromDomains.map((domain) => ({
		domain,
		verified: true,
		dkimStatus: "SMTP",
		mailFromDomain: null,
		mailFromStatus: null,
		records: [
			{
				type: "NOTE",
				name: domain,
				value: "Authenticate this domain with your SMTP provider (SPF, DKIM, DMARC). Mailcheap sends through SMTP and does not manage DNS for you.",
			},
		],
	}));
}

export async function sendSmtpEmail({ from, to, replyTo, subject, html, text, headers = {} }) {
	if (!isSendingEnabled()) throw new Error("Sending is off (SENDING_ENABLED is not true)");
	const info = await getTransporter().sendMail({
		from,
		to,
		replyTo: replyTo || undefined,
		subject,
		html,
		text,
		headers,
	});
	return { messageId: info.messageId || null };
}
