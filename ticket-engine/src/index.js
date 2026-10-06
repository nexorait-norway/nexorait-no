const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const TICKET_RE = /\b(NXR-(20\d{2})-(\d{6,}))\b/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      try {
        const db = await env.DB.prepare("SELECT 1 AS ok").first();
        return json({ ok: true, service: "nexorait-ticket-engine", database: db?.ok === 1 ? "ok" : "unknown" });
      } catch (error) {
        return json({ ok: false, service: "nexorait-ticket-engine", database: "error", error: safeError(error) }, 503);
      }
    }

    if (request.method === "POST" && url.pathname === "/webhooks/resend") {
      return handleResendWebhook(request, env);
    }

    return json({ ok: false, error: "Not found" }, 404);
  }
};

async function handleResendWebhook(request, env) {
  if (!env.RESEND_WEBHOOK_SECRET) {
    return json({ ok: false, error: "Webhook verification is not configured." }, 503);
  }

  const rawBody = await request.text();
  const verified = await verifyResendWebhook(request.headers, rawBody, env.RESEND_WEBHOOK_SECRET);
  if (!verified) {
    return json({ ok: false, error: "Invalid webhook signature." }, 401);
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, error: "Invalid JSON." }, 400);
  }

  if (event?.type !== "email.received") {
    return json({ ok: true, ignored: true, reason: "unsupported_event_type" });
  }

  return processReceivedEmail(event, request.headers, env);
}

