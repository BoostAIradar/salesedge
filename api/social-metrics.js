export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { platform, postId, platformPostId } = req.query;

  if (!platform || !platformPostId) {
    return res.status(400).json({ error: 'platform and platformPostId are required' });
  }

  try {
    let metrics;

    switch (platform) {
      case 'linkedin':
        metrics = await getLinkedInMetrics(platformPostId);
        break;
      case 'instagram':
        metrics = await getInstagramMetrics(platformPostId);
        break;
      case 'facebook':
        metrics = await getFacebookMetrics(platformPostId);
        break;
      case 'google':
        metrics = await getGoogleMetrics(platformPostId);
        break;
      default:
        return res.status(400).json({ error: `Unsupported platform: ${platform}` });
    }

    return res.status(200).json({
      postId: postId || null,
      platformPostId,
      platform,
      ...metrics,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`Social metrics error (${platform}):`, err);
    return res.status(502).json({
      error: 'Metrics fetch failed',
      platform,
      message: err.message,
    });
  }
}

async function getLinkedInMetrics(postId) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token || token === 'your_token_here') {
    return defaultMetrics();
  }

  try {
    const response = await fetch(
      `https://api.linkedin.com/v2/socialActions/${postId}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!response.ok) return defaultMetrics();

    const data = await response.json();
    return {
      impressions: data.impressionCount || 0,
      engagements: (data.likeCount || 0) + (data.commentCount || 0) + (data.shareCount || 0),
      engagementRate: data.impressionCount > 0
        ? ((data.likeCount || 0) + (data.commentCount || 0) + (data.shareCount || 0)) / data.impressionCount
        : 0,
      profileVisits: data.clickCount || 0,
      clicks: data.clickCount || 0,
    };
  } catch {
    return defaultMetrics();
  }
}

async function getInstagramMetrics(postId) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token || token === 'your_token_here') {
    return defaultMetrics();
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${postId}/insights?metric=impressions,reach,likes,comments,saved&access_token=${token}`
    );

    if (!response.ok) return defaultMetrics();

    const data = await response.json();
    const metrics = {};
    (data.data || []).forEach(m => {
      metrics[m.name] = m.values?.[0]?.value || 0;
    });

    const engagements = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.saved || 0);
    return {
      impressions: metrics.impressions || 0,
      engagements,
      engagementRate: metrics.impressions > 0 ? engagements / metrics.impressions : 0,
      profileVisits: metrics.reach || 0,
      clicks: 0,
    };
  } catch {
    return defaultMetrics();
  }
}

async function getFacebookMetrics(postId) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token || token === 'your_token_here') {
    return defaultMetrics();
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${postId}/insights?metric=post_impressions,post_engaged_users,post_clicks&access_token=${token}`
    );

    if (!response.ok) return defaultMetrics();

    const data = await response.json();
    const metrics = {};
    (data.data || []).forEach(m => {
      metrics[m.name] = m.values?.[0]?.value || 0;
    });

    return {
      impressions: metrics.post_impressions || 0,
      engagements: metrics.post_engaged_users || 0,
      engagementRate: metrics.post_impressions > 0
        ? (metrics.post_engaged_users || 0) / metrics.post_impressions
        : 0,
      profileVisits: 0,
      clicks: metrics.post_clicks || 0,
    };
  } catch {
    return defaultMetrics();
  }
}

async function getGoogleMetrics(postId) {
  const token = process.env.GOOGLE_BUSINESS_ACCESS_TOKEN;
  if (!token || token === 'your_token_here') {
    return defaultMetrics();
  }

  try {
    const response = await fetch(
      `https://mybusiness.googleapis.com/v4/${postId}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!response.ok) return defaultMetrics();

    const data = await response.json();
    const sm = data.searchMetrics || {};
    return {
      impressions: sm.viewCount || 0,
      engagements: (sm.clickCount || 0) + (sm.callCount || 0),
      engagementRate: sm.viewCount > 0
        ? ((sm.clickCount || 0) + (sm.callCount || 0)) / sm.viewCount
        : 0,
      profileVisits: sm.directionRequestCount || 0,
      clicks: sm.clickCount || 0,
    };
  } catch {
    return defaultMetrics();
  }
}

function defaultMetrics() {
  return { impressions: 0, engagements: 0, engagementRate: 0, profileVisits: 0, clicks: 0 };
}
