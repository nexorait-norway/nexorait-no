# Nexorait billing sandbox deployment checklist

Status: NOT DEPLOYED. No customer charges or fulfillment are enabled.

## Railway
- Dedicated service: nexorait-billing-sandbox (separate from nexorait-support).
- GitHub source: nexorait-norway/nexorait-no, branch feature/stripe-billing-foundation.
- Start command: `python -m billing.atomic_receiver`.
- Healthcheck: `/health`.
- Persistent volume: `/data`, database: `BILLING_DB_PATH=/data/billing.sqlite`.
- Required secret: `STRIPE_WEBHOOK_SECRET=whsec_...` obtained from **sandbox** event destination only.
- No public domain or deploy until the secret is set and startup verified.
- Railway environment is named production, but this service must use ONLY Stripe sandbox credentials.

## Stripe
1. Create a test-mode event destination after the isolated service has a public HTTPS endpoint.
2. Subscribe only to the events listed in `billing/webhook_server.py`.
3. Set its signing secret on the isolated Railway service. Never commit secrets.
4. Send sandbox events and check signature failures, retries, duplicate handling, and SQLite persistence.
5. Verify the sender's account/mode before any later entitlement or payment fulfillment integration.

## Before customer payments
- Add authenticated checkout and prices with explicitly approved amounts.
- Add durable processing, replay/reconciliation, refunds and cancellation behavior.
- Complete tax/MVA, terms, invoicing, bookkeeping and production security review.
- Never configure a live Stripe webhook signing secret in the sandbox receiver.