async function processReceivedEmail(event, headers, env) {
  const data = event?.data || {};
  const providerEmailId = data.email_id || null;
  const eventId = headers.get("svix-id") || event.id || (providerEmailId ? `email.received:${providerEmailId}` : crypto.randomUUID());
  const claimToken = crypto.randomUUID();
  const now = new Date().toISOString();

  const claim = await env.DB.prepare(
    `INSERT INTO inbound_events
      (event_id, claim_token, provider_email_id, internet_message_id, received_at, sender_email, raw_subject, disposition)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'PROCESSING')
     ON CONFLICT(event_id) DO NOTHING
     RETURNING event_id`
  ).bind(
    eventId,
    claimToken,
    providerEmailId,
    data.message_id || null,
    data.created_at || event.created_at || now,
    parseAddress(data.from || "").email,
    data.subject || ""
  ).first();

  if (!claim) {
    const previous = await env.DB.prepare(
      "SELECT disposition, ticket_number, classification, processed_at FROM inbound_events WHERE event_id = ?"
    ).bind(eventId).first();
    return json({ ok: true, duplicate: true, previous: previous || null });
  }

  try {
    let full = null;
    if (providerEmailId && env.RESEND_API_KEY) {
      full = await fetchReceivedEmail(providerEmailId, env.RESEND_API_KEY);
    }

    const message = mergeEmailData(data, full);
    const from = parseAddress(message.from || "");
    const senderEmail = (from.email || "").toLowerCase();
    const subject = message.subject || "(uten emne)";
    const bodyText = (message.text || stripHtml(message.html || "")).slice(0, 12000);
    const headerMap = normalizeHeaders(message.headers);
    const inReplyTo = getHeader(headerMap, "in-reply-to");
    const referencesHeader = getHeader(headerMap, "references");
    const internetMessageId = message.message_id || data.message_id || getHeader(headerMap, "message-id") || null;

    const deterministic = classifyInbound({
      senderEmail,
      subject,
      bodyText,
      headerMap,
      supportAddress: (env.SUPPORT_ADDRESS || "").toLowerCase()
    });

    if (deterministic.ignore) {
      await finalizeEvent(env.DB, eventId, {
        classification: deterministic.category,
        disposition: deterministic.disposition,
        ticketNumber: null,
        senderEmail,
        subject,
        internetMessageId,
        error: null
      });
      return json({ ok: true, ignored: true, reason: deterministic.disposition });
    }

    const explicitTicket = extractTicketNumber(subject + "\n" + bodyText);
    let ticket = explicitTicket ? await getTicketByNumber(env.DB, explicitTicket) : null;

    if (!ticket) {
      ticket = await findTicketByReferences(env.DB, inReplyTo, referencesHeader);
    }

    if (ticket) {
      await recordInboundMessage(env.DB, ticket.id, {
        providerEmailId,
        internetMessageId,
        inReplyTo,
        referencesHeader,
        subject,
        senderEmail,
        recipientEmail: env.SUPPORT_ADDRESS,
        receivedAt: message.created_at || data.created_at || now
      });

      await env.DB.prepare(
        `UPDATE tickets
         SET updated_at = ?,
             last_response_at = ?,
             status = CASE WHEN status = 'WAITING_CUSTOMER' THEN 'OPEN' ELSE status END,
             last_action = 'Customer replied',
             next_action = 'Review and respond'
         WHERE id = ?`
      ).bind(now, now, ticket.id).run();

      await finalizeEvent(env.DB, eventId, {
        classification: deterministic.category,
        disposition: "EXISTING_TICKET",
        ticketNumber: ticket.ticket_number,
        senderEmail,
        subject,
        internetMessageId,
        error: null
      });

      return json({
        ok: true,
        ticketNumber: ticket.ticket_number,
        created: false,
        classification: deterministic.category,
        disposition: "EXISTING_TICKET"
      });
    }

    if (deterministic.category === "SALES") {
      await finalizeEvent(env.DB, eventId, {
        classification: deterministic.category,
        disposition: "SALES_NO_TICKET",
        ticketNumber: null,
        senderEmail,
        subject,
        internetMessageId,
        error: null
      });
      return json({ ok: true, ticketCreated: false, classification: "SALES", disposition: "SALES_NO_TICKET" });
    }

    const createdAt = message.created_at || data.created_at || event.created_at || now;
    const year = osloYear(createdAt);
    const sequence = await nextSequence(env.DB, year, now);
    const ticketNumber = `NXR-${year}-${String(sequence).padStart(6, "0")}`;
    const priority = inferPriority(deterministic.category, subject + "\n" + bodyText);

    const inserted = await env.DB.prepare(
      `INSERT INTO tickets
        (ticket_number, ticket_year, sequence_number, created_at, updated_at, customer_name, customer_email,
         subject, category, priority, status, short_summary, last_action, next_action, last_response_at,
         owner_agent, related_thread_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, 'Ticket created', ?, ?, 'Nexorait AI', ?)
       RETURNING id, ticket_number`
    ).bind(
      ticketNumber,
      year,
      sequence,
      createdAt,
      now,
      from.name || null,
      senderEmail,
      subject,
      deterministic.category,
      priority,
      subject.slice(0, 500),
      env.AUTO_ACK_ENABLED === "true" ? "Send acknowledgement" : "Enable acknowledgement after secret configuration",
      createdAt,
      data.thread_id || null
    ).first();

    if (!inserted?.id) {
      throw new Error("Ticket insert did not return an ID.");
    }

    await recordInboundMessage(env.DB, inserted.id, {
      providerEmailId,
      internetMessageId,
      inReplyTo,
      referencesHeader,
      subject,
      senderEmail,
      recipientEmail: env.SUPPORT_ADDRESS,
      receivedAt: createdAt
    });

    let ackStatus = "DISABLED";
    if (env.AUTO_ACK_ENABLED === "true") {
      if (!env.RESEND_API_KEY) {
        ackStatus = "MISSING_API_KEY";
      } else if (!senderEmail) {
        ackStatus = "NO_RECIPIENT";
      } else {
        try {
          const sent = await sendAcknowledgement(env, senderEmail, ticketNumber);
          ackStatus = "SENT";

          await env.DB.prepare(
            `INSERT OR IGNORE INTO ticket_messages
              (ticket_id, direction, provider, provider_email_id, subject, sender_email, recipient_email, created_at)
             VALUES (?, 'OUTBOUND', 'resend', ?, ?, ?, ?, ?)`
          ).bind(
            inserted.id,
            sent?.id || null,
            `[${ticketNumber}] Vi har mottatt henvendelsen din`,
            env.SUPPORT_ADDRESS,
            senderEmail,
            new Date().toISOString()
          ).run();

          await env.DB.prepare(
            `UPDATE tickets
             SET updated_at = ?, last_action = 'Acknowledgement sent', next_action = 'Review case'
             WHERE id = ?`
          ).bind(new Date().toISOString(), inserted.id).run();
        } catch (error) {
          ackStatus = "FAILED";
          await env.DB.prepare(
            `UPDATE tickets
             SET updated_at = ?, last_action = 'Acknowledgement failed', next_action = 'Retry acknowledgement'
             WHERE id = ?`
          ).bind(new Date().toISOString(), inserted.id).run();
        }
      }
    }

    await finalizeEvent(env.DB, eventId, {
      classification: deterministic.category,
      disposition: "NEW_TICKET",
      ticketNumber,
      senderEmail,
      subject,
      internetMessageId,
      error: ackStatus === "FAILED" ? "Acknowledgement failed" : null
    });

    return json({
      ok: true,
      ticketNumber,
      created: true,
      classification: deterministic.category,
      priority,
      acknowledgement: ackStatus
    });
  } catch (error) {
    await env.DB.prepare(
      `UPDATE inbound_events
       SET disposition = 'ERROR', processed_at = ?, error = ?
       WHERE event_id = ? AND claim_token = ?`
    ).bind(new Date().toISOString(), safeError(error), eventId, claimToken).run();

    return json({ ok: false, error: "Inbound processing failed." }, 500);
  }
}

