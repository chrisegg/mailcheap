import { Types, isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import AvatarNewsletter from "@/components/AvatarNewsletter";
import FormNewsletter from "@/components/FormNewsletter";
import HeaderPage from "@/components/HeaderPage";
import { cleanupTotalsPipeline } from "@/lib/cleanup";
import { isSendingEnabled } from "@/lib/config";
import { connectDb } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { getMailTransport, listMailDomains } from "@/lib/mail";
import Contact from "@/models/Contact";
import Newsletter from "@/models/Newsletter";

export const metadata = { title: "Newsletter" };

export default async function NewsletterPage({ params }) {
	const { id } = await params;
	const isNew = id === "new";
	if (!isNew && !isValidObjectId(id)) notFound();

	await connectDb();
	const [newsletter, domains, cleanupTotals] = await Promise.all([
		isNew ? null : Newsletter.findById(id).lean(),
		listMailDomains(),
		isNew ? null : getCleanupTotals(id),
	]);
	if (!isNew && !newsletter) notFound();

	// SMTP with no MAIL_FROM_DOMAINS: skip the warning (null). SES or an explicit domain list: enforce it.
	const verifiedDomains =
		Array.isArray(domains) && (domains.length > 0 || getMailTransport() === "ses")
			? domains.filter(({ verified }) => verified).map(({ domain }) => domain)
			: null;

	return (
		<>
			<HeaderPage
				title={isNew ? "New newsletter" : newsletter.name}
				backHref="/newsletters"
				icon={newsletter && <AvatarNewsletter newsletter={newsletter} size={32} />}
			/>
			<FormNewsletter
				newsletter={newsletter ? serialize(newsletter) : null}
				verifiedDomains={verifiedDomains}
				isSendingEnabled={isSendingEnabled()}
				testEmail={process.env.ADMIN_EMAIL}
				cleanupTotals={cleanupTotals}
			/>
		</>
	);
}

async function getCleanupTotals(newsletterId) {
	const [totals] = await Contact.aggregate(cleanupTotalsPipeline(new Types.ObjectId(newsletterId)));
	return { waiting: totals?.waiting ?? 0, kept: totals?.kept ?? 0, dormant: totals?.dormant ?? 0 };
}
