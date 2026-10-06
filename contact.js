(() => {
  'use strict';
  const form = document.getElementById('contact-form');
  if (!form) return;
  const status = document.getElementById('contact-status');
  const submit = form.querySelector('button[type="submit"]');
  const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
  const originalLabel = submit.textContent;
  let requestId;
  let submittedPayload;
  let finished = false;
  function newId() {
    const bytes = new Uint8Array(20);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (finished || submit.disabled || !form.reportValidity()) return;
    const values = new FormData(form);
    const fields = {
      name: values.get('name'), company: values.get('company') || '',
      email: values.get('email'), kind: values.get('kind'),
      message: values.get('message'), website: values.get('website') || '',
      contact_permission: values.get('contact_permission') === 'on'
    };
    const canonical = JSON.stringify(fields);
    if (!requestId || submittedPayload !== canonical) {
      requestId = newId();
      submittedPayload = canonical;
    }
    submit.disabled = true;
    form.setAttribute('aria-busy', 'true');
    inputs.forEach(field => { field.disabled = true; });
    submit.textContent = 'Sender …';
    status.textContent = 'Sender henvendelsen …';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(form.action, {
        method: 'POST', mode: 'cors', credentials: 'omit',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...fields, request_id: requestId}),
        signal: controller.signal
      });
      const result = await response.json();
      if (!response.ok || result.saved !== true) {
        throw new Error(result.error || 'Lagringen kunne ikke bekreftes.');
      }
      finished = true;
      const receipt = result.ticket_id ? 'Saksnummer: ' + result.ticket_id : 'Referanse: ' + result.reference;
      status.textContent = 'Takk! Henvendelsen er lagret hos Nexorait. ' + receipt + '. Vi følger opp på e-post. Dette bekrefter mottak, ikke en booking eller bestilling.';
      submit.textContent = 'Henvendelse mottatt';
    } catch (error) {
      status.textContent = (error.name === 'AbortError' ? 'Vi fikk ikke bekreftet mottaket. Du kan prøve igjen med samme opplysninger.' : error.message) + ' Du kan også skrive til kontakt@nexorait.no eller ringe 21 98 88 69.';
      submit.disabled = false;
      inputs.forEach(field => { field.disabled = false; });
      submit.textContent = originalLabel;
    } finally {
      clearTimeout(timeout);
      form.setAttribute('aria-busy', 'false');
    }
  });
})();
