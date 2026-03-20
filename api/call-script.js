export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { lead, callType, previousTouches } = req.body;

  if (!lead || !lead.firmName) {
    return res.status(400).json({ error: 'lead with firmName is required' });
  }

  const type = callType || 'cold_call';

  const typeContext = {
    cold_call: 'This is a COLD CALL. They may not know who you are. Be respectful of their time. Ask permission to continue.',
    follow_up: 'This is a FOLLOW-UP call. You have already emailed them. Reference your previous outreach. They may or may not have opened your emails.',
    demo_confirm: 'This is a DEMO CONFIRMATION call. They have agreed to a demo. Confirm time, prep them on what to expect, build excitement.',
  };

  const touchHistory = previousTouches?.length
    ? `Previous touches: ${previousTouches.map(t => `Day ${t.day}: ${t.channel} - ${t.action}`).join(', ')}`
    : 'No previous touches.';

  const researchContext = [
    lead.researchBrief ? `Research: ${lead.researchBrief}` : '',
    lead.painPoints?.length ? `Pain Points: ${lead.painPoints.join('; ')}` : '',
    lead.bestAngle ? `Best Angle: ${lead.bestAngle}` : '',
    lead.competitorAlert ? `Competitor: ${lead.competitorAlert}` : '',
  ].filter(Boolean).join('\n\n');

  const prompt = `Generate a complete call script for this sales call.

Lead:
- Firm: ${lead.firmName}
- Contact: ${lead.contactName || 'the attorney'}
- Location: ${lead.city || 'Unknown'}, ${lead.county || 'Unknown'} County, FL
- Practice Area: ${lead.practiceArea || 'Unknown'}
- Firm Size: ${lead.firmSize || 'Unknown'}
- Active Matters: ${lead.matterVolume || 'Unknown'}

${researchContext}

Call Type: ${type}
Context: ${typeContext[type]}
${touchHistory}

Return ONLY raw JSON:
{
  "opener": "exact opening line including their name",
  "permissionAsk": "ask permission to take 30 seconds",
  "painProbe": ["question 1 about their specific pain", "question 2 about their workflow", "question 3 about their growth"],
  "pivot": "transition from pain to LegalEdge solution",
  "demoAsk": "specific ask for a 15-minute demo",
  "objectionHandlers": {
    "not interested": "response",
    "already have software": "response",
    "too busy": "response",
    "too expensive": "response",
    "send me info": "response",
    "call me later": "response"
  },
  "voicemailScript": "complete voicemail script under 30 seconds",
  "closeOptions": {
    "strong": "direct close for demo booking",
    "soft": "softer close leaving door open"
  }
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
        max_tokens: 2500,
        system: 'You are a sales call script writer for SalesEdge, selling LegalEdge — an AI OS for Florida real estate litigation firms. Write scripts that sound natural and conversational, not robotic. Reference specific details about the firm. Pain probes should be genuinely curious, not leading. Objection handlers should be empathetic and specific to legal tech. Return ONLY raw JSON, no markdown.',
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
        return res.status(502).json({ error: 'Failed to parse call script response' });
      }
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Call script handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
