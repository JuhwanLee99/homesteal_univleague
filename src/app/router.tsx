import { Navigate, createBrowserRouter } from 'react-router-dom';
import Layout from './Layout';
import LandingPage from '../front/pages/LandingPage';
import IntroPage from '../front/pages/IntroPage';
import RulePage from '../front/pages/RulePage';
import TeamsPage from '../front/pages/TeamsPage';
import PrivacyPage from '../features/front/pages/PrivacyPage';
import TermsPage from '../features/front/pages/TermsPage';
import AccountDeletionPage from '../features/front/pages/AccountDeletionPage';
import ManualPage from './pages/ManualPage';
import RecordPage from './pages/RecordPage';
import CommunityPage from './pages/CommunityPage';
import CommunityNoticesPage from './pages/CommunityNoticesPage';
import NoticeWritePage from './pages/NoticeWritePage';
import NoticeDetailPage from './pages/NoticeDetailPage';
import CommunityBoardPage from './pages/CommunityBoardPage';
import CommunityBoardWritePage from './pages/CommunityBoardWritePage';
import CommunityBoardDetailPage from './pages/CommunityBoardDetailPage';
import InquiryBoardPage from './pages/InquiryBoardPage';
import InquiryWritePage from './pages/InquiryWritePage';
import InquiryDetailPage from './pages/InquiryDetailPage';
import PlayerRegistrationBoardPage from './pages/PlayerRegistrationBoardPage';
import PlayerRegistrationWritePage from './pages/PlayerRegistrationWritePage';
import PlayerRegistrationDetailPage from './pages/PlayerRegistrationDetailPage';
import MatchSchedulePage from './pages/MatchSchedulePage';
import ScheduleGroupsPage from './pages/ScheduleGroupsPage';
import ScheduleResultsPage from './pages/ScheduleResultsPage';
import ScheduleManagePage from './pages/ScheduleManagePage';
import ScheduleLivePage from './pages/ScheduleLivePage';
import SchedulePracticePage from './pages/SchedulePracticePage';
import PredictionPage from './pages/PredictionPage';
import PlayerDetailPage from './pages/PlayerDetailPage';
import LoginPage from './pages/LoginPage';
import AccessDeniedPage from './pages/AccessDeniedPage';
import AccountPage from './pages/AccountPage';
import ScoreboardPage from '../features/scoreboard/pages/ScoreboardPage';
import ScoreboardTextPage from '../features/scoreboard/pages/ScoreboardTextPage';
import ScoreboardLiveOverlayPage from '../features/scoreboard/pages/ScoreboardLiveOverlayPage';
import ScorekeeperPage from '../features/scorekeeper/pages/ScorekeeperPage';
import { RequireAdmin } from '../shared/auth/RequireAdmin';
import { MaintenanceGuard } from '../shared/auth/MaintenanceGuard';
import { RequireAuth } from '../shared/auth/RequireAuth';
import { RequirePlayerOrAbove } from '../shared/auth/RequirePlayerOrAbove';
import { RequireScorerOrAdmin } from '../shared/auth/RequireScorerOrAdmin';
import { useAdmin } from '../shared/auth/useAdmin';
import AdminLayoutPage from './pages/admin/AdminLayoutPage';
import AdminBrandPage from './pages/admin/AdminBrandPage';
import AdminLandingPage from './pages/admin/AdminLandingPage';
import AdminIntroPage from './pages/admin/AdminIntroPage';
import AdminRulesPage from './pages/admin/AdminRulesPage';
import AdminTeamsPage from './pages/admin/AdminTeamsPage';
import AdminRolesPage from './pages/admin/AdminRolesPage';
import AdminGamesPage from './pages/admin/AdminGamesPage';
import AdminGameEditPage from './pages/admin/AdminGameEditPage';
import AdminMaintenancePage from './pages/admin/AdminMaintenancePage';
import AdminModerationPage from './pages/admin/AdminModerationPage';

