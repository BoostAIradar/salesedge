export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { platform, content, scheduledAt, postId } = req.body;

  if (!platform || !content) {
    return res.status(400).json({ error: 'platform and content are required' });
  }

  try {
    let result;

    switch (platform) {
      case 'linkedin':
        result = await publishLinkedIn(content);
        break;
      case 'instagram':
        result = await publishInstagram(content);
        break;
      case 'facebook':
        result = await publishFacebook(content);
        break;
      case 'google':
        result = await publishGoogle(content);
        break;
      default:
        return res.status(400).json({ error: `Unsupported platform: ${platform}` });
    }

    return res.status(200).json({
      platformPostId: result.id || `${platform}-${Date.now()}`,
      publishedAt: new Date().toISOString(),
      url: result.url || null,
    });
  } catch (err) {
    console.error(`Social publish error (${platform}):`, err);
    return res.status(502).json({
      error: 'Publish failed',
      platform,
      message: err.message,
    });
  }
}

async function publishLinkedIn(content) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token || token === 'your_token_here') {
    throw new Error('LINKEDIN_ACCESS_TOKEN not configured');
  }

  const meRes = await fetch('https://api.linkedin.com/v2/me', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!meRes.ok) throw new Error(`LinkedIn auth failed: ${meRes.status}`);
  const me = await meRes.json();

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      author: `urn:li:person:${me.id}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LinkedIn publish failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return { id: data.id, url: null };
}

async function publishInstagram(content) {
  const token = process.env.META_ACCESS_TOKEN;
  const igId = process.env.INSTAGRAM_BUSINESS_ID;
  if (!token || token === 'your_token_here' || !igId) {
    throw new Error('Instagram credentials not configured');
  }

  // Instagram requires media — for text posts, create a carousel or use image
  // For now, we create a media container (would need image_url in production)
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${igId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: content,
        access_token: token,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Instagram publish failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return { id: data.id, url: null };
}

async function publishFacebook(content) {
  const token = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;
  if (!token || token === 'your_token_here' || !pageId) {
    throw new Error('Facebook credentials not configured');
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/feed`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: content,
        access_token: token,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Facebook publish failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return { id: data.id, url: `https://facebook.com/${data.id}` };
}

async function publishGoogle(content) {
  const token = process.env.GOOGLE_BUSINESS_ACCESS_TOKEN;
  const locationId = process.env.GOOGLE_LOCATION_ID;
  if (!token || token === 'your_token_here' || !locationId) {
    throw new Error('Google Business credentials not configured');
  }

  const response = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationId}/localPosts`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        languageCode: 'en',
        summary: content,
        topicType: 'STANDARD',
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google publish failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return { id: data.name, url: data.searchUrl || null };
}
