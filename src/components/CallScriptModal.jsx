import { useState } from 'react';
import { colors, font } from '../styles/tokens';
import Tag from './Tag';

const GHL_DIALER_URL = 'https://app.gohighlevel.com/calls';

export default function CallScriptModal({ lead, script, onClose, onLogCall }) {
  const [tab, setTab] = useState('script');
  const [outcome, setOutcome] = useState('');
  const [showOutcome, setShowOutcome] = useState(false);

  if (!script) return null;

  function handleLogCall() {
    if (!outcome) return;
    onLogCall(outcome);
  }

  function handleCall() {
    if (lead.phone) {
      window.open(`tel:${lead.phone}`, '_self');
    } else {
      window.open(GHL_DIALER_URL, '_blank');
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h3 style={styles.title}>Call Script — {lead.firmName}</h3>
            <span style={styles.subtitle}>{lead.contactName || 'Unknown'} · {lead.phone || 'No phone'}</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.tabs}>
          {['script', 'objections', 'voicemail'].map(t => (
            <button
              key={t}
              style={{
                ...styles.tabBtn,
                color: tab === t ? colors.amber : colors.textSecondary,
                borderBottom: tab === t ? `2px solid ${colors.amber}` : '2px solid transparent',
              }}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div style={styles.body}>
          {tab === 'script' && (
            <div style={styles.scriptFlow}>
              <ScriptCard label="Opener" content={script.opener} tint="amber" />
              <ScriptCard label="Permission Ask" content={script.permissionAsk} />
              {(script.painProbe || []).map((q, i) => (
                <ScriptCard key={i} label={`Pain Probe ${i + 1}`} content={q} />
              ))}
              <ScriptCard label="Pivot to LegalEdge" content={script.pivot} tint="blue" />
              <ScriptCard label="Demo Ask" content={script.demoAsk} tint="green" />
              {script.closeOptions && (
                <div style={styles.closeSection}>
                  <div style={styles.closeLabel}>Close Options</div>
                  <ScriptCard label="Strong Close" content={script.closeOptions.strong} tint="amber" />
                  <ScriptCard label="Soft Close" content={script.closeOptions.soft} />
                </div>
              )}
            </div>
          )}

          {tab === 'objections' && (
            <div style={styles.objectionList}>
              {Object.entries(script.objectionHandlers || {}).map(([objection, response]) => (
                <ObjectionCard key={objection} objection={objection} response={response} />
              ))}
            </div>
          )}

          {tab === 'voicemail' && (
            <div style={styles.vmSection}>
              <div style={styles.vmTime}>Estimated time: ~28 seconds</div>
              <div style={styles.vmContent}>{script.voicemailScript}</div>
              <button
                style={styles.copyBtn}
                onClick={() => navigator.clipboard.writeText(script.voicemailScript)}
              >
                Copy Script
              </button>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button style={styles.callBtn} onClick={handleCall}>
            Call {lead.phone || 'via GHL'}
          </button>
          <div style={styles.logSection}>
            {!showOutcome ? (
              <button style={styles.logBtn} onClick={() => setShowOutcome(true)}>
                Log Outcome
              </button>
            ) : (
              <div style={styles.outcomeRow}>
                <select
                  style={styles.outcomeSelect}
                  value={outcome}
                  onChange={e => setOutcome(e.target.value)}
                >
                  <option value="">Select outcome...</option>
                  <option value="connected">Connected</option>
                  <option value="no_answer">No Answer</option>
                  <option value="voicemail">Voicemail</option>
                  <option value="wrong_number">Wrong Number</option>
                </select>
                <button
                  style={{ ...styles.submitBtn, opacity: outcome ? 1 : 0.4 }}
                  disabled={!outcome}
                  onClick={handleLogCall}
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScriptCard({ label, content, tint }) {
  const [expanded, setExpanded] = useState(true);

  const borderColor = tint === 'amber' ? `${colors.amber}40`
    : tint === 'blue' ? `${colors.blue}40`
    : tint === 'green' ? `${colors.green}40`
    : colors.border;

  return (
    <div style={{ ...styles.card, borderColor }} onClick={() => setExpanded(!expanded)}>
      <div style={styles.cardLabel}>
        <Tag label={label} color={
          tint === 'amber' ? colors.amber
          : tint === 'blue' ? colors.blue
          : tint === 'green' ? colors.green
          : colors.textSecondary
        } />
      </div>
      {expanded && <p style={styles.cardContent}>{content}</p>}
    </div>
  );
}

function ObjectionCard({ objection, response }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={styles.objCard} onClick={() => setOpen(!open)}>
      <div style={styles.objHeader}>
        <span style={styles.objLabel}>"{objection}"</span>
        <span style={styles.objToggle}>{open ? '−' : '+'}</span>
      </div>
      {open && <p style={styles.objResponse}>{response}</p>}
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  panel: {
    width: 480,
    height: '100vh',
    background: colors.bg2,
    borderLeft: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '16px 20px',
    borderBottom: `1px solid ${colors.border}`,
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.textPrimary,
    margin: 0,
    fontFamily: font,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: colors.textSecondary,
    fontSize: 16,
    cursor: 'pointer',
    fontFamily: font,
  },
  tabs: {
    display: 'flex',
    borderBottom: `1px solid ${colors.border}`,
  },
  tabBtn: {
    flex: 1,
    background: 'none',
    border: 'none',
    padding: '10px 0',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  body: {
    flex: 1,
    overflow: 'auto',
    padding: 16,
  },
  scriptFlow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  card: {
    border: '1px solid',
    borderRadius: 6,
    padding: 10,
    cursor: 'pointer',
  },
  cardLabel: {
    marginBottom: 6,
  },
  cardContent: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 1.6,
    margin: 0,
  },
  closeSection: {
    marginTop: 8,
  },
  closeLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 6,
  },
  objectionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  objCard: {
    background: colors.bg3,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: 10,
    cursor: 'pointer',
  },
  objHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  objLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.red,
    fontStyle: 'italic',
  },
  objToggle: {
    color: colors.textMuted,
    fontSize: 16,
  },
  objResponse: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 1.6,
    margin: '8px 0 0',
    paddingTop: 8,
    borderTop: `1px solid ${colors.border}`,
  },
  vmSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  vmTime: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  vmContent: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 1.7,
    background: colors.bg3,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: 14,
  },
  copyBtn: {
    background: colors.bg4,
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    padding: '6px 14px',
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: font,
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderTop: `1px solid ${colors.border}`,
    gap: 10,
  },
  callBtn: {
    background: colors.green,
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: colors.bg0,
    fontFamily: font,
    cursor: 'pointer',
  },
  logSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  logBtn: {
    background: colors.bg4,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: font,
    cursor: 'pointer',
  },
  outcomeRow: {
    display: 'flex',
    gap: 6,
  },
  outcomeSelect: {
    background: colors.bg4,
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    padding: '6px 8px',
    fontSize: 12,
    color: colors.textPrimary,
    fontFamily: font,
    outline: 'none',
  },
  submitBtn: {
    background: colors.amber,
    border: 'none',
    borderRadius: 4,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    color: colors.bg0,
    fontFamily: font,
    cursor: 'pointer',
  },
};
