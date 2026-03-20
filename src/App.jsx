import { useMemo, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { colors } from './styles/tokens';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Notifications from './components/Notifications';
import Pipeline from './views/Pipeline';
import LeadProfile from './views/LeadProfile';
import EmailPerformance from './views/EmailPerformance';
import MorningBriefing from './views/MorningBriefing';
import ContentCalendar from './views/ContentCalendar';
import UnifiedInbox from './views/UnifiedInbox';
import WeeklyReport from './views/WeeklyReport';
import { useLeads } from './store/leads';
import { usePosts } from './store/posts';
import { useInbox } from './store/inbox';
import { useReports } from './store/reports';
import { useNotifications } from './store/notifications';
import { getTodayActions } from './engine/sequence';
import { runWeeklyImprovement, scheduleSequenceActions, detectWinningPatterns } from './engine/learning';

export default function App() {
  const { leads, importLead, updateStage, updateLead, deleteLead } = useLeads();
  const { posts, addPost, updatePost, deletePost, getScheduledCount } = usePosts();
  const { messages, addMessage, updateMessage, markRead, getUnreadCount } = useInbox();
  const { reports, addReport, markRead: markReportRead, getLatest, hasUnread: hasUnreadReport } = useReports();
  const { notifications, toasts, addNotification, dismissToast, markAllRead, getUnreadCount: getNotifUnread } = useNotifications();
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const todayActionCount = useMemo(() => {
    return leads ? getTodayActions(leads).length : 0;
  }, [leads]);

  const scheduledPostCount = getScheduledCount();
  const unreadInboxCount = getUnreadCount();
  const latestReport = getLatest();
  const lastReportDate = latestReport?.generatedAt
    ? new Date(latestReport.generatedAt).toLocaleDateString()
    : null;

  // Auto-improvement on app load
  useEffect(() => {
    if (!leads) return;

    // Schedule sequence actions
    scheduleSequenceActions(leads);

    // Weekly improvement (Monday 9am+)
    runWeeklyImprovement().then(report => {
      if (report) {
        addNotification('insight', 'Weekly analysis complete. Check the report for strategy decisions.', true);
      }
    });

    // Detect winning patterns
    const winner = detectWinningPatterns();
    if (winner) {
      addNotification('insight', winner.message, true);
    }
  }, [leads]);

  // System status
  const systemStatus = useMemo(() => {
    if (!leads) return 'ok';
    const stalled = leads.filter(l => {
      if (l.stage === 'closed' || l.stage === 'dead') return false;
      const hist = l.sequenceHistory || [];
      if (hist.length === 0) return false;
      const last = new Date(hist[hist.length - 1].completedAt);
      return (new Date() - last) > 7 * 24 * 60 * 60 * 1000;
    }).length;
    if (stalled > 3) return 'warning';
    return 'ok';
  }, [leads]);

  return (
    <BrowserRouter>
      <div style={styles.layout}>
        <Sidebar
          todayActionCount={todayActionCount}
          scheduledPostCount={scheduledPostCount}
          unreadInboxCount={unreadInboxCount}
          hasUnreadReport={hasUnreadReport()}
          lastReportDate={lastReportDate}
        />
        <div style={styles.mainArea}>
          <Topbar
            leads={leads}
            notificationCount={getNotifUnread()}
            onBellClick={() => { setShowNotifPanel(!showNotifPanel); markAllRead(); }}
            systemStatus={systemStatus}
          />
          <main style={styles.main}>
            <Routes>
              <Route
                path="/"
                element={
                  <Pipeline
                    leads={leads}
                    importLead={importLead}
                    updateLead={updateLead}
                  />
                }
              />
              <Route
                path="/lead/:id"
                element={
                  <LeadProfile
                    leads={leads}
                    updateStage={updateStage}
                    updateLead={updateLead}
                  />
                }
              />
              <Route path="/email-performance" element={<EmailPerformance />} />
              <Route
                path="/morning"
                element={
                  <MorningBriefing
                    leads={leads}
                    updateLead={updateLead}
                    updateStage={updateStage}
                    posts={posts}
                    inboxMessages={messages}
                    addNotification={addNotification}
                  />
                }
              />
              <Route
                path="/content"
                element={
                  <ContentCalendar
                    posts={posts}
                    addPost={addPost}
                    updatePost={updatePost}
                    deletePost={deletePost}
                  />
                }
              />
              <Route
                path="/inbox"
                element={
                  <UnifiedInbox
                    messages={messages}
                    updateMessage={updateMessage}
                    markRead={markRead}
                    leads={leads}
                  />
                }
              />
              <Route
                path="/reports"
                element={
                  <WeeklyReport
                    leads={leads}
                    reports={reports}
                    addReport={addReport}
                    markReportRead={markReportRead}
                  />
                }
              />
            </Routes>
          </main>
        </div>
        <Notifications toasts={toasts} onDismiss={dismissToast} />
      </div>
    </BrowserRouter>
  );
}

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    background: colors.bg0,
  },
  mainArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
};
