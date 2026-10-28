/**
 * Default rental contract — mapped from the agency CONTRAT-WORD template (French A4).
 * Placeholders use {{snake_case}} keys from templateEngine.buildTemplateVariables.
 */
import { DEFAULT_CONTRACT_TERMS_CSS } from './rentalTermsConditions.js';

export { DEFAULT_CONTRACT_TERMS_HTML } from './rentalTermsConditions.js';

export const DEFAULT_CONTRACT_CUSTOM_CSS = `
  .doc-page { padding: 8mm 9mm !important; font-size: 8.5pt !important; line-height: 1.25 !important; }
  .doc-header { border-bottom: 2px solid #E62117 !important; padding-bottom: 6px !important; margin-bottom: 8px !important; }
  .doc-footer { margin-top: 8px !important; padding-top: 6px !important; font-size: 7.5pt !important; }
  h1 { font-size: 13pt !important; color: #E62117 !important; margin: 0 0 4px !important; }
  h2 { font-size: 9.5pt !important; color: #E62117 !important; margin: 8px 0 4px !important; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #E62117; padding-bottom: 2px; }
  table { margin: 4px 0 !important; }
  th, td { border: 1px solid #ccc !important; padding: 2px 5px !important; font-size: 8pt !important; }
  .brand-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .brand-name { font-size: 14pt; font-weight: 800; color: #E62117; letter-spacing: 0.02em; }
  .brand-meta { text-align: right; font-size: 8pt; color: #333; line-height: 1.35; }
  .contract-no { display: inline-block; border: 1.5px solid #E62117; border-radius: 8px; padding: 3px 10px; font-weight: 700; color: #E62117; margin-top: 4px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .check-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px 8px; font-size: 7.5pt; }
  .check-item::before { content: "☐ "; color: #E62117; }
  .sign-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 10px; }
  .sign-box { border: 1px solid #E62117; border-radius: 4px; min-height: 48px; padding: 4px 6px; font-size: 7.5pt; }
  .legal { font-size: 7.5pt; margin: 8px 0 4px; }
  .muted { color: #666; font-size: 7.5pt; }
  @page { size: A4; margin: 8mm; }
  @media print {
    .doc-page { padding: 0 !important; max-width: 100% !important; }
  }
${DEFAULT_CONTRACT_TERMS_CSS}
`;

export const DEFAULT_CONTRACT_HEADER = `
<div class="brand-row">
  <div>
    <div class="brand-name">{{agency_name}}</div>
    <div class="contract-no">CONTRAT N° : {{contract_number}}</div>
  </div>
  <div class="brand-meta">
    <div>Tél: {{agency_phone}}</div>
    <div>{{agency_email}}</div>
    <div>{{agency_address}}</div>
    <div class="muted">Réservation: {{reservation_id}} · {{generated_date}}</div>
  </div>
</div>
`;

