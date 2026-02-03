import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection } from 'firebase/firestore';
import { firestore } from '../../shared/firebase/client';
import { useAuth } from '../../shared/auth/AuthProvider';

function deriveAuthorName(email: string | null | undefined, displayName: string | null | undefined) {
  if (displayName?.trim()) return displayName.trim();
  if (email?.trim()) return email.split('@')[0];
  return '리그원';
}

export default function CommunityBoardWritePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const disabled = useMemo(() => !title.trim() || !content.trim() || !user || submitting, [content, submitting, title, user]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    const now = Date.now();
    setSubmitting(true);
    try {
      const docRef = await addDoc(collection(firestore, 'communityPosts'), {
        title: title.trim(),
        content: content.trim(),
        authorUid: user.uid,
        authorName: deriveAuthorName(user.email, user.displayName),
        createdAt: now,
        updatedAt: now,
      });
      navigate(`/community/board/${docRef.id}`, { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', display: 'grid', gap: '14px' }}>
      <header style={{ display: 'grid', gap: '6px' }}>
        <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 900, color: '#e5e7eb' }}>자유게시판 글쓰기</h2>
        <p style={{ margin: 0, color: '#cbd5e1' }}>리그원과 공유할 내용을 작성해 주세요.</p>
      </header>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'grid',
          gap: '12px',
          border: '1px solid rgba(148,163,184,0.24)',
          borderRadius: '16px',
          padding: '16px',
          background: 'rgba(12,17,48,0.72)',
        }}
      >
        <input
          placeholder="제목"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid rgba(148,163,184,0.3)',
            background: 'rgba(2,6,23,0.55)',
            color: '#f8fafc',
            fontWeight: 700,
          }}
        />

        <textarea
          placeholder="내용"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          style={{
            minHeight: '280px',
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid rgba(148,163,184,0.3)',
            background: 'rgba(2,6,23,0.55)',
            color: '#f8fafc',
            resize: 'vertical',
            lineHeight: 1.6,
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(148,163,184,0.35)',
              background: 'rgba(2,6,23,0.5)',
              color: '#cbd5e1',
              fontWeight: 800,
            }}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={disabled}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: 'none',
              background: 'var(--hs-red)',
              color: '#fff',
              fontWeight: 900,
              opacity: disabled ? 0.55 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? '등록 중...' : '등록'}
          </button>
        </div>
      </form>
    </div>
  );
}
