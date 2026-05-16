import React, { useState, useEffect, useCallback } from 'react';

interface Party {
  address: string;
  role: string;
  name?: string;
}

interface Term {
  id: string;
  type: string;
  description: string;
  eligible: string;
  details: { reason: string };
  priority: string;
}

interface Transaction {
  id: string;
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
  status: 'pending' | 'success' | 'failed';
}

interface ContractState {
  status: string;
  parties: Party[];
  terms: Term[];
  transactions: Transaction[];
  metadata: {
    project_id: string;
    project_name: string;
    template: string;
  };
}

const CONTRACT_ABI = {
  methods: [
    { name: 'initialize', inputs: [{ name: 'landlord', type: 'address' }, { name: 'tenant', type: 'address' }, { name: 'monthly_rent', type: 'uint256' }, { name: 'deposit', type: 'uint256' }, { name: 'start_date', type: 'uint256' }, { name: 'end_date', type: 'uint256' }, { name: 'payment_day', type: 'uint8' }], outputs: [] },
    { name: 'sign', inputs: [{ name: 'party', type: 'address' }], outputs: [{ name: 'success', type: 'bool' }] },
    { name: 'payRent', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [{ name: 'success', type: 'bool' }] },
    { name: 'terminate', inputs: [{ name: 'party', type: 'address' }, { name: 'reason', type: 'string' }], outputs: [{ name: 'success', type: 'bool' }] },
    { name: 'getStatus', inputs: [], outputs: [{ name: 'status', type: 'string' }] },
  ]
};

function copyToClipboard(text: string): void {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(text).catch(() => {});
    return;
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
  } catch (e) {}
}

const styles = {
  glass: { background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--glass-shadow)', padding: 'clamp(24px, 4vw, 36px)' } as React.CSSProperties,
  panel: { background: 'var(--bg-panel)', backdropFilter: 'blur(16px) saturate(140%)', WebkitBackdropFilter: 'blur(16px) saturate(140%)', border: '1px solid var(--glass-border-strong)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--glass-shadow-sm)', padding: '22px' } as React.CSSProperties,
  card: { background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--glass-shadow-sm)', padding: '14px' } as React.CSSProperties,
  input: { width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.55)', color: 'var(--text-primary)', border: '1px solid var(--border-standard)', borderRadius: 'var(--radius-md)', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s', lineHeight: 1.5 } as React.CSSProperties,
  label: { display: 'block', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as any } as React.CSSProperties,
  cta: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 18px', background: 'var(--gradient-cta)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.65)', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--shadow-cta)', transition: 'transform 0.15s, box-shadow 0.2s', lineHeight: 1.4, width: '100%', textDecoration: 'none' } as React.CSSProperties,
  ghost: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 22px', background: 'rgba(255,255,255,0.42)', color: 'var(--text-secondary)', border: '1px solid var(--border-standard)', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'transform 0.15s, background 0.2s, box-shadow 0.2s', lineHeight: 1.4, width: '100%', textDecoration: 'none' } as React.CSSProperties,
  panelTitle: { fontSize: '14px', fontWeight: 700, color: 'rgba(15,23,42,0.48)', textTransform: 'uppercase' as any, letterSpacing: '0.08em', marginBottom: '14px' } as React.CSSProperties,
};