async function nextSequence(db, year, now) {
  const row = await db.prepare(
    `INSERT INTO ticket_sequences (year, last_value, updated_at)
     VALUES (?, 1, ?)
     ON CONFLICT(year) DO UPDATE SET
       last_value = ticket_sequences.last_value + 1,
       updated_at = excluded.updated_at
     RETURNING last_value`
  ).bind(year, now).first();

  const value = Number(row?.last_value);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("Could not allocate ticket sequence.");
  }
  return value;
}

async function getTicketByNumber(db, ticketNumber) {
  return db.prepare("SELECT * FROM tickets WHERE ticket_number = ? LIMIT 1").bind(ticketNumber.toUpperCase()).first();
}

async function findTicketByReferences(db, inReplyTo, referencesHeader) {
  const refs = unique([
    ...extractMessageIds(inReplyTo),
    ...extractMessageIds(referencesHeader)
  ]).slice(0, 20);

  if (!refs.length) return null;

  const placeholders = refs.map(() => "?").join(",");
  return db.prepare(
    `SELECT t.*
     FROM ticket_messages m
     JOIN tickets t ON t.id = m.ticket_id
     WHERE m.internet_message_id IN (${placeholders})
     ORDER BY m.id DESC
     LIMIT 1`
  ).bind(...refs).first();
}