export const DEFAULT_CONTRACT_BODY = `
<div class="grid-2">
  <div>
    <h2>Locataire</h2>
    <table>
      <tr><td>Nom / Prénom</td><td>{{customer_name}}</td></tr>
      <tr><td>Date de naissance</td><td>{{customer_dob}}</td></tr>
      <tr><td>Lieu de naissance</td><td>{{customer_birth_place}}</td></tr>
      <tr><td>Pièce d'identité (CIN / Passeport)</td><td>{{identity_document}}</td></tr>
      <tr><td>N° Passeport</td><td>{{passport_number}}</td></tr>
      <tr><td>Date d'expiration</td><td>{{identity_expires_on}}</td></tr>
      <tr><td>Permis de conduire N°</td><td>{{driver_license}}</td></tr>
      <tr><td>Permis délivré le</td><td>{{driver_license_issued_on}}</td></tr>
      <tr><td>Adresse</td><td>{{customer_address}}</td></tr>
      <tr><td>Tél.</td><td>{{customer_phone}}</td></tr>
      <tr><td>Email</td><td>{{customer_email}}</td></tr>
      <tr><td>Nationalité</td><td>{{customer_nationality}}</td></tr>
    </table>
  </div>
  <div>
    <h2>Véhicule</h2>
    <table>
      <tr><td>Marque</td><td>{{car_make}}</td></tr>
      <tr><td>Immatriculation</td><td>{{car_registration}}</td></tr>
      <tr><td>Catégorie / Année</td><td>{{car_category}} / {{car_year}}</td></tr>
      <tr><td>Livré par</td><td>{{delivered_by}}</td></tr>
      <tr><td>Réceptionné par</td><td>{{received_by}}</td></tr>
      <tr><td>Date / heure départ</td><td>{{pickup_date}}</td></tr>
      <tr><td>Date / heure retour</td><td>{{return_date}}</td></tr>
      <tr><td>Nombre de jours</td><td>{{rental_days}}</td></tr>
      <tr><td>Livrée à</td><td>{{pickup_location}}</td></tr>
      <tr><td>Retour à</td><td>{{return_location}}</td></tr>
      <tr><td>Carburant (départ)</td><td>{{fuel_level_start}}</td></tr>
      <tr><td>Km départ / retour</td><td>{{km_depart}} / {{km_retour}}</td></tr>
      <tr><td>Prix unitaire</td><td>{{price_per_day}}</td></tr>
      <tr><td>Montant T.T.C.</td><td><strong>{{total_price}}</strong></td></tr>
      <tr><td>Montant de la franchise</td><td>{{franchise_amount}}</td></tr>
      <tr><td>Statut paiement</td><td>{{payment_status}}</td></tr>
    </table>
  </div>
</div>

{{second_driver_section}}

<h2>Check-list état du véhicule</h2>
<p class="muted">Cocher les éléments présents à la prise en charge. Zone AVANT / APRÈS à compléter sur place.</p>
<div class="check-grid">
  <span class="check-item">Carte grise</span>
  <span class="check-item">Vignette / talon</span>
  <span class="check-item">Visite technique</span>
  <span class="check-item">Autorisation</span>
  <span class="check-item">Assurance</span>
  <span class="check-item">Contrat</span>
  <span class="check-item">Radio</span>
  <span class="check-item">Antenne</span>
  <span class="check-item">Roue de secours + cric</span>
  <span class="check-item">Rétroviseur G</span>
  <span class="check-item">Rétroviseur D</span>
  <span class="check-item">Enjoliveurs (4)</span>
  <span class="check-item">Pneus (4)</span>
  <span class="check-item">Feux antibrouillard</span>
  <span class="check-item">Triangle</span>
  <span class="check-item">Gilet</span>
</div>

<p class="legal">Je reconnais avoir pris connaissance des conditions générales de location au verso du contrat et j'accepte de m'y conformer. Le locataire est seul responsable des infractions au code de la route.</p>

{{signatures_row_html}}
`;

export const DEFAULT_CONTRACT_FOOTER = `
<p>{{agency_name}} — {{agency_address}}</p>
<p>Tél: {{agency_phone}} | Email: {{agency_email}} | ICE / IF / RC: {{agency_tax_id}}</p>
`;

