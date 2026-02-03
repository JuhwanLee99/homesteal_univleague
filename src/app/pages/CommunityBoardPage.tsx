import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { firestore } from '../../shared/firebase/client';
import type { CommunityPost } from '../../shared/types';
import { useAuth } from '../../shared/auth/AuthProvider';

const cardStyle: CSSProperties = {
  background: 'rgba(12, 17, 48, 0.7)',
  border: '1px solid rgba(229, 231, 235, 0.16)',
  borderRadius: '14px',
  padding: '16px',
  display: 'grid',
  gap: '8px',
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('ko-KR');
}

export default function CommunityBoardPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const q = query(collection(firestore, 'communityPosts'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const next = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<CommunityPost, 'id'>) }));
        setPosts(next);
      } finally {
        setLoading(false);
      }
    };
    void fetchPosts();
  }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return posts;
    return posts.filter((post) => post.title.toLowerCase().includes(keyword) || post.content.toLowerCase().includes(keyword));
  }, [posts, search]);

  return (
    <div style={{ display: 'grid', gap: '16px', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'grid', gap: '4px' }}>
          <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 900, color: '#e5e7eb' }}>자유게시판</h2>
          <p style={{ margin: 0, color: '#cbd5e1' }}>리그원들이 자유롭게 의견을 남기는 공간입니다.</p>
        </div>
        {user ? (
          <Link
            to="new"
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'var(--hs-red)',
              color: '#fff',
              fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            글쓰기
          </Link>
        ) : (
          <Link
            to="/login"
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid rgba(229,231,235,0.35)',
              color: '#e5e7eb',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            로그인 후 작성
          </Link>
        )}
      </header>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="제목/내용 검색"
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: '10px',
          border: '1px solid rgba(148,163,184,0.35)',
          background: 'rgba(2, 6, 23, 0.6)',
          color: '#e5e7eb',
        }}
      />

      {loading ? (
        <div style={cardStyle}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div style={cardStyle}>게시글이 없습니다.</div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {filtered.map((post) => (
            <Link key={post.id} to={post.id} style={{ textDecoration: 'none' }}>
              <article style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', color: '#94a3b8', fontSize: '12px' }}>
                  <span>{post.authorName}</span>
                  <span>{formatDate(post.createdAt)}</span>
                </div>
                <h3 style={{ margin: 0, color: '#f8fafc', fontWeight: 900, fontSize: '18px' }}>{post.title}</h3>
                <p
                  style={{
                    margin: 0,
                    color: '#cbd5e1',
                    lineHeight: 1.6,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {post.content}
                </p>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
