# Nexorait Ticket Engine

Event-driven support ticket backend for Nexorait.

## Purpose

This Worker is intentionally separate from the public website. The website can remain on its existing hosting while this service handles support-case state.

Flow:

1. Microsoft 365 remains the primary inbox for `kontakt@nexorait.no`.
2. Microsoft forwards a copy of inbound mail to the Resend forwarding inbox.
3. Resend emits an `email.received` webhook.
4. This Worker verifies the webhook signature.
5. D1 performs idempotency, thread lookup and atomic ticket-number allocation.
6. New eligible support cases receive `NXR-YYYY-NNNNNN`.
7. When enabled, Resend sends one acknowledgement for a newly created ticket.

## Hard guarantees

- Ticket numbers come from D1, not the model and not `ops/tickets.json`.
- Allocation uses one atomic SQL statement with `RETURNING`.
- A webhook event can only be claimed once.
- Ticket numbers are never recycled. Gaps are allowed if a later write fails.
- Existing tickets are reused when the ticket number is present in the thread or message references match.
- Automated mail, NDR/bounces and internal mail are ignored.
- Obvious new sales inquiries are classified as `SALES` and do not automatically become support tickets.

## Required secrets

The Worker refuses webhook traffic until this is configured:

- `RESEND_WEBHOOK_SECRET`

Automatic acknowledgement additionally requires:

- `RESEND_API_KEY`

Never commit either value to this repository.

## Safe rollout

The committed configuration has:

`AUTO_ACK_ENABLED=false`

This allows deployment and database verification before any customer-facing automatic email is sent.

Enable acknowledgement only after:
1. Worker health succeeds.
2. Resend webhook is registered.
3. Webhook signature verification is confirmed.
4. A controlled inbound test creates exactly one ticket.
5. Resend API key is stored as a Worker secret.

## Health endpoint

`GET /health`

Expected response includes:
- `ok: true`
- `database: "ok"`

## Ticket states

- NEW
- OPEN
- WAITING_CUSTOMER
- WAITING_INTERNAL
- IN_PROGRESS
- RESOLVED
- CLOSED
- SPAM_DUPLICATE
