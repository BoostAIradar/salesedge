import { useState, useMemo } from 'react';
import { colors, font, tierColors } from '../styles/tokens';
import { scoreICP, calcTier } from '../engine/icp';
import { runResearch } from '../engine/research';
import { fireEmailSequence } from '../engine/sequence';
import { trackEmailSend } from '../engine/learning';

const COUNTIES = [
  { value: 'Miami-Dade', signal: true },
  { value: 'Broward', signal: true },
  { value: 'Palm Beach', signal: false },
  { value: 'Orange', signal: false },
  { value: 'Hillsborough', signal: false },
  { value: 'Duval', signal: false },
  { value: 'Pinellas', signal: false },
  { value: 'Other', signal: false },
];

const PRACTICE_AREAS = [
  { value: 'HOA+Eviction', signal: true },
  { value: 'HOA Foreclosure', signal: true },
  { value: 'Eviction', signal: true },
  { value: 'RE Litigation', signal: false },
  { value: 'General RE', signal: false },
  { value: 'Other', signal: false },
];

const FIRM_SIZES = [
  { value: 'Solo', signal: true },
  { value: '2-3', signal: true },
  { value: '4-10', signal: false },
  { value: '11-25', signal: false },
  { value: '25+', signal: false },
];

const INITIAL_FORM = {
  firmName: '',
  contactName: '',
  email: '',
  phone: '',
  city: '',
  county: '',
  practiceArea: '',
  firmSize: '',
  matterVolume: '',
  source: '',
  barNumber: '',
};

export default function ImportModal({ onClose, onImport, updateLead }) {
  const [form, setForm] = useState(INITIAL_FORM);

  const preview = useMemo(() => {
    const lead = {
      ...form,
      matterVolume: form.matterVolume ? parseInt(form.matterVolume, 10) : 0,
    };
    const { score, breakdown } = scoreICP(lead);
    const tier = calcTier(score);
    return { score, breakdown, tier };
  }, [form]);

  const canSubmit = form.firmName.trim() && form.email.trim();

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    const leadData = {
      ...form,
      matterVolume: form.matterVolume ? parseInt(form.matterVolume, 10) : 0,
    };

    const newLead = onImport(leadData);
    onClose();

    try {
      const research = await runResearch(newLead);
      const updatedLead = { ...newLead, ...research, researchStatus: 'complete' };
      updateLead(newLead.id, {
        ...research,
        researchStatus: 'complete',
      });

      // Fire email sequence for T1/T2 leads after research completes
      if (updatedLead.tier === 1 || updatedLead.tier === 2) {
        const emailResult = await fireEmailSequence(updatedLead);
        if (emailResult) {
          trackEmailSend({
            leadId: newLead.id,
            subject: emailResult.subject,
            angle: emailResult.angle,
            day: 1,
          });
        }
      }
    } catch {
      updateLead(newLead.id, { researchStatus: 'failed' });
    }
  }

  const tierColor = tierColors[preview.tier] || colors.textMuted;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>Import Lead</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>
          <div style={styles.formGrid}>
            <Field label="Firm Name *" value={form.firmName}
              onChange={v => handleChange('firmName', v)} />
            <Field label="Contact Name" value={form.contactName}
              onChange={v => handleChange('contactName', v)} />
            <Field label="Email *" value={form.email} type="email"
              onChange={v => handleChange('email', v)} />
            <Field label="Phone" value={form.phone}
              onChange={v => handleChange('phone', v)} />
            <Field label="City" value={form.city}
              onChange={v => handleChange('city', v)} />

            <SelectField
              label="County"
              value={form.county}
              options={COUNTIES}
              onChange={v => handleChange('county', v)}
            />
            <SelectField
              label="Practice Area"
              value={form.practiceArea}
              options={PRACTICE_AREAS}
              onChange={v => handleChange('practiceArea', v)}
            />
            <SelectField
              label="Firm Size"
              value={form.firmSize}
              options={FIRM_SIZES}
              onChange={v => handleChange('firmSize', v)}
            />

            <Field label="Matter Volume" value={form.matterVolume} type="number"
              onChange={v => handleChange('matterVolume', v)} />
            <Field label="Source" value={form.source}
              onChange={v => handleChange('source', v)} />
            <Field label="Bar Number" value={form.barNumber}
              onChange={v => handleChange('barNumber', v)} />
          </div>

          <div style={styles.preview}>
            <div style={styles.previewTitle}>ICP Score Preview</div>
            <div style={styles.previewScore}>
              <span style={{ fontSize: 32, fontWeight: 700, color: tierColor }}>
                {preview.score}
              </span>
              <span style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 8 }}>
                / 100
              </span>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: tierColor,
                marginLeft: 12,
                padding: '2px 8px',
                border: `1px solid ${tierColor}50`,
                borderRadius: 4,
              }}>
                Tier {preview.tier}
              </span>
            </div>
            <div style={styles.breakdownGrid}>
              <BreakdownBar label="Practice Area" pts={preview.breakdown.practiceArea} max={35} />
              <BreakdownBar label="Firm Size" pts={preview.breakdown.firmSize} max={30} />
              <BreakdownBar label="Geography" pts={preview.breakdown.geography} max={25} />
              <BreakdownBar label="Matter Volume" pts={preview.breakdown.matterVolume} max={10} />
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            style={{
              ...styles.submitBtn,
              opacity: canSubmit ? 1 : 0.4,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            Import & Research
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label style={styles.fieldLabel}>
      <span style={styles.fieldLabelText}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={styles.input}
        placeholder="—"
      />
    </label>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label style={styles.fieldLabel}>
      <span style={styles.fieldLabelText}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={styles.input}
      >
        <option value="">— Select —</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.signal ? '★ ' : ''}{opt.value}
          </option>
        ))}
      </select>
    </label>
  );
}

