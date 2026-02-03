import { Navigate, createBrowserRouter } from 'react-router-dom';
import Layout from './Layout';
import LandingPage from '../front/pages/LandingPage';
import IntroPage from '../front/pages/IntroPage';
import RulePage from '../front/pages/RulePage';
import TeamsPage from '../front/pages/TeamsPage';
import StandingsPage from './pages/StandingPage';
import RecordPage from './pages/RecordPage';
import CommunityPage from './pages/CommunityPage';
import CommunityNoticesPage from './pages/CommunityNoticesPage'; // 새로 추가
import NoticeWritePage from './pages/NoticeWritePage'; // 새로 추가
import NoticeDetailPage from './pages/NoticeDetailPage'; // 새로 추가
import CommunityBoardPage from './pages/CommunityBoardPage';
import CommunityBoardWritePage from './pages/CommunityBoardWritePage';
import CommunityBoardDetailPage from './pages/CommunityBoardDetailPage';
import ManualPage from './pages/ManualPage';
import ScoreboardPage from '../scoreboard/pages/ScoreboardPage';
import ScoreboardTextPage from '../scoreboard/pages/ScoreboardTextPage';
import ScoreboardLiveOverlayPage from '../scoreboard/pages/ScoreboardLiveOverlayPage';
import ScorekeeperPage from '../scorekeeper/pages/ScorekeeperPage';
import PitcherRecordPage from './pages/PitcherRecordPage';
import BatterRecordPage from './pages/BatterRecordPage';
import PlayerDetailPage from './pages/PlayerDetailPage';
import ScheduleGroupsPage from './pages/ScheduleGroupsPage';
import ScheduleResultsPage from './pages/ScheduleResultsPage';
import ScheduleManagePage from './pages/ScheduleManagePage';
import ScheduleLivePage from './pages/ScheduleLivePage';
import SchedulePracticePage from './pages/SchedulePracticePage';
import PowerRankingPage from './pages/PowerRankingPage';
import LoginPage from './pages/LoginPage';
import AccessDeniedPage from './pages/AccessDeniedPage';
import AccountPage from './pages/AccountPage';
import { RequireAdmin } from '../shared/auth/RequireAdmin';
import { MaintenanceGuard } from '../shared/auth/MaintenanceGuard';
import { RequireAuth } from '../shared/auth/RequireAuth';
import AdminLayoutPage from './pages/admin/AdminLayoutPage';
import AdminBrandPage from './pages/admin/AdminBrandPage';
import AdminLandingPage from './pages/admin/AdminLandingPage';
import AdminIntroPage from './pages/admin/AdminIntroPage';
import AdminRulesPage from './pages/admin/AdminRulesPage';
import AdminTeamsPage from './pages/admin/AdminTeamsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <MaintenanceGuard>
        <Layout />
      </MaintenanceGuard>
    ),
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: 'intro',
        element: <IntroPage />,
      },
      {
        path: 'rules',
        element: <RulePage />,
      },
      {
        path: 'intro/teams',
        element: <TeamsPage />,
      },
      {
        path: 'manual',
        element: <ManualPage />,
      },
      {
        path: 'standings',
        element: <StandingsPage />,
      },
      {
        path: 'standings/power-ranking',
        element: <PowerRankingPage />,
      },
      {
        path: 'prediction',
        element: <Navigate to="/schedule" replace />,
      },
      {
        path: 'community',
        children: [
          { index: true, element: <CommunityPage /> }, // 메인 대시보드
          { path: 'gallery', element: <Navigate to="/community" replace /> },
          { path: 'notices', element: <CommunityNoticesPage /> }, // 공지 목록
          { path: 'board', element: <CommunityBoardPage /> },
          {
            path: 'board/new',
            element: (
              <RequireAuth>
                <CommunityBoardWritePage />
              </RequireAuth>
            ),
          },
          { path: 'board/:postId', element: <CommunityBoardDetailPage /> },
          { 
            path: 'notices/new', 
            element: (
              <RequireAdmin>
                <NoticeWritePage />
              </RequireAdmin>
            ) 
          }, // 공지 작성 (관리자만)
          // 개별 공지 상세 페이지가 필요하다면 'notices/:id' 추가 가능
          { path: 'notices/:noticeId', element: <NoticeDetailPage /> },
        ]
      },
      {
        path: 'schedule',
        element: <ScheduleGroupsPage />,
      },
      {
        path: 'schedule/live',
        element: <ScheduleLivePage />,
      },
      {
        path: 'schedule/results',
        element: <ScheduleResultsPage />,
      },
      {
        path: 'schedule/groups',
        element: <Navigate to="/schedule" replace />,
      },
      {
        path: 'schedule/practice',
        element: <SchedulePracticePage />,
      },
      {
        path: 'schedule/manage',
        element: (
          <RequireAdmin>
            <ScheduleManagePage />
          </RequireAdmin>
        ),
      },
      {
        path: 'records',
        element: <RecordPage />,
      },
      {
        path: 'records/pitchers',
        element: <PitcherRecordPage />,
      },
      {
        path: 'records/batters',
        element: <BatterRecordPage />,
      },
      {
        path: 'scoreboard',
        element: <ScoreboardPage />,
      },
      {
        path: 'scoreboard-text',
        element: <ScoreboardTextPage />,
      },
      {
        path: 'scoreboard-text/:matchId',
        element: <ScoreboardTextPage />,
      },
      {
        path: 'live-overlay',
        element: <ScoreboardLiveOverlayPage />,
      },
      {
        path: 'scorekeeper',
        element: (
          <RequireAdmin>
            <ScorekeeperPage />
          </RequireAdmin>
        ),
      },
      {
        path: 'admin',
        element: (
          <RequireAdmin>
            <AdminLayoutPage />
          </RequireAdmin>
        ),
        children: [
          { index: true, element: <Navigate to="brand" replace /> },
          { path: 'brand', element: <AdminBrandPage /> },
          { path: 'landing', element: <AdminLandingPage /> },
          { path: 'intro', element: <AdminIntroPage /> },
          { path: 'rules', element: <AdminRulesPage /> },
          { path: 'teams', element: <AdminTeamsPage /> },
        ],
      },
      {
        path: 'player/:name',
        element: <PlayerDetailPage />,
      },
      {
        path: 'account',
        element: <AccountPage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'access-denied',
        element: <AccessDeniedPage />,
      },
    ],
  },
]);
