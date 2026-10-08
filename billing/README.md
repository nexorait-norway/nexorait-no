# Nexorait billing integration

Status: design-only, not deployed. The production support service is separate and must remain untouched until its bootstrap source is reviewed.

## Live Stripe catalogue

- Setup and integration: `prod_VPElRpJ73aI2ED` (inactive, no price)
- Operations and support: `prod_VPElvsSICNv6cp` (inactive, no price)

Do not create customer-facing payment links or activate live prices until contractual scope, VAT status and refund/cancellation terms have been verified.

## Implementation checklist

1. Introduce a separately deployable billing service, with Stripe secret key and webhook signing secret stored only in Railway environment variables. Never commit secrets or customer financial data.
2. Receive raw Stripe webhook request bytes and verify the `Stripe-Signature` header with the endpoint-specific webhook signing secret before parsing JSON.
3. Persist Stripe event IDs with a UNIQUE constraint; process each event idempotently in a transaction. Handle duplicate delivery and out-of-order events by fetching current Stripe object state where necessary.
4. Handle `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `charge.refunded` and `charge.dispute.created`. A successful checkout session alone must not imply settlement for asynchronous payment methods.
5. Map Stripe customer and subscription IDs to internal tenant IDs. Enforce tenant isolation and authorization for all invoice/checkout endpoints.
6. Use deterministic idempotency keys for all Stripe write requests, and keep audit logs with no personal payment details.
7. Implement invoice numbering, credit notes, cancellation/refund workflow, reconciliation and Norwegian bookkeeping integration; verify legal invoicing requirements and MVA status before issuing invoices.
8. Test all flows in Stripe sandbox, including retries, duplicates, malformed signatures, late invoices, failed payments, cancellation and refunds.
9. Deploy behind an internal-only configuration flag. Conduct a separate production-readiness review before enabling customer billing.

## Infrastructure discovery (2026-10-09)

Railway production service `nexorait-support` runs `python:3.12-slim` using bootstrap source stored in Railway variables, and has persistent `/data` storage. It does not currently list Stripe environment variables. This repo must not be assumed to be the deployed support backend.