async function recordInboundMessage(db, ticketId, message) {
  await db.prepare(
    `INSERT OR IGNORE INTO ticket_messages
      (ticket_id, direction, provider, provider_email_id, internet_message_id, in_reply_to, references_header,
       subject, sender_email, recipient_email, received_at, created_at)
     VALUES (?, 'INBOUND', 'resend', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    ticketId,
    message.providerEmailId || null,
    message.internetMessageId || null,
    message.inReplyTo || null,
    message.referencesHeader || null,
    message.subject || null,
    message.senderEmail || null,
    message.recipientEmail || null,
    message.receivedAt || null,
    new Date().toISOString()
  ).run();
}

async function finalizeEvent(db, eventId, values) {
  await db.prepare(
    `UPDATE inbound_events
     SET internet_message_id = ?,
         sender_email = ?,
         raw_subject = ?,
         classification = ?,
         disposition = ?,
         ticket_number = ?,
         processed_at = ?,
         error = ?
     WHERE event_id = ?`
  ).bind(
    values.internetMessageId || null,
    values.senderEmail || null,
    values.subject || null,
    values.classification || null,
    values.disposition,
    values.ticketNumber || null,
    new Date().toISOString(),
    values.error || null,
    eventId
  ).run();
}

function classifyInbound({ senderEmail, subject, bodyText, headerMap, supportAddress }) {
  const text = `${subject}\n${bodyText}`.toLowerCase();
  const autoSubmitted = (getHeader(headerMap, "auto-submitted") || "").toLowerCase();
  const precedence = (getHeader(headerMap, "precedence") || "").toLowerCase();

  if (!senderEmail) return { ignore: true, category: "SYSTEM", disposition: "MISSING_SENDER" };
  if (senderEmail === supportAddress) return { ignore: true, category: "INTERNAL", disposition: "INTERNAL_MAIL" };

  const local = senderEmail.split("@")[0] || "";
  if (["mailer-daemon", "postmaster"].includes(local)) {
    return { ignore: true, category: "SYSTEM", disposition: "NDR_BOUNCE" };
  }

  if (
    autoSubmitted && autoSubmitted !== "no" ||
    ["bulk", "list", "junk"].includes(precedence) ||
    /delivery status notification|undeliverable|mail delivery failed|returned mail|failure notice|ikke levert|leveringsfeil/i.test(subject) ||
    /out of office|automatic reply|autosvar|fraværsmelding/i.test(subject)
  ) {
    return { ignore: true, category: "SYSTEM", disposition: "AUTOMATED_SYSTEM_MAIL" };
  }

  if (/security|sikkerhet|databrudd|data breach|phishing|hacket|hack|credential|konto kompromittert/.test(text)) {
    return { ignore: false, category: "SECURITY", disposition: "PROCESS" };
  }
  if (/advokat|legal|juridisk|gdpr|personvern|privacy|tvist|dispute|formell klage/.test(text)) {
    return { ignore: false, category: "LEGAL", disposition: "PROCESS" };
  }
  if (/faktura|invoice|betaling|payment|refund|refusjon|kreditnota|billing/.test(text)) {
    return { ignore: false, category: "BILLING", disposition: "PROCESS" };
  }
  if (/leveranse|delivery|prosjekt|project|scope|endringsønske|change request/.test(text)) {
    return { ignore: false, category: "DELIVERY", disposition: "PROCESS" };
  }
  if (/feil|error|bug|virker ikke|doesn.?t work|technical|teknisk|nedetid|down|problem/.test(text)) {
    return { ignore: false, category: "TECHNICAL", disposition: "PROCESS" };
  }
  if (/pris|price|tilbud|quote|demo|interessert|interested|pilot|samarbeid|tjeneste|service package/.test(text)) {
    return { ignore: false, category: "SALES", disposition: "PROCESS" };
  }
  return { ignore: false, category: "SUPPORT", disposition: "PROCESS" };
}

function inferPriority(category, text) {
  const lower = (text || "").toLowerCase();
  if (category === "SECURITY" || /kritisk|critical|akutt|urgent|haster|nedetid|down now/.test(lower)) return "URGENT";
  if (category === "LEGAL" || /tvist|dispute|betaling stoppet|payment dispute/.test(lower)) return "HIGH";
  return "NORMAL";
}

async function fetchReceivedEmail(emailId, apiKey) {
  const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  if (!response.ok) {
    throw new Error(`Resend received-email lookup failed: ${response.status}`);
  }
  return response.json();
}

async function sendAcknowledgement(env, to, ticketNumber) {
  const text = `Hei,

Takk for at du kontaktet Nexorait. Vi har mottatt henvendelsen din.

Saksnummer: ${ticketNumber}

Vi følger opp så snart som mulig. Dersom du sender mer informasjon om samme sak, svar gjerne i denne e-posttråden slik at alt holdes samlet.

Med vennlig hilsen
Nexorait
AI-automatisering for små servicebedrifter
nexorait.no
kontakt@nexorait.no`;

  const html = `<p>Hei,</p>
<p>Takk for at du kontaktet Nexorait. Vi har mottatt henvendelsen din.</p>
<p><strong>Saksnummer: ${escapeHtml(ticketNumber)}</strong></p>
<p>Vi følger opp så snart som mulig. Dersom du sender mer informasjon om samme sak, svar gjerne i denne e-posttråden slik at alt holdes samlet.</p>
<p>Med vennlig hilsen<br>
<strong>Nexorait</strong><br>
AI-automatisering for små servicebedrifter<br>
<a href="https://nexorait.no">nexorait.no</a><br>
kontakt@nexorait.no</p>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `nexorait-ticket-ack-${ticketNumber}`
    },
    body: JSON.stringify({
      from: env.ACK_FROM,
      to: [to],
      subject: `[${ticketNumber}] Vi har mottatt henvendelsen din`,
      text,
      html,
      reply_to: env.ACK_REPLY_TO
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Resend acknowledgement failed: ${response.status} ${payload?.message || ""}`.trim());
  }
  return payload;
}

async function verifyResendWebhook(headers, rawBody, secret) {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatureHeader = headers.get("svix-signature");
  if (!id || !timestamp || !signatureHeader || !secret) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > 300) return false;

  let keyBytes;
  try {
    const encoded = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    keyBytes = base64ToBytes(encoded);
  } catch {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const payload = new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`);
  const signed = new Uint8Array(await crypto.subtle.sign("HMAC", key, payload));
  const expected = bytesToBase64(signed);

  return signatureHeader
    .split(/\s+/)
    .map(part => part.split(",", 2))
    .some(([version, value]) => version === "v1" && constantTimeEqual(value || "", expected));
}

function mergeEmailData(eventData, full) {
  if (!full) return eventData || {};
  if (full.data && typeof full.data === "object") return { ...eventData, ...full.data };
  return { ...eventData, ...full };
}

function normalizeHeaders(headers) {
  const map = new Map();
  if (!headers) return map;

  if (Array.isArray(headers)) {
    for (const item of headers) {
      if (item?.name) map.set(String(item.name).toLowerCase(), String(item.value || ""));
    }
    return map;
  }

  if (typeof headers === "object") {
    for (const [key, value] of Object.entries(headers)) {
      map.set(String(key).toLowerCase(), Array.isArray(value) ? value.join(" ") : String(value ?? ""));
    }
  }
  return map;
}

function getHeader(map, name) {
  return map.get(String(name).toLowerCase()) || "";
}

function extractTicketNumber(text) {
  const match = String(text || "").match(TICKET_RE);
  return match ? match[1].toUpperCase() : null;
}

function extractMessageIds(value) {
  if (!value) return [];
  const matches = String(value).match(/<[^>]+>/g);
  if (matches?.length) return matches;
  return String(value).split(/\s+/).filter(Boolean);
}

function parseAddress(value) {
  const text = String(value || "").trim();
  const bracket = text.match(/^(.*?)\s*<([^<>\s]+@[^<>\s]+)>\s*$/);
  if (bracket) {
    return {
      name: bracket[1].replace(/^["']|["']$/g, "").trim(),
      email: bracket[2].toLowerCase()
    };
  }
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  return { name: "", email: email.toLowerCase() };
}

function osloYear(value) {
  const date = new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return Number(new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Oslo",
    year: "numeric"
  }).format(safeDate));
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeError(error) {
  return String(error?.message || error || "Unknown error").slice(0, 1000);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}
