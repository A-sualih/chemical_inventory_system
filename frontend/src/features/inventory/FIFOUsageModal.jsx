import { useState } from "react";
import axios from "axios";
import "../../styles/Inventory.css";

const FIFOUsageModal = ({ chemical, onClose, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState(chemical.unit || "L");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data } = await axios.post("/api/inventory/fifo-usage", {
        chemical_id: chemical.id,
        quantity: Number(amount),
        unit,
        reason
      });
      setSuccessData(data);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "FIFO Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="modal-overlay-action">
        <div className="backdrop-blur" onClick={onClose}></div>
        <div className="stock-modal-container modal-w-med animate-in zoom-in-95" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div className="waiting-icon-box" style={{ width: '5rem', height: '5rem', backgroundColor: '#dcfce7', color: '#16a34a', marginBottom: '1.5rem' }}>
             <svg className="btn-icon" style={{ width: '2.5rem', height: '2.5rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h2 className="stock-op-title" style={{ marginBottom: '0.5rem' }}>Usage Confirmed</h2>
          <p className="sub-text-med" style={{ marginBottom: '2rem' }}>FIFO auto-selection logic successfully deducted stock.</p>
          
          <div className="capacity-info-box" style={{ backgroundColor: 'var(--secondary-50)', textAlign: 'left', padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--secondary-100)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--secondary-200)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <span className="action-label-mini">Total Deducted</span>
              <span className="font-mono-bold" style={{ fontSize: '1.125rem' }}>{successData.totalDeducted} {successData.unit}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span className="role-text" style={{ fontSize: '10px' }}>Containers Affected</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {successData.containersUsed.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--secondary-100)', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="audit-user">{c.containerId}</span>
                      <span className="vessels-count">Batch: {c.batchId}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span className="role-text" style={{ color: '#16a34a' }}>-{c.deductedQuantity} {c.unit}</span>
                      <span className="vessels-count">Rem: {c.remainingQuantity} {c.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="btn-confirm-op bg-out"
            style={{ width: '100%', padding: '1rem' }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay-action">
      <div className="backdrop-blur" onClick={onClose}></div>
      
      <div className="stock-modal-container modal-w-med animate-in zoom-in-95">
        <div className="stock-modal-header">
          <div className="header-main-info">
            <div>
              <h2 className="stock-op-title">Quick FIFO Usage</h2>
              <p className="sub-text-med" style={{ marginTop: '0.25rem' }}>Oldest stock will be auto-selected first.</p>
            </div>
            <button onClick={onClose} className="close-action-btn">
              <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="stock-modal-body">
          <div className="special-info-panel" style={{ backgroundColor: 'var(--primary-50)', borderColor: 'var(--primary-100)', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', marginBottom: '1.5rem' }}>
            <div className="waiting-icon-box" style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary-600)', margin: '0' }}>
              <svg className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div>
              <div className="audit-user">{chemical.name}</div>
              <div className="vessels-count">{chemical.id} • Available: {chemical.quantity} {chemical.unit}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="stock-form" style={{ gap: '1.5rem' }}>
            <div className="input-row-group">
              <div style={{ gridColumn: 'span 2' }}>
                <label className="input-field-label">Quantity to Deduct</label>
                <input 
                  type="number" 
                  step="any"
                  value={amount} 
                  onChange={e => setAmount(e.target.value)}
                  className="stock-input font-mono-bold"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="input-field-label">Unit</label>
                <div className="relative-select-wrapper">
                  <select 
                    value={unit} 
                    onChange={e => setUnit(e.target.value)}
                    className="stock-select"
                  >
                    {chemical.state === 'Liquid' ? (
                      <>
                        <option value="L">L</option>
                        <option value="mL">mL</option>
                      </>
                    ) : (
                      <>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                      </>
                    )}
                  </select>
                  <svg className="select-arrow-mini" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            <div>
              <label className="input-field-label">Usage Purpose / Experiment</label>
              <textarea 
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="stock-textarea"
                placeholder="Why is this chemical being used?"
                required
              />
            </div>

            {error && (
              <div className="error-alert-box pulse-alert">
                <svg className="alert-icon" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                <p className="alert-text">{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="btn-confirm-op bg-out"
              style={{ width: '100%', marginTop: '1rem' }}
            >
              {loading ? (
                <>
                  <svg className="refresh-btn loading h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>Deducting...</span>
                </>
              ) : (
                <>
                  <span>Apply FIFO Deduction</span>
                  <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FIFOUsageModal;