/** Premium A4 invoice — HDN CAR corporate stationery. */
export const DEFAULT_INVOICE_CUSTOM_CSS = `
  html, body {
    background: #ffffff !important;
  }
  .doc-page {
    padding: 14mm 15mm 12mm !important;
    background: #ffffff !important;
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif !important;
    font-size: 9.5pt !important;
    line-height: 1.45 !important;
    color: #1c1917 !important;
  }
  .doc-header {
    border-bottom: none !important;
    padding-bottom: 0 !important;
    margin-bottom: 0 !important;
    background: #ffffff !important;
  }
  .doc-header > img { display: none !important; }
  .doc-footer {
    border-top: none !important;
    margin-top: 8mm !important;
    padding-top: 0 !important;
    font-size: 7.2pt !important;
    color: #78716c !important;
    background: #ffffff !important;
  }
  h1, h2 { color: inherit !important; border: none !important; margin: 0 !important; padding: 0 !important; text-transform: none !important; letter-spacing: normal !important; }
  table { margin: 0 !important; }
  th, td { border: none !important; padding: 0 !important; font-size: inherit !important; background: transparent !important; }

  .inv-shell { color: #1c1917; background: #ffffff; }
  .inv-top {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 20px;
    align-items: start;
    padding-bottom: 16px;
  }
  .inv-brand-row { display: flex; align-items: flex-start; gap: 14px; }
  .inv-logo {
    max-height: 68px;
    max-width: 172px;
    width: auto;
    height: auto;
    object-fit: contain;
    display: block;
  }
  .inv-brand-name {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 18pt;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #8F1F1F;
    line-height: 1.05;
  }
  .inv-brand-name.is-fallback { margin-bottom: 2px; }
  .inv-brand-meta {
    margin-top: 4px;
    font-size: 7.8pt;
    line-height: 1.5;
    color: #57534e;
  }
  .inv-brand-meta strong { color: #1c1917; font-weight: 650; }
  .inv-doc { text-align: right; }
  .inv-doc-title {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 28pt;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #1c1917;
    line-height: 1;
  }
  .inv-doc-accent {
    width: 42px;
    height: 3px;
    margin: 8px 0 10px auto;
    background: #8F1F1F;
    border-radius: 2px;
  }
  .inv-doc-meta {
    display: inline-grid;
    gap: 3px 14px;
    text-align: left;
    font-size: 8.5pt;
  }
  .inv-doc-meta div { display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: baseline; }
  .inv-doc-meta span {
    color: #78716c;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 7pt;
    font-weight: 650;
  }
  .inv-doc-meta strong { font-weight: 650; color: #1c1917; }
  .inv-status {
    display: inline-block;
    margin-top: 10px;
    padding: 4px 10px;
    border-radius: 999px;
    background: #f8e9e9;
    color: #8F1F1F;
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .inv-parties {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    margin-top: 8px;
    padding-top: 16px;
    border-top: 1px solid #e7e5e4;
  }
  .inv-party {
    padding-left: 12px;
    border-left: 3px solid #8F1F1F;
  }
  .inv-section-label {
    margin: 0 0 8px;
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #8F1F1F;
  }
  .inv-party-name {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 12.5pt;
    font-weight: 700;
    margin: 0 0 4px;
    color: #1c1917;
  }
  .inv-party-lines {
    margin: 0;
    font-size: 8.5pt;
    line-height: 1.55;
    color: #44403c;
  }
  .inv-party-lines .inv-detail-row {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }
  .inv-party-lines .inv-detail-row span:first-child {
    color: #78716c;
    min-width: 4.5rem;
  }

  .inv-rental {
    margin-top: 16px;
    padding: 12px 14px;
    background: #fafaf9;
    border: 1px solid #e7e5e4;
    border-radius: 10px;
  }
  .inv-rental-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px 14px;
  }
  .inv-rental-item span {
    display: block;
    font-size: 7pt;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #78716c;
    margin-bottom: 2px;
    font-weight: 650;
  }
  .inv-rental-item strong {
    font-size: 8.5pt;
    font-weight: 650;
    color: #1c1917;
  }

  .inv-line-details {
    margin-top: 3px;
    font-size: 8pt;
    color: #78716c;
    line-height: 1.35;
    font-weight: 400;
  }

  .inv-table-wrap { margin-top: 20px; }
  .inv-table {
    width: 100%;
    border-collapse: collapse;
  }
  .inv-table thead th {
    padding: 10px 10px !important;
    border-bottom: none !important;
    font-size: 7.4pt !important;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #57534e !important;
    font-weight: 700;
    background: #f5f5f4 !important;
  }
  .inv-table thead th:first-child { border-radius: 8px 0 0 8px; }
  .inv-table thead th:last-child { border-radius: 0 8px 8px 0; }
  .inv-table tbody td {
    padding: 11px 10px !important;
    border-bottom: 1px solid #f0eeec !important;
    vertical-align: top;
    font-size: 9pt !important;
    color: #1c1917;
  }
  .inv-col-desc { width: 48%; text-align: left; }
  .inv-col-qty { width: 12%; text-align: center; }
  .inv-col-unit, .inv-col-amount { width: 20%; text-align: right; white-space: nowrap; }
  .inv-table thead th.inv-col-qty { text-align: center; }
  .inv-table thead th.inv-col-unit,
  .inv-table thead th.inv-col-amount { text-align: right; }

  .inv-bottom {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 28px;
    margin-top: 20px;
    align-items: start;
  }
  .inv-notes {
    font-size: 8.5pt;
    color: #57534e;
    line-height: 1.5;
  }
  .inv-notes > p { margin: 0 0 6px; }

  .inv-amount-words {
    margin-top: 14px;
    padding: 12px 14px;
    border-radius: 10px;
    background: #f8e9e9;
    border: 1px solid #f0d4d4;
  }
  .inv-amount-words .inv-section-label {
    margin-bottom: 6px;
    color: #8F1F1F;
  }
  .inv-amount-words-text {
    margin: 0;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 9.5pt;
    font-style: italic;
    color: #1c1917;
    line-height: 1.5;
  }

  .inv-summary {
    padding: 4px 0 0;
    background: transparent;
  }
  .inv-sum-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 5px 0;
    font-size: 9pt;
    color: #57534e;
  }
  .inv-sum-row strong { color: #1c1917; font-weight: 650; white-space: nowrap; }
  .inv-sum-total {
    margin-top: 8px;
    padding: 12px 0 4px;
    border-top: 1.5px solid #1c1917;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }
  .inv-sum-total span {
    font-size: 8pt;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 700;
    color: #8F1F1F;
  }
  .inv-sum-total strong {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 17pt;
    font-weight: 700;
    color: #8F1F1F;
  }
  .inv-sum-paid, .inv-sum-due {
    margin-top: 4px;
    padding-top: 6px;
    border-top: 1px dashed #e7e5e4;
  }

  .inv-cachet {
    margin-top: 26px;
    max-width: 300px;
  }
  .inv-cachet-title {
    margin: 0 0 10px;
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #8F1F1F;
  }
  .inv-cachet-box {
    min-height: 100px;
    border: 1px dashed #d6d3d1;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    background: #ffffff;
  }
  .inv-cachet-box.is-filled {
    border-style: solid;
    border-color: #e7e5e4;
  }
  .inv-cachet-split {
    display: flex;
    gap: 16px;
    justify-content: space-around;
    width: 100%;
  }
  .inv-cachet-slot {
    display: inline-block;
    min-width: 90px;
    min-height: 56px;
  }
  .inv-cachet img {
    display: block;
    max-height: 110px;
    max-width: 240px;
    object-fit: contain;
  }

  .inv-legal-footer {
    margin-top: 6px;
    padding-top: 12px;
    border-top: 2px solid #8F1F1F;
    text-align: center;
    font-size: 7pt;
    line-height: 1.6;
    color: #78716c;
  }
  .inv-legal-footer strong { color: #44403c; font-weight: 650; }

  @page { size: A4; margin: 10mm; }
  @media print {
    html, body, .doc-page { background: #ffffff !important; }
    .doc-page { padding: 0 !important; max-width: 100% !important; }
    .inv-amount-words,
    .inv-table thead th,
    .inv-rental,
    .inv-status {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;

export const DEFAULT_INVOICE_HEADER = `
<div class="inv-shell">
  <div class="inv-top">
    <div>
      <div class="inv-brand-row">
        {{company_logo_html}}
        <div>
          {{agency_brand_name_html}}
          <div class="inv-brand-meta">
            {{agency_address_line1}}<br/>
            {{agency_address_line2}}<br/>
            Tél. : {{agency_phone}} · Email : {{agency_email}}<br/>
            <strong>ICE</strong> {{agency_ice}} · <strong>IF</strong> {{agency_if}} · <strong>RC</strong> {{agency_rc}}
          </div>
        </div>
      </div>
    </div>
    <div class="inv-doc">
      <div class="inv-doc-title">FACTURE</div>
      <div class="inv-doc-accent" aria-hidden="true"></div>
      <div class="inv-doc-meta">
        <div><span>N°</span><strong>{{invoice_number}}</strong></div>
        <div><span>Date</span><strong>{{invoice_date}}</strong></div>
        {{invoice_reservation_meta_html}}
      </div>
      <div class="inv-status">{{invoice_payment_status}}</div>
    </div>
  </div>
