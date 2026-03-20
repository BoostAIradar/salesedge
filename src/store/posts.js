import { useState, useCallback, useEffect } from 'react';

const POSTS_KEY = 'salesedge:posts';

function loadPosts() {
  try {
    const stored = localStorage.getItem(POSTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load posts:', e);
  }
  return [];
}

function savePosts(posts) {
  try {
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  } catch (e) {
    console.error('Failed to save posts:', e);
  }
}

export function usePosts() {
  const [posts, setPosts] = useState(loadPosts);

  useEffect(() => {
    savePosts(posts);
  }, [posts]);

  const addPost = useCallback((postData) => {
    const newPost = {
      id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      platform: postData.platform || 'linkedin',
      content: postData.content || '',
      hashtags: postData.hashtags || [],
      topic: postData.topic || '',
      format: postData.format || 'standard',
      hook: postData.hook || '',
      callToAction: postData.callToAction || '',
      status: postData.status || 'draft',
      scheduledAt: postData.scheduledAt || null,
      publishedAt: null,
      platformPostId: null,
      metrics: { impressions: 0, engagements: 0, engagementRate: 0, profileVisits: 0, clicks: 0 },
      calendarWeek: postData.calendarWeek || getWeekString(new Date()),
      claudeGenerated: postData.claudeGenerated || false,
      createdAt: new Date().toISOString(),
    };
    setPosts(prev => [newPost, ...prev]);
    return newPost;
  }, []);

  const updatePost = useCallback((id, updates) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const deletePost = useCallback((id) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  }, []);

  const getPostsByWeek = useCallback((weekStr) => {
    return posts.filter(p => p.calendarWeek === weekStr);
  }, [posts]);

  const getScheduledCount = useCallback(() => {
    return posts.filter(p => p.status === 'scheduled' || p.status === 'draft').length;
  }, [posts]);

  return { posts, addPost, updatePost, deletePost, getPostsByWeek, getScheduledCount };
}

export function getWeekString(date) {
  const d = new Date(date);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return monday.toISOString().split('T')[0];
}

export function getWeekDates(weekStr) {
  const monday = new Date(weekStr + 'T00:00:00');
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}
