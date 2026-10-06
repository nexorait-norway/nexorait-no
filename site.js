(() => {
  'use strict';
  const header = document.querySelector('.site-header');
  const menu = document.getElementById('main-menu');
  const toggle = document.querySelector('.menu-toggle');
  if (header && menu && toggle) {
    const mobile = window.matchMedia('(max-width: 1000px)');
    function setOpen(open) {
      menu.hidden = mobile.matches && !open;
      toggle.setAttribute('aria-expanded', String(mobile.matches && open));
    }
    header.classList.add('menu-ready');
    setOpen(false);
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', event => {
      if (event.target.closest('a')) setOpen(false);
    });
    header.addEventListener('keydown', event => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    mobile.addEventListener('change', () => setOpen(false));
  }

  const form = document.getElementById('contact-form');
  const topicLabel = document.getElementById('contact-topic');
  if (!form || !topicLabel) return;
  let previousSuggestion = '';
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-contact-topic]');
    if (!link || form.getAttribute('aria-busy') === 'true') return;
    const message = form.querySelector('[name="message"]');
    const kind = form.querySelector('[name="kind"]');
    if (message.disabled || kind.disabled) return;
    const topic = link.dataset.contactTopic;
    topicLabel.textContent = 'Du spør om: ' + topic;
    topicLabel.hidden = false;
    const suggestion = 'Jeg ønsker å vite mer om ' + topic + '.\n\nBehovet vårt: ';
    if (!message.value || message.value === previousSuggestion) {
      message.value = suggestion;
      kind.value = 'sales';
      previousSuggestion = suggestion;
    }
  });
})();
