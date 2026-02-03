import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { firestore } from '../../shared/firebase/client';
import type { CommunityComment, CommunityPost } from '../../shared/types';
import { useAuth } from '../../shared/auth/AuthProvider';
import { useAdmin } from '../../shared/auth/useAdmin';

function deriveAuthorName(email: string | null | undefined, displayName: string | null | undefined) {
  if (displayName?.trim()) return displayName.trim();
  if (email?.trim()) return email.split('@')[0];
  return '리그원';
}

function formatDate(value: number) {
  return new Date(value).toLocaleString('ko-KR');
}

export default function CommunityBoardDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [contentDraft, setContentDraft] = useState('');
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      try {
        const snap = await getDoc(doc(firestore, 'communityPosts', postId));
        if (!snap.exists()) {
          setPost(null);
          return;
        }
        const data = snap.data() as Omit<CommunityPost, 'id'>;
        const next: CommunityPost = { id: snap.id, ...data };
        setPost(next);
        setTitleDraft(next.title);
        setContentDraft(next.content);
      } finally {
        setLoading(false);
      }
    };
    void fetchPost();

    const commentsQuery = query(collection(firestore, 'communityPosts', postId, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const next = snapshot.docs.map((commentDoc) => ({
        id: commentDoc.id,
        ...(commentDoc.data() as Omit<CommunityComment, 'id'>),
      }));
      setComments(next);
    });

    return () => unsubscribe();
  }, [postId]);

  const canManagePost = useMemo(() => {
    if (!post || !user) return false;
    return isAdmin || post.authorUid === user.uid;
  }, [isAdmin, post, user]);

  const handleDeletePost = async () => {
    if (!postId || !canManagePost) return;
    if (!window.confirm('게시글을 삭제할까요?')) return;
    await deleteDoc(doc(firestore, 'communityPosts', postId));
    navigate('/community/board', { replace: true });
  };

  const handleSavePost = async () => {
    if (!postId || !canManagePost) return;
    if (!titleDraft.trim() || !contentDraft.trim()) return;
    const now = Date.now();
    await updateDoc(doc(firestore, 'communityPosts', postId), {
      title: titleDraft.trim(),
      content: contentDraft.trim(),
      updatedAt: now,
    });
    setPost((prev) => (prev ? { ...prev, title: titleDraft.trim(), content: contentDraft.trim(), updatedAt: now } : prev));
    setEditing(false);
  };

  const handleAddComment = async () => {
    if (!postId || !user || !commentText.trim()) return;
    const now = Date.now();
    await addDoc(collection(firestore, 'communityPosts', postId, 'comments'), {
      content: commentText.trim(),
      authorUid: user.uid,
      authorName: deriveAuthorName(user.email, user.displayName),
      createdAt: now,
    });
    setCommentText('');
  };

  const handleDeleteComment = async (commentId: string, authorUid: string) => {
    if (!postId || !user) return;
    if (!(isAdmin || user.uid === authorUid)) return;
    if (!window.confirm('댓글을 삭제할까요?')) return;
    await deleteDoc(doc(firestore, 'communityPosts', postId, 'comments', commentId));
  };

  if (loading) {
    return <div style={{ color: '#cbd5e1' }}>불러오는 중...</div>;
  }

  if (!post) {
    return (
      <div style={{ display: 'grid', gap: '10px' }}>
        <p style={{ margin: 0, color: '#fca5a5', fontWeight: 800 }}>게시글을 찾을 수 없습니다.</p>
        <Link to="/community/board" style={{ color: '#93c5fd', fontWeight: 700 }}>
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gap: '16px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <Link to="/community/board" style={{ color: '#93c5fd', fontWeight: 700, textDecoration: 'none' }}>
          ← 자유게시판 목록
        </Link>
        {canManagePost && !editing && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid rgba(148,163,184,0.35)',
                background: 'rgba(2,6,23,0.55)',
                color: '#e5e7eb',
                fontWeight: 800,
              }}
            >
              수정
            </button>
            <button
              type="button"
              onClick={handleDeletePost}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid rgba(248,113,113,0.45)',
                background: 'rgba(248,113,113,0.14)',
                color: '#fecaca',
                fontWeight: 800,
              }}
            >
              삭제
            </button>
          </div>
        )}
      </header>

      <article
        style={{
          borderRadius: '16px',
          border: '1px solid rgba(148,163,184,0.24)',
          background: 'rgba(12,17,48,0.72)',
          padding: '18px',
          display: 'grid',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', flexWrap: 'wrap', gap: '8px' }}>
          <span>작성자: {post.authorName}</span>
          <span>{formatDate(post.updatedAt ?? post.createdAt)}</span>
        </div>

        {editing ? (
          <>
            <input
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                border: '1px solid rgba(148,163,184,0.35)',
                background: 'rgba(2,6,23,0.55)',
                color: '#e5e7eb',
                fontWeight: 800,
              }}
            />
            <textarea
              value={contentDraft}
              onChange={(event) => setContentDraft(event.target.value)}
              style={{
                minHeight: '260px',
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid rgba(148,163,184,0.35)',
                background: 'rgba(2,6,23,0.55)',
                color: '#e5e7eb',
                lineHeight: 1.6,
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setEditing(false)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(148,163,184,0.35)',
                  background: 'rgba(2,6,23,0.55)',
                  color: '#cbd5e1',
                  fontWeight: 800,
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleSavePost()}
                disabled={!titleDraft.trim() || !contentDraft.trim()}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--hs-red)',
                  color: '#fff',
                  fontWeight: 900,
                  opacity: !titleDraft.trim() || !contentDraft.trim() ? 0.55 : 1,
                  cursor: !titleDraft.trim() || !contentDraft.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                저장
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '28px', fontWeight: 900 }}>{post.title}</h1>
            <p style={{ margin: 0, color: '#e2e8f0', whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>{post.content}</p>
          </>
        )}
      </article>

      <section
        style={{
          borderRadius: '16px',
          border: '1px solid rgba(148,163,184,0.24)',
          background: 'rgba(12,17,48,0.62)',
          padding: '16px',
          display: 'grid',
          gap: '12px',
        }}
      >
        <h3 style={{ margin: 0, color: '#e5e7eb', fontWeight: 900 }}>댓글 {comments.length}</h3>

        <div style={{ display: 'flex', gap: '8px' }}>
          <textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            disabled={!user}
            placeholder={user ? '댓글을 입력하세요.' : '로그인 후 댓글을 작성할 수 있습니다.'}
            style={{
              flex: 1,
              minHeight: '48px',
              padding: '10px',
              borderRadius: '10px',
              border: '1px solid rgba(148,163,184,0.35)',
              background: 'rgba(2,6,23,0.55)',
              color: '#e5e7eb',
              resize: 'vertical',
            }}
          />
          <button
            type="button"
            onClick={() => void handleAddComment()}
            disabled={!user || !commentText.trim()}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: 'none',
              background: 'var(--hs-red)',
              color: '#fff',
              fontWeight: 900,
              opacity: !user || !commentText.trim() ? 0.55 : 1,
            }}
          >
            등록
          </button>
        </div>

        {comments.length === 0 ? (
          <p style={{ margin: 0, color: '#94a3b8' }}>아직 댓글이 없습니다.</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {comments.map((comment) => {
              const canDelete = Boolean(user && (isAdmin || user.uid === comment.authorUid));
              return (
                <article
                  key={comment.id}
                  style={{
                    borderRadius: '12px',
                    border: '1px solid rgba(148,163,184,0.2)',
                    background: 'rgba(2,6,23,0.45)',
                    padding: '12px',
                    display: 'grid',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                      {comment.authorName} · {formatDate(comment.createdAt)}
                    </div>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteComment(comment.id, comment.authorUid)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#fca5a5',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <p style={{ margin: 0, color: '#e2e8f0', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{comment.content}</p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
