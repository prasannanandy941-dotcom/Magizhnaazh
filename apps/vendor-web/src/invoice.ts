import { BookingInvoice } from '../../../packages/shared-types';

const rupee = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;
const esc = (s: string) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

// Render a GST invoice to a printable HTML document and open it in a new window
// with the browser's print dialog (which is also "Save as PDF"). Self-contained
// so it works from both the customer and vendor apps.
export function openInvoicePrintWindow(invoice: BookingInvoice): void {
  const w = window.open('', '_blank', 'width=820,height=1000');
  if (!w) {
    alert('Please allow pop-ups to view the invoice.');
    return;
  }
  const gstPct = Math.round(invoice.gstRate * 100);
  const rows = invoice.lineItems
    .map((li) => `<tr><td>${esc(li.label)}</td><td class="r">${rupee(li.amount)}</td></tr>`)
    .join('');
  const issued = invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString('en-IN') : '';

  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(invoice.invoiceNumber)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #6366f1; padding-bottom: 16px; }
  .brand { font-size: 24px; font-weight: 800; color: #4f46e5; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .muted { color: #64748b; font-size: 12px; }
  .parties { display: flex; justify-content: space-between; gap: 24px; margin: 24px 0; }
  .parties h3 { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #64748b; margin: 0 0 6px; }
  .parties p { margin: 2px 0; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { text-align: left; padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
  th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #475569; }
  td.r, th.r { text-align: right; }
  .totals { margin-top: 12px; margin-left: auto; width: 300px; }
  .totals div { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
  .totals .grand { border-top: 2px solid #1e293b; margin-top: 6px; padding-top: 8px; font-weight: 800; font-size: 15px; }
  .paid { color: #059669; } .due { color: #dc2626; }
  .stamp { margin-top: 8px; text-align: right; font-weight: 800; }
  .foot { margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  @media print { body { padding: 24px; } .noprint { display: none; } }
</style></head><body>
  <div class="head">
    <div>
      <div class="brand">Magizhnaazh</div>
      <div class="muted">Event Services Marketplace</div>
    </div>
    <div style="text-align:right">
      <h1>TAX INVOICE</h1>
      <div class="muted">${esc(invoice.invoiceNumber)}</div>
      <div class="muted">Issued: ${esc(issued)}</div>
      <div class="muted">Event date: ${esc(invoice.eventDate)}</div>
    </div>
  </div>

  <div class="parties">
    <div>
      <h3>From</h3>
      <p><strong>${esc(invoice.seller.name)}</strong></p>
      ${invoice.seller.gstin ? `<p>GSTIN: ${esc(invoice.seller.gstin)}</p>` : ''}
      ${invoice.seller.address ? `<p>${esc(invoice.seller.address)}</p>` : ''}
      ${invoice.seller.phone ? `<p>${esc(invoice.seller.phone)}</p>` : ''}
      ${invoice.seller.email ? `<p>${esc(invoice.seller.email)}</p>` : ''}
    </div>
    <div style="text-align:right">
      <h3>Bill To</h3>
      <p><strong>${esc(invoice.buyer.name)}</strong></p>
      ${invoice.buyer.email ? `<p>${esc(invoice.buyer.email)}</p>` : ''}
    </div>
  </div>

  <table>
    <thead><tr><th>Description</th><th class="r">Amount (incl. GST)</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>Taxable value</span><span>${rupee(invoice.taxableValue)}</span></div>
    <div><span>CGST (${gstPct / 2}%)</span><span>${rupee(invoice.cgst)}</span></div>
    <div><span>SGST (${gstPct / 2}%)</span><span>${rupee(invoice.sgst)}</span></div>
    <div class="grand"><span>Grand Total</span><span>${rupee(invoice.grandTotal)}</span></div>
    <div><span>Advance paid</span><span class="paid">${rupee(invoice.advancePaid)}</span></div>
    <div><span>Balance due</span><span class="due">${rupee(invoice.balanceDue)}</span></div>
  </div>
  ${invoice.paidInFull ? '<div class="stamp paid">✓ PAID IN FULL</div>' : ''}

  <div class="foot">
    GST is included in the amounts shown (${gstPct}%). This is a computer-generated invoice.
  </div>

  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body></html>`);
  w.document.close();
}
