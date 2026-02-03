import { Link } from 'react-router-dom';
import { useEffect, useState, type CSSProperties } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { firestore } from '../../shared/firebase/client';
import type { CommunityPost, Notice } from '../../shared/types';
import { useAuth } from '../../shared/auth/AuthProvider';

const cardStyle: CSSProperties = {
  background: 'rgba(12, 17, 48, 0.68)',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  borderRadius: '16px',
  padding: '18px',
  display: 'grid',
  gap: '12px',
};

function getNoticeColor(category: string) {
  switch (category) {
    case '긴급':
      return '#f87171';
    case '징계':
      return '#fb923c';
    case '경기공지':
      return '#60a5fa';
    default:
      return '#94a3b8';
  }
}

export default function CommunityPage() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const noticesQuery = query(collection(firestore, 'notices'), orderBy('createdAt', 'desc'), limit(6));
      const postsQuery = query(collection(firestore, 'communityPosts'), orderBy('createdAt', 'desc'), limit(6));

      const [noticesSnap, postsSnap] = await Promise.all([getDocs(noticesQuery), getDocs(postsQuery)]);

      const nextNotices = noticesSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Notice, 'id'>) }));
      const nextPosts = postsSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<CommunityPost, 'id'>) }));

      setNotices(nextNotices);
      setPosts(nextPosts);
    };

    void fetchData().catch(() => {
      setNotices([]);
      setPosts([]);
    });
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '20px', fontWeight: 900 }}>📢 공지사항</h2>
          <Link to="notices" style={{ color: '#93c5fd', fontWeight: 700, textDecoration: 'none' }}>
            전체보기 →
          </Link>
        </div>

        {notices.length === 0 ? (
          <p style={{ margin: 0, color: '#94a3b8' }}>등록된 공지사항이 없습니다.</p>
        ) : (
          notices.map((notice) => (
            <Link
              key={notice.id}
              to={`notices/${notice.id}`}
              style={{
                textDecoration: 'none',
                borderRadius: '10px',
                border: '1px solid rgba(148,163,184,0.16)',
                background: 'rgba(255,255,255,0.04)',
                padding: '10px 12px',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  padding: '2px 7px',
                  borderRadius: '999px',
                  background: getNoticeColor(notice.category),
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '11px',
                }}
              >
                {notice.category}
              </span>
              <span style={{ color: '#e2e8f0', fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {notice.title}
              </span>
              <span style={{ color: '#94a3b8', fontSize: '12px' }}>{new Date(notice.createdAt).toLocaleDateString()}</span>
            </Link>
          ))
        )}
      </section>

      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '20px', fontWeight: 900 }}>💬 자유게시판</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {user ? (
              <Link to="board/new" style={{ color: '#fca5a5', fontWeight: 800, textDecoration: 'none' }}>
                글쓰기
              </Link>
            ) : (
              <Link to="/login" style={{ color: '#fca5a5', fontWeight: 800, textDecoration: 'none' }}>
                로그인 후 작성
              </Link>
            )}
            <Link to="board" style={{ color: '#93c5fd', fontWeight: 700, textDecoration: 'none' }}>
              전체보기 →
            </Link>
          </div>
        </div>

        {posts.length === 0 ? (
          <p style={{ margin: 0, color: '#94a3b8' }}>첫 게시글을 작성해 보세요.</p>
        ) : (
          posts.map((post) => (
            <Link
              key={post.id}
              to={`board/${post.id}`}
              style={{
                textDecoration: 'none',
                borderRadius: '10px',
                border: '1px solid rgba(148,163,184,0.16)',
                background: 'rgba(255,255,255,0.04)',
                padding: '10px 12px',
                display: 'grid',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', color: '#94a3b8', fontSize: '12px' }}>
                <span>{post.authorName}</span>
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
              <strong style={{ color: '#f8fafc', fontSize: '15px' }}>{post.title}</strong>
              <p
                style={{
                  margin: 0,
                  color: '#cbd5e1',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {post.content}
              </p>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
