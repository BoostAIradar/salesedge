import { useMemo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { colors } from './styles/tokens';
import Sidebar from './components/Sidebar';
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
import { getTodayActions } from './engine/sequence';

export default function App() {
  const { leads, importLead, updateStage, updateLead, deleteLead } = useLeads();
  const { posts, addPost, updatePost, deletePost, getScheduledCount } = usePosts();
  const { messages, addMessage, updateMessage, markRead, getUnreadCount } = useInbox();
  const { reports, addReport, markRead: markReportRead, getLatest, hasUnread: hasUnreadReport } = useReports();

  const todayActionCount = useMemo(() => {
    return leads ? getTodayActions(leads).length : 0;
  }, [leads]);

  const scheduledPostCount = getScheduledCount();
  const unreadInboxCount = getUnreadCount();
  const latestReport = getLatest();
  const lastReportDate = latestReport?.generatedAt
    ? new Date(latestReport.generatedAt).toLocaleDateString()
    : null;

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
    </BrowserRouter>
  );
}

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    background: colors.bg0,
  },
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
};
