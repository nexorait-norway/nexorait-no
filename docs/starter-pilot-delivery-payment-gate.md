# Nexorait Starter Pilot — internal delivery and payment gate
Status: DRAFT / NOT FOR CUSTOMER SALE until tests and owner approval
Date: 2026-10-10

## Customer outcome
A small service business can submit a request through a controlled intake channel, receive a unique reference, and have the request classified into a small number of agreed categories for written human review and follow-up.

## Indicative offer (not a live offer)
- Pilot price target: NOK 2,990, subject to scope, cost and VAT review.
- One intake source and up to three categories.
- Human review before outbound messages.
- One written handover and short written support period to be specified before quotation.
- No promise of phone answering, AI autonomous replies, bookings, CRM integration, or guaranteed results.
- Existing website contact form and Railway intake do NOT by themselves prove multi-customer isolation or a ready-to-sell product.

## Required before quoting
1. Verify the Railway intake service's persistent storage, authentication, access controls, per-customer isolation, request ID idempotency, unique references and support ticket IDs.
2. Test all cases with synthetic data only: normal submission, invalid email, missing consent, duplicate retry, network timeout, concurrent submissions, unauthorized access, error recovery, and category routing.
3. Document data processing roles, retention, deletion, subprocessors, access controls and applicable GDPR agreements.
4. Calculate service delivery time, API/hosting cost, support load and margin; determine correct Norwegian invoicing and VAT treatment.
5. Write exact deliverables, exclusions, acceptance criteria, customer prerequisites, timeline and written cancellation/refund terms.
6. Get explicit owner approval for binding customer offer and any live financial actions.

## Payment approach
- Use Stripe sandbox for checkout/invoice testing; do not send a live link until service QA and approved quote.
- For early custom B2B projects prefer an individually reviewed invoice or payment link, not an unqualified public 'Buy now' button.
- Do not create live subscriptions automatically. Require explicit owner approval for price, terms and customer before activation.
- Verify payment status server-side, deduplicate webhook event IDs, and reconcile refunds/failures.
- A successful payment does not prove delivery; record a separate acceptance/handover.

## Deployment and website
- Norwegian production site is deployed from gh-pages; main/public is separately used by Cloudflare. Avoid publishing untested translations or changing DNS/email.
- The English landing page is currently on feature/nexorait-english-site-20261010 and is not a confirmed live deployment.

## Progress ledger
- Stripe live account verified 2026-10-10: charges_enabled=true, payouts_enabled=true, card_payments=active, no currently_due requirements. This is NOT proof that customer checkout or invoicing flow has been tested.
- Live PaymentIntents list was empty at check time.
- No customer payments, customer commitments or production code changes performed by this document.
