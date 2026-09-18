(function () {
  'use strict';

  const FIELD_KEYS = ['originator', 'recipients'];
  const ADDRESS_RE = /\b[A-Z0-9]{8}\b/g;
  let scheduled = false;
  let decorating = false;

  function bridge() {
    return window.__FlightFlowFirBridge || null;
  }

  function normalizeCode(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
  }

  function currentSnapshot() {
    const state = bridge()?.state;
    const events = state?.parsed?.events;
    const index = Number(state?.index);
    if (!Array.isArray(events) || !Number.isFinite(index) || !events[index]) return null;
    return events[index].snapshot || {};
  }

  function addressCodes(value) {
    const source = Array.isArray(value) ? value.join(' ') : String(value || '');
    return [...new Set((source.toUpperCase().match(ADDRESS_RE) || []).map(normalizeCode).filter(Boolean))];
  }

  function localityName(code) {
    const state = bridge()?.state;
    return String(state?.localities?.[code] || '').trim();
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[char]);
  }

  function addressMarkup(code) {
    const name = localityName(code);
    if (name) {
      return `<span class="ats-address-entry is-known" data-ats-address="${escapeHtml(code)}">
        <strong>${escapeHtml(code)}</strong>
        <span aria-hidden="true">—</span>
        <span class="ats-address-locality">${escapeHtml(name)}</span>
      </span>`;
    }

    return `<button class="ats-address-entry ats-address-register" type="button" data-register-ats-address="${escapeHtml(code)}" title="Cadastrar a localidade correspondente a ${escapeHtml(code)}">
      <strong>${escapeHtml(code)}</strong>
      <span class="ats-address-register-label"><span aria-hidden="true">＋</span> Cadastrar localidade</span>
    </button>`;
  }

  function decorateField(key, rawValue) {
    const card = document.querySelector(`.field-card[data-field="${key}"]`);
    const valueNode = card?.querySelector('.field-value');
    if (!card || !valueNode) return;

    const codes = addressCodes(rawValue);
    if (!codes.length) {
      card.classList.remove('ats-address-field');
      delete card.dataset.atsAddressSignature;
      return;
    }

    const signature = codes.map(code => `${code}:${localityName(code)}`).join('|');
    if (card.dataset.atsAddressSignature === signature && valueNode.querySelector('.ats-address-entry')) return;

    card.classList.add('ats-address-field');
    card.dataset.atsAddressSignature = signature;
    valueNode.innerHTML = `<span class="ats-address-list">${codes.map(addressMarkup).join('')}</span>`;
  }

  function decorate() {
    if (decorating) return;
    decorating = true;
    try {
      const snapshot = currentSnapshot();
      if (!snapshot) return;
      FIELD_KEYS.forEach(key => decorateField(key, snapshot[key]));
    } finally {
      decorating = false;
    }
  }

  function scheduleDecorate() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      decorate();
    });
  }

  function openLocalityRegistration(code) {
    const normalized = normalizeCode(code);
    if (!normalized) return;

    const configButton = document.getElementById('configBtn');
    const codeInput = document.getElementById('localityCodeInput');
    const nameInput = document.getElementById('localityNameInput');
    if (!configButton || !codeInput || !nameInput) return;

    configButton.click();

    window.setTimeout(() => {
      codeInput.value = normalized;
      nameInput.value = localityName(normalized);
      nameInput.placeholder = 'Informe a localidade deste endereço ATS';
      document.querySelector('.locality-settings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      nameInput.focus();
      nameInput.select();
      nameInput.setAttribute('aria-label', `Localidade correspondente ao endereço ATS ${normalized}`);
    }, 40);
  }

  function bind() {
    const fields = document.getElementById('fieldsGrid');
    if (!fields) return;

    fields.addEventListener('click', event => {
      const button = event.target.closest('[data-register-ats-address]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      openLocalityRegistration(button.dataset.registerAtsAddress);
    });

    const observer = new MutationObserver(scheduleDecorate);
    observer.observe(fields, { childList: true, subtree: true });

    document.addEventListener('flightflow:history-session-reset', scheduleDecorate);
    document.getElementById('saveLocalityBtn')?.addEventListener('click', () => window.setTimeout(scheduleDecorate, 0));

    scheduleDecorate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();

  window.FlightFlowAtsAddressLocality = Object.freeze({
    decorate: scheduleDecorate,
    open: openLocalityRegistration
  });
})();
