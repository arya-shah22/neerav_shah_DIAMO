import React from 'react';
import { Printer, X } from 'lucide-react';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Button } from './Button';

interface PrintTemplateProps {
  type: 'INVOICE' | 'VOUCHER' | 'JOURNAL' | 'JOB';
  data: any;
  onClose: () => void;
}

export const PrintTemplate: React.FC<PrintTemplateProps> = ({ type, data, onClose }) => {
  const { activeCompany } = useActiveCompany();

  // Helper to convert number to Indian currency words
  const numberToWords = (num: number): string => {
    try {
      const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
      const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

      const g = ['', 'thousand', 'lakh', 'crore'];

      const chunk = (n: number) => {
        let str = '';
        if (n > 99) {
          str += a[Math.floor(n / 100)] + 'hundred ';
          n %= 100;
        }
        if (n > 19) {
          str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
        } else {
          str += a[n];
        }
        return str;
      };

      let n = Math.floor(num);
      if (n === 0) return 'zero';

      let i = 0;
      let word = '';

      // First chunk is thousand (hundreds + tens + ones)
      let temp = n % 1000;
      if (temp > 0) {
        word = chunk(temp);
      }
      n = Math.floor(n / 1000);

      // Remaining chunks are Lakh, Crore, etc.
      while (n > 0) {
        temp = n % 100;
        if (temp > 0) {
          word = chunk(temp) + g[i + 1] + ' ' + word;
        }
        n = Math.floor(n / 100);
        i++;
      }

      return 'Rupees ' + word.trim().replace(/\s+/g, ' ') + ' Only';
    } catch {
      return '';
    }
  };

  const getFinalAmount = () => {
    if (type === 'JOURNAL') {
      return Number(data.totalDebit || 0);
    }
    return Number(data.netAmount || data.amount || 0);
  };

  const getDocTitle = () => {
    switch (type) {
      case 'INVOICE':
        return data.invoiceType?.replace('_', ' ') || 'TAX INVOICE';
      case 'VOUCHER':
        return data.transactionType?.replace('_', ' ') || 'CASH/BANK VOUCHER';
      case 'JOURNAL':
        return 'JOURNAL VOUCHER';
      case 'JOB':
        return 'JOB CARD / WORK ORDER';
      default:
        return 'DOCUMENT';
    }
  };

  const party = data.party || data.customer || data.supplier;
  const isBankTx = type === 'VOUCHER' && (data.transactionType === 'BANK_PAYMENT' || data.transactionType === 'BANK_RECEIPT');

  return (
    <div className="print-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      zIndex: 9999,
      padding: '40px 20px',
      overflowY: 'auto'
    }}>
      {/* Styles for print layout */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          .print-modal-overlay, .print-modal-overlay * {
            visibility: visible !important;
          }
          .print-modal-overlay {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: none !important;
            padding: 0 !important;
          }
          .print-no-display {
            display: none !important;
          }
          .print-container {
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background: #fff !important;
            color: #000 !important;
          }
        }
      ` }} />

      {/* Floating Toolbar */}
      <div className="print-no-display" style={{
        width: '100%',
        maxWidth: '800px',
        background: '#1e293b',
        color: '#ffffff',
        padding: '12px 24px',
        borderRadius: '8px 8px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
      }}>
        <span style={{ fontWeight: 600, fontSize: '14px' }}>Print Preview - A4 Portrait</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="primary" size="sm" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={14} /> Print Document
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#cbd5e1' }}>
            <X size={14} /> Close
          </Button>
        </div>
      </div>

       {/* Printable Sheet (A4 size page) */}
      <div className="print-container" style={{
        width: '210mm',
        minHeight: '297mm',
        boxSizing: 'border-box',
        background: '#ffffff',
        color: '#000000',
        padding: '20mm',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        border: '1px solid #cbd5e1',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {/* Company Letterhead */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
              {activeCompany?.companyName || 'DIAMO ERP'}
            </h1>
            <span style={{ fontSize: '12px', color: '#475569' }}>
              {activeCompany?.addressLine1 || 'Surat, Gujarat, India'} {activeCompany?.addressLine2 || ''}
            </span>
            <span style={{ fontSize: '12px', color: '#475569' }}>
              GSTIN: {activeCompany?.gstinNumber || '24AAAAA0000A1Z0'} | PAN: {activeCompany?.panNumber || '—'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{
              background: '#000000',
              color: '#ffffff',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {getDocTitle()}
            </div>
          </div>
        </div>

        {/* Party Details & Document Meta info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', fontSize: '13px' }}>
          {/* Party Card */}
          <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
              Billed To
            </h3>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
              {party?.accountName || 'Cash Account'}
            </div>
            {party && (
              <div style={{ color: '#334155', fontSize: '12px', lineHeight: '1.4' }}>
                {party.gstinNumber && <div><strong>GSTIN:</strong> {party.gstinNumber}</div>}
                {(party.addressLine1 || party.addressLine2) && (
                  <div>
                    <strong>Address:</strong> {party.addressLine1} {party.addressLine2}
                  </div>
                )}
                {(party.city || party.stateCode || party.pincode || party.country) && (
                  <div>
                    {party.city && `${party.city}, `}
                    {party.stateCode && `${party.stateCode} `}
                    {party.pincode && `- ${party.pincode}, `}
                    {party.country && party.country}
                  </div>
                )}
                {party.mobile && <div><strong>Mobile:</strong> {party.mobile}</div>}
                {party.email && <div><strong>Email:</strong> {party.email}</div>}
              </div>
            )}

            {/* Bank Information (Visible for Bank Transactions only) */}
            {isBankTx && party && (party.bankName || party.bankAccountNumber) && (
              <div style={{
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: '1px dashed #cbd5e1',
                fontSize: '11px',
                color: '#334155',
                lineHeight: '1.4'
              }}>
                <strong style={{ fontSize: '11px', color: '#000', display: 'block', marginBottom: '2px' }}>
                  Bank Information:
                </strong>
                {party.bankName && <div><strong>Bank:</strong> {party.bankName} ({party.bankBranch || '—'})</div>}
                {party.bankAccountNumber && <div><strong>A/C No:</strong> {party.bankAccountNumber}</div>}
                {party.bankIfsc && <div><strong>IFSC:</strong> {party.bankIfsc}</div>}
              </div>
            )}
          </div>

          {/* Metadata Card */}
          <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Doc Number:</span>
              <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{data.voucherNumber || data.jobCardNumber || '—'}</span>
            </div>
            {data.billNumber && data.billNumber !== data.voucherNumber && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Ref Invoice No:</span>
                <span style={{ fontWeight: 700 }}>{data.billNumber}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Doc Date:</span>
              <span>{new Date(data.invoiceDate || data.voucherDate || data.createdAt).toLocaleDateString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Document Items Table */}
        <div style={{ flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #000' }}>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>SR #</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>PARTICULARS</th>
                {type === 'JOURNAL' ? (
                  <>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>DEBIT (Dr)</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>CREDIT (Cr)</th>
                  </>
                ) : (
                  <>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>CARATS</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>PCS</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>RATE</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>TOTAL AMOUNT</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {/* If Invoice type */}
              {type === 'INVOICE' && data.items?.map((item: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px' }}>{idx + 1}</td>
                  <td style={{ padding: '8px', fontWeight: 600 }}>{item.quality?.qualityName || 'Diamond Quality'} (HSN: {item.hsnNumber})</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{Number(item.carats).toFixed(2)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{item.pieces}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>₹{Number(item.rate).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>₹{Number(item.grossAmount).toLocaleString('en-IN')}</td>
                </tr>
              ))}

              {/* If Voucher type */}
              {type === 'VOUCHER' && (
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px' }}>1</td>
                  <td style={{ padding: '8px', fontWeight: 600 }}>{data.transactionType?.replace('_', ' ')} Settlement entry</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>—</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>—</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>—</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>₹{Number(data.amount).toLocaleString('en-IN')}</td>
                </tr>
              )}

              {/* If JV Type */}
              {type === 'JOURNAL' && data.lines?.map((item: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px' }}>{idx + 1}</td>
                  <td style={{ padding: '8px', fontWeight: 600 }}>
                    {item.account?.accountName}
                    <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '6px' }}>
                      ({item.debitCreditType === 'DEBIT' ? 'Dr.' : 'Cr.'})
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>
                    {item.debitCreditType === 'DEBIT' ? `₹${Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>
                    {item.debitCreditType === 'CREDIT' ? `₹${Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                </tr>
              ))}

              {/* If Job Card */}
              {type === 'JOB' && (
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px' }}>1</td>
                  <td style={{ padding: '8px', fontWeight: 600 }}>{data.jobType} Job Process (Status: {data.status})</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{Number(data.totalCarats).toFixed(2)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{data.totalPieces}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>—</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Invoice Summary and tax details */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid #000', paddingTop: '16px' }}>
          <div style={{ width: '60%', fontSize: '11px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div>
              <strong>Amount in Words:</strong><br />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#000' }}>
                {numberToWords(getFinalAmount())}
              </span>
            </div>
            {data.narration && (
              <div style={{ marginTop: '8px' }}>
                <strong>Narration Notes:</strong><br />
                <span>{data.narration}</span>
              </div>
            )}
          </div>

          <div style={{ width: '35%', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#475569' }}>Gross Total:</span>
              <span>₹{getFinalAmount().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {data.totalCgst > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#475569' }}>CGST:</span>
                <span>₹{Number(data.totalCgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {data.totalSgst > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#475569' }}>SGST:</span>
                <span>₹{Number(data.totalSgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {data.totalIgst > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#475569' }}>IGST:</span>
                <span>₹{Number(data.totalIgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '6px', fontSize: '15px', fontWeight: 800 }}>
              <span>NET PAYABLE:</span>
              <span>₹{getFinalAmount().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
        {/* Terms & Conditions Block */}
        <div style={{
          borderTop: '1px solid #e2e8f0',
          paddingTop: '12px',
          fontSize: '10px',
          color: '#475569',
          lineHeight: '1.4'
        }}>
          <strong style={{ fontSize: '11px', color: '#000' }}>Terms & Conditions:</strong>
          <ol style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>Goods once sold will not be taken back or exchanged.</li>
            <li>All disputes are subject to Surat jurisdiction only.</li>
            <li>We declare that this document shows the actual price of the goods/services described and that all particulars are true and correct.</li>
          </ol>
        </div>

        {/* Footer Signature Elements */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '30px', fontSize: '12px', textAlign: 'center' }}>
          <div>
            <div style={{ height: '40px' }}></div>
            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '6px', fontWeight: 600, color: '#475569' }}>Prepared By</div>
          </div>
          <div>
            <div style={{ height: '40px' }}></div>
            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '6px', fontWeight: 600, color: '#475569' }}>Checked By</div>
          </div>
          <div>
            <div style={{ height: '40px' }}></div>
            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '6px', fontWeight: 700, color: '#000' }}>Authorized Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
};