export default function ContractDemoPage() {
  const [contractState, setContractState] = useState<ContractState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [formParams, setFormParams] = useState({ landlord: '', tenant: '', monthly_rent: '', deposit: '', start_date: '', end_date: '', payment_day: '1' });
  const [showInitForm, setShowInitForm] = useState(false);
  const projectId = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : '';
  const backendUrl = 'http://122.51.247.121:5000';
  const simulatorUrl = 'http://122.51.247.121:5000';

  const fetchContractState = useCallback(async () => {
    try { setLoading(true); const r = await fetch(`${simulatorUrl}/api/simulate/${projectId}`); if (!r.ok) throw Error(); const d = await r.json(); setContractState(d); setError(null); }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setContractState({ status: 'NOT_ELIGIBLE', parties: [], terms: [{ id: 'T001', type: 'general', description: '租赁双方信息缺失', eligible: 'TermEligibility.NOT_ELIGIBLE', details: { reason: 'parties对象为空' }, priority: 'high' }, { id: 'T002', type: 'payment', description: '租金金额未指定', eligible: 'TermEligibility.NOT_ELIGIBLE', details: { reason: '缺少 monthly_rent' }, priority: 'high' }, { id: 'T003', type: 'deposit', description: '押金信息未指定', eligible: 'TermEligibility.NOT_ELIGIBLE', details: { reason: '缺少 deposit' }, priority: 'medium' }, { id: 'T004', type: 'time', description: '租赁期限未指定', eligible: 'TermEligibility.NOT_ELIGIBLE', details: { reason: '缺少日期字段' }, priority: 'high' }], transactions: [], metadata: { project_id: projectId, project_name: projectId, template: 'housing_lease' } });
    } finally { setLoading(false); }
  }, [projectId, simulatorUrl]);

  useEffect(() => { fetchContractState(); const i = setInterval(fetchContractState, 10000); return () => clearInterval(i); }, [fetchContractState]);

  const handleAction = async (action: string, params?: Record<string, unknown>) => {
    setActionLoading(action);
    try { const r = await fetch(`${backendUrl}/api/contracts/${projectId}/action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, params }) }); if (!r.ok) throw Error(); await fetchContractState(); }
    catch (err) { alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`); } finally { setActionLoading(null); }
  };

  const handleInitialize = async () => {
    setActionLoading('initialize');
    try {
      await fetch(`${backendUrl}/api/contracts/${projectId}/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize', params: { landlord: formParams.landlord || '0x0000000000000000000000000000000000000001', tenant: formParams.tenant || '0x0000000000000000000000000000000000000002', monthly_rent: BigInt(formParams.monthly_rent || '5000000000000000000'), deposit: BigInt(formParams.deposit || '10000000000000000000'), start_date: BigInt(formParams.start_date || Math.floor(Date.now() / 1000)), end_date: BigInt(formParams.end_date || Math.floor(Date.now() / 1000) + 31536000), payment_day: parseInt(formParams.payment_day || '1') } }),
      });
      setShowInitForm(false); await fetchContractState();
    } catch (err) { alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`); } finally { setActionLoading(null); }
  };

  const statusStyle = (s: string): React.CSSProperties => {
    const base: React.CSSProperties = { padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.03em', border: '1px solid' };
    if (s.includes('NOT_ELIGIBLE')) return { ...base, background: 'rgba(220,38,38,0.08)', color: '#DC2626', borderColor: 'rgba(220,38,38,0.15)' };
    if (s.includes('PENDING')) return { ...base, background: 'rgba(245,158,11,0.08)', color: '#D97706', borderColor: 'rgba(245,158,11,0.15)' };
    if (s.includes('ACTIVE')) return { ...base, background: 'rgba(5,150,105,0.08)', color: '#059669', borderColor: 'rgba(5,150,105,0.15)' };
    if (s.includes('TERMINATED')) return { ...base, background: 'rgba(107,114,128,0.08)', color: '#6B7280', borderColor: 'rgba(107,114,128,0.15)' };
    return { ...base, background: 'rgba(37,99,235,0.08)', color: '#2563EB', borderColor: 'rgba(37,99,235,0.15)' };
  };

  const fmt = (ts: string) => new Date(ts).toLocaleString('zh-CN', { hour12: false });

  if (loading && !contractState) return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="app-atmosphere" /><div className="app-noise" />
      <div style={{ position: 'relative', zIndex: 2, ...styles.glass, textAlign: 'center', padding: '40px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid var(--border-subtle)', borderTopColor: 'rgba(244,114,182,0.6)', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>加载合约状态中...</p>
      </div>
    </div>
  );

  return (
    <div className="app-shell" style={{ background: '#f4f6fb' }}>
      <div className="app-atmosphere" /><div className="app-noise" />
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px) saturate(150%)', WebkitBackdropFilter: 'blur(20px) saturate(150%)', borderBottom: '1px solid rgba(255,255,255,0.72)', boxShadow: '0 1px 0 rgba(255,255,255,0.85) inset', padding: '16px clamp(20px,4vw,32px)', marginBottom: 'clamp(40px,8vw,88px)' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{contractState?.metadata.project_name || projectId}</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>合约 ID: {projectId}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={statusStyle(contractState?.status || 'UNKNOWN')}>{contractState?.status || 'UNKNOWN'}</span>
            <button onClick={() => copyToClipboard(window.location.href)}
              style={{ padding: '8px 16px', borderRadius: '999px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, background: 'rgba(255,255,255,0.42)', color: 'var(--text-primary)', border: '1px solid var(--border-standard)', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.62)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.42)'; }}>复制链接</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 clamp(20px,4vw,32px) 64px' }}>
        {error && <div style={{ ...styles.card, marginBottom: '24px', border: '1px solid rgba(220,38,38,0.15)', background: 'rgba(220,38,38,0.06)' }}><p style={{ fontWeight: 600, color: '#DC2626', fontSize: '14px', marginBottom: '4px' }}>错误</p><p style={{ color: 'rgba(220,38,38,0.8)', fontSize: '13px' }}>{error}</p></div>}

        {/* 1.15fr / 0.85fr 主栅格 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 'clamp(20px,4vw,36px)', alignItems: 'stretch' }}>
          {/* Left — Contract Terms & Transactions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <section style={styles.panel}>
              <h2 style={styles.panelTitle}>合约条款状态</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {contractState?.terms.map((term) => (
                  <div key={term.id} style={{ ...styles.card, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{term.id}</span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: term.priority === 'high' ? '#DC2626' : term.priority === 'medium' ? '#D97706' : '#6B7280', letterSpacing: '0.03em' }}>[{term.priority}]</span>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.75)', color: 'var(--text-quaternary)' }}>{term.type}</span>
                      </div>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginTop: '4px' }}>{term.description}</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.55, marginTop: '4px' }}>{term.details.reason}</p>
                    </div>
                    <span style={statusStyle(term.eligible)}>{term.eligible.split('.').pop()}</span>
                  </div>
                ))}
              </div>
            </section>

            <section style={styles.panel}>
              <h2 style={styles.panelTitle}>交易历史</h2>
              {contractState?.transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-quaternary)' }}><p style={{ fontSize: '13px' }}>暂无交易记录</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {contractState?.transactions.map((tx) => (
                    <div key={tx.id} style={{ ...styles.card, padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: tx.status === 'success' ? 'var(--status-completed)' : tx.status === 'pending' ? '#D97706' : 'var(--status-failed)' }} />
                        <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{tx.type}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{fmt(tx.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right — Parties, Actions, ABI */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <section style={styles.panel}>
              <h2 style={styles.panelTitle}>参与方信息</h2>
              {contractState?.parties.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-quaternary)' }}><p style={{ fontSize: '13px' }}>暂无参与方信息</p><p style={{ fontSize: '11px', marginTop: '4px' }}>请先初始化合约</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {contractState?.parties.map((party, idx) => (
                    <div key={idx} style={styles.card}>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '4px' }}>{party.role}</div>
                      <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{party.address}</div>
                      {party.name && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{party.name}</div>}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section style={styles.panel}>
              <h2 style={styles.panelTitle}>合约操作</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {!showInitForm ? (
                  <>
                    <button onClick={() => setShowInitForm(true)} disabled={actionLoading !== null}
                      style={{ ...styles.cta }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-cta-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-cta)'; }}>初始化合约</button>
                    <button onClick={() => handleAction('sign', { party: formParams.landlord || '0x0000000000000000000000000000000000000001' })} disabled={actionLoading !== null || contractState?.status.includes('NOT_ELIGIBLE')}
                      style={{ ...styles.ghost, ...(actionLoading !== null || contractState?.status.includes('NOT_ELIGIBLE') ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
                      onMouseEnter={(e) => { if (actionLoading === null && !contractState?.status.includes('NOT_ELIGIBLE')) { e.currentTarget.style.background = 'rgba(255,255,255,0.62)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.42)'; e.currentTarget.style.transform = 'translateY(0)'; }}>房东签署</button>
                    <button onClick={() => handleAction('sign', { party: formParams.tenant || '0x0000000000000000000000000000000000000002' })} disabled={actionLoading !== null || contractState?.status.includes('NOT_ELIGIBLE')}
                      style={{ ...styles.ghost, ...(actionLoading !== null || contractState?.status.includes('NOT_ELIGIBLE') ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
                      onMouseEnter={(e) => { if (actionLoading === null && !contractState?.status.includes('NOT_ELIGIBLE')) { e.currentTarget.style.background = 'rgba(255,255,255,0.62)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.42)'; e.currentTarget.style.transform = 'translateY(0)'; }}>租客签署</button>
                    <button onClick={() => handleAction('payRent', { amount: '5000000000000000000' })} disabled={actionLoading !== null || !contractState?.status.includes('ACTIVE')}
                      style={{ ...styles.ghost, ...(actionLoading !== null || !contractState?.status.includes('ACTIVE') ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
                      onMouseEnter={(e) => { if (actionLoading === null && contractState?.status.includes('ACTIVE')) { e.currentTarget.style.background = 'rgba(255,255,255,0.62)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.42)'; e.currentTarget.style.transform = 'translateY(0)'; }}>支付租金</button>
                    <button onClick={() => handleAction('terminate', { party: '0x0000000000000000000000000000000000000001', reason: '合同终止' })} disabled={actionLoading !== null || contractState?.status.includes('NOT_ELIGIBLE')}
                      style={{ ...styles.ghost, ...(actionLoading !== null || contractState?.status.includes('NOT_ELIGIBLE') ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
                      onMouseEnter={(e) => { if (actionLoading === null && !contractState?.status.includes('NOT_ELIGIBLE')) { e.currentTarget.style.background = 'rgba(255,255,255,0.62)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.42)'; e.currentTarget.style.transform = 'translateY(0)'; }}>终止合约</button>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {['landlord', 'tenant', 'monthly_rent', 'deposit'].map(f => (
                      <div key={f}>
                        <label style={styles.label}>{f === 'landlord' ? '房东地址' : f === 'tenant' ? '租客地址' : f === 'monthly_rent' ? '月租金 (ETH)' : '押金 (ETH)'}</label>
                        <input type="text" value={(formParams as any)[f]} onChange={(e) => setFormParams({ ...formParams, [f]: e.target.value })} placeholder={f.includes('rent') || f === 'deposit' ? (f === 'monthly_rent' ? '5.0' : '10.0') : '0x...'} style={styles.input} />
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button onClick={handleInitialize} disabled={actionLoading === 'initialize'}
                        style={{ ...styles.ghost, flex: 1, background: 'var(--gradient-cta)', color: 'var(--text-primary)', fontWeight: 600, border: '1px solid rgba(255,255,255,0.65)', boxShadow: 'var(--shadow-cta)' }}
                        onMouseEnter={(e) => { if (actionLoading !== 'initialize') { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-cta-hover)'; }}}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-cta)'; }}>确认</button>
                      <button onClick={() => setShowInitForm(false)} style={{ ...styles.ghost, flex: 1 }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.62)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.42)'; }}>取消</button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section style={styles.panel}>
              <h2 style={styles.panelTitle}>合约 ABI</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
                {CONTRACT_ABI.methods.map((method) => (
                  <details key={method.name} style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
                    <summary style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.25)', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.5)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}>{method.name}()</summary>
                    <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-subtle)' }}>
                      <p style={{ fontWeight: 600, color: 'var(--text-quaternary)', fontSize: '11px', marginBottom: '6px', letterSpacing: '0.03em' }}>Inputs:</p>
                      {method.inputs.map((input, idx) => <div key={idx} style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', padding: '2px 0' }}>{input.name}: {input.type}</div>)}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer style={{ marginTop: '28px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-quaternary)' }}>合约模拟器: {simulatorUrl}</p>
          <p style={{ fontSize: '13px', color: 'var(--text-quaternary)', marginTop: '4px' }}>后端 API: {backendUrl}</p>
        </footer>
      </main>
    </div>
  );
}