function AdminIndexRedirect() {
  const { isAdmin, canEditGameRecords, loading } = useAdmin();

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#cbd5e1' }}>
        권한 확인 중...
      </div>
    );
  }

  if (isAdmin) return <Navigate to="landing" replace />;
  if (canEditGameRecords) return <Navigate to="games" replace />;
  return <Navigate to="/access-denied" replace />;
}

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
        path: 'privacy',
        element: <PrivacyPage />,
      },
      {
        path: 'terms',
        element: <TermsPage />,
      },
      {
        path: 'account-deletion',
        element: <AccountDeletionPage />,
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
        element: <Navigate to="/records?tab=standings" replace />,
      },
      {
        path: 'standings/power-ranking',
        element: <Navigate to="/records?tab=standings" replace />,
      },
      {
        path: 'prediction',
        element: <PredictionPage />,
      },
      {
        path: 'community',
        children: [
          { index: true, element: <CommunityPage /> },
          { path: 'notices', element: <CommunityNoticesPage /> },
          {
            path: 'notices/new',
            element: (
              <RequireAdmin>
                <NoticeWritePage />
              </RequireAdmin>
            ),
          },
          { path: 'notices/:noticeId', element: <NoticeDetailPage /> },
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
          { path: 'inquiry', element: <InquiryBoardPage /> },
          { path: 'inquiry/new', element: <InquiryWritePage /> },
          { path: 'inquiry/:inquiryId', element: <InquiryDetailPage /> },
          {
            path: 'player-registration',
            element: (
              <RequirePlayerOrAbove>
                <PlayerRegistrationBoardPage />
              </RequirePlayerOrAbove>
            ),
          },
          {
            path: 'player-registration/new',
            element: (
              <RequirePlayerOrAbove>
                <PlayerRegistrationWritePage />
              </RequirePlayerOrAbove>
            ),
          },
          {
            path: 'player-registration/:postId',
            element: (
              <RequirePlayerOrAbove>
                <PlayerRegistrationDetailPage />
              </RequirePlayerOrAbove>
            ),
          },
        ],
      },
      {
        path: 'schedule',
        element: <MatchSchedulePage />,
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
        element: <ScheduleGroupsPage />,
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
        element: <Navigate to="/records?tab=pitchers" replace />,
      },
      {
        path: 'records/batters',
        element: <Navigate to="/records?tab=batters" replace />,
      },
      {
        path: 'records/player',
        element: <PlayerDetailPage />,
      },
      {
        path: 'records/player/:playerId',
        element: <PlayerDetailPage />,
      },
      {
        path: 'scoreboard',
        element: <ScoreboardPage />,
      },
      {
        path: 'scoreboard/:matchId',
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
        path: 'live-overlay/:matchId',
        element: <ScoreboardLiveOverlayPage />,
      },
      {
        path: 'scorekeeper',
        element: (
          <RequireScorerOrAdmin>
            <ScorekeeperPage />
          </RequireScorerOrAdmin>
        ),
      },
      {
        path: 'scorekeeper/:matchId',
        element: (
          <RequireScorerOrAdmin>
            <ScorekeeperPage />
          </RequireScorerOrAdmin>
        ),
      },
      {
        path: 'admin',
        element: (
          <RequireScorerOrAdmin>
            <AdminLayoutPage />
          </RequireScorerOrAdmin>
        ),
        children: [
          { index: true, element: <AdminIndexRedirect /> },
          {
            path: 'brand',
            element: (
              <RequireAdmin>
                <AdminBrandPage />
              </RequireAdmin>
            ),
          },
          {
            path: 'landing',
            element: (
              <RequireAdmin>
                <AdminLandingPage />
              </RequireAdmin>
            ),
          },
          {
            path: 'intro',
            element: (
              <RequireAdmin>
                <AdminIntroPage />
              </RequireAdmin>
            ),
          },
          {
            path: 'rules',
            element: (
              <RequireAdmin>
                <AdminRulesPage />
              </RequireAdmin>
            ),
          },
          {
            path: 'teams',
            element: (
              <RequireAdmin>
                <AdminTeamsPage />
              </RequireAdmin>
            ),
          },
          {
            path: 'roles',
            element: (
              <RequireAdmin>
                <AdminRolesPage />
              </RequireAdmin>
            ),
          },
          { path: 'games', element: <AdminGamesPage /> },
          { path: 'games/:matchId', element: <AdminGameEditPage /> },
          {
            path: 'maintenance',
            element: (
              <RequireAdmin>
                <AdminMaintenancePage />
              </RequireAdmin>
            ),
          },
          {
            path: 'moderation',
            element: (
              <RequireAdmin>
                <AdminModerationPage />
              </RequireAdmin>
            ),
          },
        ],
      },
      {
        path: 'player',
        element: <PlayerDetailPage />,
      },
      {
        path: 'player/:playerId',
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
