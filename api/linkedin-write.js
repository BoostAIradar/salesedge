export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { lead, messageType, sequenceDay, connectionStatus } = req.body;

  if (!lead || !lead.firmName) {
    return res.status(400).json({ error: 'lead with firmName is required' });
  }

  const type = messageType || 'connect_request';

  const typeRules = {
    connect_request: `Write a LinkedIn CONNECTION REQUEST (max 300 characters total). Must reference a specific detail about their firm. No pitch — just a relevance hook. Example tone: "Ray — saw your HOA practice in Miami-Dade. Working with similar firms on deadline management. Would love to connect."`,
    follow_up_dm: `Write a LinkedIn DM (max 500 words). Reference the connection you already have. Mention ONE specific pain point from their profile. Include ONE soft ask (15-min call or demo). No attachments, no links in first DM. Keep it conversational.`,
    content_comment: `Write a LinkedIn COMMENT on their recent post (2-3 sentences). Must add genuine value and subtly position LegalEdge relevance. Be substantive, not sycophantic. End with a question to extend the conversation. No pitch.`,
    inmail: `Write a LinkedIn InMail (max 300 words). Professional but not stiff. Lead with a specific insight relevant to their practice. One clear CTA. Reference something specific about their firm.`,
  };

  const researchContext = [
    lead.researchBrief ? `Research: ${lead.researchBrief}` : '',
    lead.personalizationHooks?.length ? `Hooks: ${lead.personalizationHooks.join('; ')}` : '',
    lead.bestAngle ? `Best Angle: ${lead.bestAngle}` : '',
    lead.painPoints?.length ? `Pain Points: ${lead.painPoints.join('; ')}` : '',
  ].filter(Boolean).join('\n\n');

  const prompt = `Write a LinkedIn ${type.replace(/_/g, ' ')} for this lead.

Lead:
- Firm: ${lead.firmName}
- Contact: ${lead.contactName || 'Unknown'}
- Location: ${lead.city || 'Unknown'}, ${lead.county || 'Unknown'} County, FL
- Practice Area: ${lead.practiceArea || 'Unknown'}
- Firm Size: ${lead.firmSize || 'Unknown'}
- Active Matters: ${lead.matterVolume || 'Unknown'}
${connectionStatus ? `- Connection Status: ${connectionStatus}` : ''}
${sequenceDay ? `- Sequence Day: ${sequenceDay}` : ''}

${researchContext}

Rules: ${typeRules[type] || typeRules.connect_request}

Return ONLY raw JSON:
{
  "message": "the full message text",
  "messageType": "${type}",
  "characterCount": 0,
  "hookUsed": "which personalization hook was referenced",
  "suggestedTiming": "best time to send, e.g. Tuesday 9am ET"
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
        max_tokens: 1000,
        system: 'You are writing LinkedIn outreach for SalesEdge selling LegalEdge to Florida HOA foreclosure and eviction attorneys. Messages must sound like a human practitioner, not a vendor. Never mention AI in subject lines. Be specific to their firm. Return ONLY raw JSON, no markdown.',
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
        return res.status(502).json({ error: 'Failed to parse LinkedIn message response' });
      }
    }

    parsed.characterCount = (parsed.message || '').length;
    return res.status(200).json(parsed);
  } catch (err) {
    console.error('LinkedIn write handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
