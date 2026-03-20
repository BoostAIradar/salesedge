import { useState, useCallback, useEffect } from 'react';

const REPORTS_KEY = 'salesedge:reports';

function loadReports() {
  try {
    const stored = localStorage.getItem(REPORTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load reports:', e);
  }
  return [];
}

function saveReports(reports) {
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  } catch (e) {
    console.error('Failed to save reports:', e);
  }
}

export function useReports() {
  const [reports, setReports] = useState(loadReports);

  useEffect(() => {
    saveReports(reports);
  }, [reports]);

  const addReport = useCallback((reportData) => {
    const newReport = {
      id: `report-${Date.now()}`,
      ...reportData,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setReports(prev => [newReport, ...prev]);
    return newReport;
  }, []);

  const markRead = useCallback((id) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, read: true } : r));
  }, []);

  const getLatest = useCallback(() => {
    return reports.length > 0 ? reports[0] : null;
  }, [reports]);

  const hasUnread = useCallback(() => {
    return reports.some(r => !r.read);
  }, [reports]);

  return { reports, addReport, markRead, getLatest, hasUnread };
}
