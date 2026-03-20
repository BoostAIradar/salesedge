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

export default function App() {
  const { leads, importLead, updateStage, updateLead, deleteLead } = useLeads();

  return (
    <BrowserRouter>
      <div style={styles.layout}>
        <Sidebar />
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
            <Route path="/content" element={<ContentCalendar />} />
            <Route path="/inbox" element={<UnifiedInbox />} />
            <Route path="/reports" element={<WeeklyReport />} />
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
