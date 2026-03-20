export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { platform, topic, format, weekTheme, winningTopics, targetICP } = req.body;

  if (!platform || !topic) {
    return res.status(400).json({ error: 'platform and topic are required' });
  }

  const platformRules = {
    linkedin: '150-300 words. Hook on the first line — make it stop the scroll. 3-5 short paragraphs. No hashtag spam (max 3). Professional but direct tone. No emojis in body. End with a clear insight or takeaway, not a sales pitch.',
    instagram: '80-150 words. Visual caption style. 5-8 hashtags at the end. Emoji allowed sparingly (1-2 max). Punchy and scannable. First line is the hook.',
    facebook: '100-200 words. Conversational and community-focused. End with a question to drive comments. Warm but authoritative tone. 2-3 hashtags max.',
    google: '100-150 words. Local SEO aware — include Miami-Dade, Broward, South Florida, or specific city names naturally. Service-focused. Professional. No hashtags. Include a subtle CTA.',
  };

  const prompt = `Write a ${platform} post about: "${topic}"

Platform Rules: ${platformRules[platform] || platformRules.linkedin}
${weekTheme ? `Week Theme: ${weekTheme}` : ''}
${winningTopics?.length ? `Topics performing well recently: ${winningTopics.join(', ')}` : ''}
${targetICP ? `Target ICP: ${targetICP}` : 'Target: Solo and small firm HOA foreclosure and eviction attorneys in Miami-Dade and Broward County, Florida'}
${format ? `Format: ${format}` : ''}

Return ONLY raw JSON:
{
  "content": "the full post content ready to publish",
  "hashtags": ["relevant", "hashtags"],
  "platform": "${platform}",
  "topic": "${topic}",
  "format": "${format || 'standard'}",
  "hook": "the first line / hook of the post",
  "callToAction": "the CTA used"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: 'You are a content strategist and copywriter for LegalEdge — an AI operating system for Florida real estate litigation firms. Write content that builds authority with solo and small firm HOA foreclosure and eviction attorneys in Miami-Dade and Broward. Content must be specific, credible, and useful — never generic AI marketing fluff. Speak like a practitioner, not a vendor. Return ONLY raw JSON, no markdown.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      return res.status(502).json({ error: 'Anthropic API error', status: response.status });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return res.status(502).json({ error: 'Failed to parse social content response' });
      }
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Social write handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
