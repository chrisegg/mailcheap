import assert from "node:assert/strict";
import { test } from "node:test";
import { getAllowedFromDomains, resolveMailTransport } from "../lib/mail-transport.js";
import { getSendErrorAction } from "../lib/sending-rules.js";

test("MAIL_TRANSPORT wins when set", () => {
	assert.equal(resolveMailTransport({ MAIL_TRANSPORT: "ses", SMTP_HOST: "smtp.example.com" }), "ses");
	assert.equal(resolveMailTransport({ MAIL_TRANSPORT: "smtp", SES_ACCESS_KEY_ID: "AKIA" }), "smtp");
});

test("SMTP_HOST selects smtp when MAIL_TRANSPORT is unset", () => {
	assert.equal(resolveMailTransport({ SMTP_HOST: "smtp.brevo.com" }), "smtp");
});

test("SES_* selects ses when SMTP is unset", () => {
	assert.equal(resolveMailTransport({ SES_CONFIGURATION_SET: "mailcheap" }), "ses");
	assert.equal(resolveMailTransport({ SES_ACCESS_KEY_ID: "AKIA" }), "ses");
});

test("defaults to smtp when nothing mail-related is set", () => {
	assert.equal(resolveMailTransport({}), "smtp");
});

test("MAIL_FROM_DOMAINS parses a comma-separated list", () => {
	assert.deepEqual(getAllowedFromDomains({ MAIL_FROM_DOMAINS: " Mail.Example.com, news.example.org " }), [
		"mail.example.com",
		"news.example.org",
	]);
	assert.deepEqual(getAllowedFromDomains({ SMTP_FROM_DOMAINS: "a.example" }), ["a.example"]);
});

test("SMTP auth and rate-limit errors pause or retry", () => {
	assert.equal(getSendErrorAction({ code: "EAUTH", message: "Invalid login" }), "pause");
	assert.equal(getSendErrorAction({ code: "ETIMEDOUT", message: "Timeout" }), "retry");
	assert.equal(getSendErrorAction(new Error("421 Too many connections")), "retry");
	assert.equal(getSendErrorAction(new Error("535 Authentication failed")), "pause");
});
