import { useEffect, useState, type CSSProperties } from 'react';
import { useContent } from '../../../shared/state/contentProvider';

const cardStyle: CSSProperties = {
  borderRadius: '16px',
  border: '1px solid rgba(148,163,184,0.28)',
  background: 'linear-gradient(135deg, rgba(15,23,42,0.78), rgba(30,41,59,0.78))',
  padding: '16px',
  boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
};

const labelStyle: CSSProperties = {
  color: '#cbd5e1',
  fontWeight: 800,
  fontSize: '13px',
  marginBottom: '6px',
  display: 'block',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid rgba(148,163,184,0.3)',
  background: 'rgba(15,23,42,0.6)',
  color: '#e2e8f0',
  fontSize: '14px',
};

export default function AdminBrandPage() {
  const { content, updateContent } = useContent();
  const { brand } = content;

  const [status, setStatus] = useState<string | null>(null);
  const [draft, setDraft] = useState(brand);

  useEffect(() => {
    setDraft(brand);
  }, [brand]);

  const handleSave = () => {
    updateContent({ brand: draft });
    setStatus('브랜드 설정을 저장했습니다.');
  };

  return (
    <div style={{ display: 'grid', gap: '14px' }}>
      {status && <div style={{ ...cardStyle, borderColor: 'rgba(34,197,94,0.45)', color: '#bbf7d0', fontWeight: 800 }}>{status}</div>}

      <section style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', color: '#e2e8f0' }}>브랜드 설정</h3>
        <div style={{ display: 'grid', gap: '10px' }}>
          <div>
            <label style={labelStyle}>리그명</label>
            <input style={inputStyle} value={draft.leagueName} onChange={(e) => setDraft((prev) => ({ ...prev, leagueName: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>시즌 라벨</label>
            <input style={inputStyle} value={draft.seasonLabel} onChange={(e) => setDraft((prev) => ({ ...prev, seasonLabel: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>리그 설명</label>
            <input style={inputStyle} value={draft.leagueDescription} onChange={(e) => setDraft((prev) => ({ ...prev, leagueDescription: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>인스타그램 URL</label>
            <input style={inputStyle} value={draft.instagramUrl} onChange={(e) => setDraft((prev) => ({ ...prev, instagramUrl: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>규정 PDF 경로</label>
            <input style={inputStyle} value={draft.rulesPdfPath} onChange={(e) => setDraft((prev) => ({ ...prev, rulesPdfPath: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>팀 로고 경로</label>
            <input style={inputStyle} value={draft.teamLogoPath} onChange={(e) => setDraft((prev) => ({ ...prev, teamLogoPath: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>리그 로고 경로</label>
            <input style={inputStyle} value={draft.leagueLogoPath} onChange={(e) => setDraft((prev) => ({ ...prev, leagueLogoPath: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
            <div>
              <label style={labelStyle}>Accent Red</label>
              <input style={inputStyle} value={draft.accentRed} onChange={(e) => setDraft((prev) => ({ ...prev, accentRed: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Accent Navy</label>
              <input style={inputStyle} value={draft.accentNavy} onChange={(e) => setDraft((prev) => ({ ...prev, accentNavy: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Accent Light</label>
              <input style={inputStyle} value={draft.accentLight} onChange={(e) => setDraft((prev) => ({ ...prev, accentLight: e.target.value }))} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: '12px' }}>
          <button type="button" onClick={handleSave} style={{ ...inputStyle, width: 'auto', cursor: 'pointer', fontWeight: 800 }}>
            브랜드 저장
          </button>
        </div>
      </section>
    </div>
  );
}
