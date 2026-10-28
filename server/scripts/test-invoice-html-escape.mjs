import assert from 'assert';
import { renderTemplate } from '../services/templateEngine.js';
import { buildInvoiceAmountInWordsHtml } from '../services/invoiceTemplateHelpers.js';

const html = buildInvoiceAmountInWordsHtml(1200, 'MAD');
const out = renderTemplate('BEFORE {{invoice_amount_in_words_html}} AFTER', {
  invoice_amount_in_words_html: html,
});

assert.ok(out.includes('<div class="inv-amount-words">'), 'amount-in-words HTML must render as markup');
assert.ok(!out.includes('&lt;div'), 'amount-in-words HTML must not be escaped');
assert.ok(out.includes('Arrêtée la présente facture'), 'French sentence present');
console.log('escape-test: OK');
