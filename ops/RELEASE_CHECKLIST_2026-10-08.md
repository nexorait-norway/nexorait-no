# Nexorait release checklist (2026-10-08)

## Verified
- Railway `nexorait-support` production deployment SUCCESS, one running replica, persistent volume `/data`, no active alerts at check.
- GitHub Actions `Contact intake tests` run 37745602085 passed on PR #7.
- `contact.js` on main POSTs to form action, requires `saved === true`, and displays `ticket_id` when returned. Request IDs are reused on retry with unchanged data.
- Historical Railway HTTP logs show successful POST `/api/inquiries` (201), operations GET (200) and expected unauthorized responses (401/403).

## NOT verified / release blockers
- Live end-to-end submission through public site, durable uniqueness after restart/concurrent requests, and automatic customer confirmation email are not yet verified. Do not claim customer onboarding is production-ready.
- Three Cloudflare Workers integrations (`nexorait-no`, `nexorait-live`, `nexorait-site`) are all building this repository PR and reporting failures. Determine which project (if any) is production and inspect Cloudflare build logs before disconnecting or deleting any integration.
- Confirm actual authoritative DNS and DMARC `rua` destination before changing DMARC aggregate report routing. Keep DMARC policy intact.
- Railway Python app is bootstrapped from encoded environment variables, not a version-controlled source deployment. Plan a rollback-tested migration separately.

## Safe next steps
1. Inspect Cloudflare logs for all three projects; keep one intended deployment target and disable redundant GitHub builds only after verifying domain routing.
2. Perform controlled intake test with a designated internal test address and confirm record + response email in actual mailbox; do not use customer data.
3. Test same `request_id` retry and concurrent submissions against staging, then persistence after restart. Do not restart production just to test.
4. Review ticket email templates, sender verification, deliverability and failure handling.
5. Merge PR #7 only after verifying no deployment side effects; GitHub Actions passed but Cloudflare preview checks failed.

No production config was changed by this checklist.
