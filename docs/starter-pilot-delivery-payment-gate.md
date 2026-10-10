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

## Frozen Starter pilot v0.1

### Included
- One web or email intake source feeding one isolated customer workspace.
- Up to three agreed routing categories.
- Unique, server-issued reference for every saved request.
- One review queue for the customer's nominated users; no autonomous outbound reply.
- Written setup record, test evidence and handover.
- A seven-calendar-day defect correction window for the agreed acceptance tests; new scope is excluded.

### Excluded
Phone answering, calendar booking, CRM/ERP integration, migration of historic data, marketing campaigns, autonomous customer replies, custom dashboards, regulatory advice and ongoing support beyond the written defect window.

### Acceptance criteria
1. A valid synthetic request is stored once and returns one unique server reference.
2. Repeating the identical request ID and payload does not create a second record; reusing that ID with changed content is rejected.
3. Invalid email, missing consent and unauthorized queue access are rejected without persistence.
4. Two concurrent synthetic requests receive different server references.
5. Each pilot tenant can read only its own test records; cross-tenant access tests return no data.
6. Agreed category routing matches the written test matrix.
7. Backup and restore, retention and deletion steps are documented and demonstrated with synthetic data.
8. Customer confirms the written acceptance record; payment status is tracked separately from delivery acceptance.

### Unit economics gate at NOK 2,990
This is a planning model, not an assertion of actual cost or profit. VAT treatment must be confirmed for the issued quote and invoice.

| Cost line | Pilot cap | Evidence required |
| --- | ---: | --- |
| Owner delivery time | 4.0 h × NOK 500 = NOK 2,000 | Start/stop time log by task |
| Payment processing | NOK 100 | Actual processor fee or invoice method |
| Hosting/API allocation | NOK 150 | Railway, AI and email usage attributed to pilot |
| Rework/incident reserve | NOK 100 | Used amount reconciled at acceptance |
| **Total modelled delivery cost** | **NOK 2,350** | Actuals replace caps after delivery |
| **Modelled contribution** | **NOK 640 (21.4%)** | NOK 2,990 less actual delivery cost |

Go/no-go: do not quote the fixed price if credible delivery effort exceeds four hours or expected variable cash cost exceeds NOK 350. Re-scope first; discounts and scope expansion require owner approval. Fixed business overhead and tax are reported separately, so this contribution is not the owner's personal profit.

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