function BreakdownBar({ label, pts, max }) {
  const pct = max > 0 ? (pts / max) * 100 : 0;
  return (
    <div style={styles.bdRow}>
      <span style={styles.bdLabel}>{label}</span>
      <div style={styles.bdTrack}>
        <div style={{ ...styles.bdFill, width: `${pct}%` }} />
      </div>
      <span style={styles.bdPts}>{pts}/{max}</span>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    fontFamily: font,
  },
  modal: {
    background: colors.bg2,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    width: 680,
    maxHeight: '90vh',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: `1px solid ${colors.border}`,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.textPrimary,
    margin: 0,
    fontFamily: font,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: colors.textSecondary,
    fontSize: 16,
    cursor: 'pointer',
    fontFamily: font,
  },
  body: {
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  fieldLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  fieldLabelText: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    background: colors.bg4,
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    padding: '8px 10px',
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: font,
    outline: 'none',
  },
  preview: {
    background: colors.bg3,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    padding: 16,
  },
  previewTitle: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 8,
  },
  previewScore: {
    display: 'flex',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  breakdownGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  bdRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  bdLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    width: 100,
    flexShrink: 0,
  },
  bdTrack: {
    flex: 1,
    height: 6,
    background: colors.bg1,
    borderRadius: 3,
    overflow: 'hidden',
  },
  bdFill: {
    height: '100%',
    background: colors.amber,
    borderRadius: 3,
    transition: 'width 0.3s ease-out',
  },
  bdPts: {
    fontSize: 11,
    color: colors.textMuted,
    width: 36,
    textAlign: 'right',
    flexShrink: 0,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    padding: '12px 20px',
    borderTop: `1px solid ${colors.border}`,
  },
  cancelBtn: {
    background: colors.bg4,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: font,
    cursor: 'pointer',
  },
  submitBtn: {
    background: colors.amber,
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: colors.bg0,
    fontFamily: font,
    cursor: 'pointer',
  },
};