</div>
`;

export const DEFAULT_INVOICE_BODY = `
<div class="inv-shell">
  <div class="inv-parties">
    <div class="inv-party">
      <p class="inv-section-label">Facturé à</p>
      <p class="inv-party-name">{{customer_name}}</p>
      <div class="inv-party-lines">
        {{customer_address}}<br/>
        {{customer_phone}}<br/>
        {{customer_email}}<br/>
        {{customer_tax_id_line}}
      </div>
    </div>
    <div class="inv-party">
      <p class="inv-section-label">Détails</p>
      <div class="inv-party-lines">
        <div class="inv-detail-row"><span>Paiement</span><strong>{{invoice_payment_method}}</strong></div>
        <div class="inv-detail-row"><span>Référence</span><strong>{{invoice_payment_reference}}</strong></div>
        <div class="inv-detail-row"><span>Échéance</span><strong>{{invoice_due_date}}</strong></div>
      </div>
    </div>
  </div>

  {{invoice_rental_section_html}}

  <div class="inv-table-wrap">
    <table class="inv-table">
      <thead>
        <tr>
          <th class="inv-col-desc">Désignation</th>
          <th class="inv-col-qty">Qté</th>
          <th class="inv-col-unit">P.U.</th>
          <th class="inv-col-amount">Montant</th>
        </tr>
      </thead>
      <tbody>
        {{invoice_items_html}}
      </tbody>
    </table>
  </div>

  <div class="inv-bottom">
    <div class="inv-notes">
      <p class="inv-section-label">Notes & conditions</p>
      <p>{{notes}}</p>
      <p>{{payment_instructions}}</p>
      {{invoice_amount_in_words_html}}
    </div>
    <div class="inv-summary">
      <div class="inv-sum-row"><span>Sous-total</span><strong>{{invoice_subtotal}}</strong></div>
      {{invoice_discount_row_html}}
      <div class="inv-sum-row"><span>Total HT</span><strong>{{invoice_total_ht}}</strong></div>
      {{invoice_tax_row_html}}
      <div class="inv-sum-total"><span>Total TTC</span><strong>{{invoice_total_ttc}}</strong></div>
      <div class="inv-sum-row inv-sum-paid"><span>Montant payé</span><strong>{{invoice_amount_paid}}</strong></div>
      <div class="inv-sum-row inv-sum-due"><span>Reste à payer</span><strong>{{invoice_balance_due}}</strong></div>
    </div>
  </div>

  {{company_cachet_signature_html}}
</div>
`;

export const DEFAULT_INVOICE_FOOTER = `
<div class="inv-legal-footer">
  <div><strong>{{agency_name}}</strong> — {{agency_address}}</div>
  <div>Tél. : {{agency_phone}} · Email : {{agency_email}}</div>
  <div>ICE : {{agency_ice}} · IF : {{agency_if}} · RC : {{agency_rc}}</div>
  <div>{{invoice_footer_note}}</div>
</div>
`;

export default {
  DEFAULT_CONTRACT_BODY,
  DEFAULT_CONTRACT_HEADER,
  DEFAULT_CONTRACT_FOOTER,
  DEFAULT_CONTRACT_CUSTOM_CSS,
  DEFAULT_INVOICE_BODY,
  DEFAULT_INVOICE_HEADER,
  DEFAULT_INVOICE_FOOTER,
  DEFAULT_INVOICE_CUSTOM_CSS,
};
