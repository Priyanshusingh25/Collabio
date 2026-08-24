import React, { useEffect, useState } from 'react';
import { Plus, X, Trash2, Printer, Edit, Download } from 'lucide-react';
import { invoicesApi, dealsApi, contactsApi, settingsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate } from '../utils/helpers';

export default function Invoices() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  // Dependencies for form
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [settings, setSettings] = useState(null);

  const load = async () => {
    try {
      const [invs, dls, cons, sets] = await Promise.all([
        invoicesApi.getAll(token),
        dealsApi.getAll(token),
        contactsApi.getAll(token),
        settingsApi.get(token)
      ]);
      setInvoices(invs);
      setDeals(dls);
      setContacts(cons);
      setSettings(sets);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await invoicesApi.delete(token, id);
      setInvoices(prev => prev.filter(i => i.id !== id));
      addToast('Invoice deleted');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handlePrint = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPrint(true);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices 🧾</h1>
          <p className="page-subtitle">Generate and track payments</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setSelectedInvoice(null); setShowModal(true); }}>
          <Plus size={16} /> New Invoice
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : invoices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🧾</div>
          <div className="empty-state-title">No invoices yet</div>
          <button className="btn btn-primary mt-4" onClick={() => setShowModal(true)}><Plus size={15} /> Create Invoice</button>
        </div>
      ) : (
        <div className="grid-3">
          {invoices.map(inv => (
            <div key={inv.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className={`badge badge-${inv.status === 'draft' ? 'outreach' : inv.status === 'sent' ? 'contract_sent' : inv.status === 'paid' ? 'paid' : 'priority_high'}`}>
                  {inv.status}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>{inv.invoice_number}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                {formatCurrency(inv.total_amount, inv.currency)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Due: {formatDate(inv.due_date)}
              </div>
              
              {(inv.contact_name || inv.deal_title) && (
                <div style={{ background: 'var(--color-surface-2)', padding: '8px 12px', borderRadius: 8, marginBottom: 16 }}>
                  {inv.contact_name && <div style={{ fontSize: 12, fontWeight: 600 }}>👤 {inv.contact_name}</div>}
                  {inv.deal_title && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>💼 {inv.deal_title}</div>}
                </div>
              )}

              <div style={{ marginTop: 'auto', display: 'flex', gap: 8, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handlePrint(inv)}>
                  <Printer size={14} /> Print
                </button>
                <button className="btn btn-secondary btn-sm btn-icon" onClick={() => { setSelectedInvoice(inv); setShowModal(true); }}>
                  <Edit size={14} />
                </button>
                <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(inv.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <InvoiceModal
          invoice={selectedInvoice}
          deals={deals}
          contacts={contacts}
          onClose={() => setShowModal(false)}
          onSaved={(saved) => {
            // Reload fully to get joined names
            load();
            setShowModal(false);
          }}
        />
      )}

      {showPrint && selectedInvoice && settings && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal modal-lg" style={{ background: '#fff', color: '#000', borderRadius: 0, padding: 40, minHeight: '80vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }} className="no-print">
              <button className="btn btn-secondary" style={{ color: '#000', borderColor: '#ccc' }} onClick={() => setShowPrint(false)}>Close</button>
              <button className="btn btn-primary" onClick={() => window.print()}><Printer size={16} /> Print / PDF</button>
            </div>
            
            {/* INVOICE TEMPLATE (White background) */}
            <div className="invoice-print-area">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40, borderBottom: '2px solid #eee', paddingBottom: 20 }}>
                <div>
                  <h1 style={{ margin: '0 0 8px 0', fontSize: 32 }}>INVOICE</h1>
                  <div style={{ color: '#666' }}>Invoice #: {selectedInvoice.invoice_number}</div>
                  <div style={{ color: '#666' }}>Date: {formatDate(selectedInvoice.issue_date)}</div>
                  <div style={{ color: '#666' }}>Due Date: {formatDate(selectedInvoice.due_date)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h2 style={{ margin: '0 0 8px 0', fontSize: 24 }}>{settings.invoice_business_name || settings.display_name || 'Creator'}</h2>
                  <div style={{ color: '#666', whiteSpace: 'pre-wrap' }}>{settings.invoice_address || 'Address not set'}</div>
                  <div style={{ color: '#666', marginTop: 4 }}>{settings.gmail || ''}</div>
                </div>
              </div>

              <div style={{ marginBottom: 40 }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#666', fontSize: 14, textTransform: 'uppercase' }}>Bill To:</h3>
                <div style={{ fontSize: 16, fontWeight: 'bold' }}>{selectedInvoice.contact_name || 'Client Name'}</div>
                {selectedInvoice.deal_title && <div style={{ color: '#666', marginTop: 4 }}>Re: {selectedInvoice.deal_title}</div>}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 40 }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid #ddd' }}>Description</th>
                    <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #ddd' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.line_items.map((item, i) => (
                    <tr key={i}>
                      <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>{item.desc}</td>
                      <td style={{ padding: 12, borderBottom: '1px solid #eee', textAlign: 'right' }}>{formatCurrency(item.amount, selectedInvoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 40 }}>
                <div style={{ width: 300 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid #000', fontWeight: 'bold', fontSize: 20 }}>
                    <span>Total:</span>
                    <span>{formatCurrency(selectedInvoice.total_amount, selectedInvoice.currency)}</span>
                  </div>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #eee' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#666', fontSize: 14, textTransform: 'uppercase' }}>Notes / Payment Terms:</h3>
                  <div style={{ whiteSpace: 'pre-wrap', color: '#444' }}>{selectedInvoice.notes}</div>
                </div>
              )}
            </div>
          </div>
          <style>{`
            @media print {
              body * { visibility: hidden; }
              .invoice-print-area, .invoice-print-area * { visibility: visible; }
              .invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; }
              .no-print { display: none !important; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

function InvoiceModal({ invoice, deals, contacts, onClose, onSaved }) {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(invoice || {
    invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(Math.random()*1000).toString().padStart(3, '0')}`,
    deal_id: '',
    contact_id: '',
    status: 'draft',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    line_items: [{ desc: '', amount: 0 }],
    total_amount: 0,
    currency: 'USD',
    notes: 'Please remit payment within 30 days.'
  });

  const set = (k, v) => setForm(p => {
    const next = { ...p, [k]: v };
    if (k === 'line_items') {
      next.total_amount = next.line_items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    }
    return next;
  });

  const handleLineItemChange = (index, field, value) => {
    const newItems = [...form.line_items];
    newItems[index][field] = value;
    set('line_items', newItems);
  };

  const addLineItem = () => set('line_items', [...form.line_items, { desc: '', amount: 0 }]);
  const removeLineItem = (index) => set('line_items', form.line_items.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        deal_id: form.deal_id ? parseInt(form.deal_id) : null,
        contact_id: form.contact_id ? parseInt(form.contact_id) : null,
      };
      
      const res = invoice
        ? await invoicesApi.update(token, invoice.id, payload)
        : await invoicesApi.create(token, payload);
      addToast(invoice ? 'Invoice updated!' : 'Invoice created!');
      onSaved(res);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{invoice ? 'Edit Invoice' : 'Create Invoice'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Invoice Number</label>
                <input className="form-input" value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Link to Contact</label>
                <select className="form-select" value={form.contact_id} onChange={e => set('contact_id', e.target.value)}>
                  <option value="">— None —</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Link to Deal</label>
                <select className="form-select" value={form.deal_id} onChange={e => set('deal_id', e.target.value)}>
                  <option value="">— None —</option>
                  {deals.map(d => <option key={d.id} value={d.id}>{d.brand_name} - {d.title}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Issue Date</label>
                <input className="form-input" type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input className="form-input" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} required />
              </div>
            </div>

            <div className="section-title mt-4">Line Items</div>
            <div style={{ background: 'var(--color-surface-2)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
              {form.line_items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <input 
                    className="form-input" style={{ flex: 1 }} placeholder="Description" 
                    value={item.desc} onChange={e => handleLineItemChange(i, 'desc', e.target.value)} required 
                  />
                  <input 
                    className="form-input" type="number" style={{ width: 120 }} placeholder="Amount" 
                    value={item.amount} onChange={e => handleLineItemChange(i, 'amount', e.target.value)} required 
                  />
                  <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeLineItem(i)} disabled={form.line_items.length === 1}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addLineItem}><Plus size={14} /> Add Item</button>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Total: {formatCurrency(form.total_amount)}</div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Notes / Payment Details</label>
              <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Bank details, wire instructions..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : '💾'} Save Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
