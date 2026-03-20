export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { lead, sequenceDay, templateHints } = req.body;

  if (!lead || !lead.firmName) {
    return res.status(400).json({ error: 'lead with firmName is required' });
  }

  const day = sequenceDay || 1;

  let dayInstruction;
  if (day <= 1) {
    dayInstruction = 'This is the FIRST cold outreach email. Introduce yourself and LegalEdge. Be direct, reference a specific pain point, and end with a clear CTA for a 15-minute call.';
  } else if (day <= 5) {
    dayInstruction = 'This is a FOLLOW-UP email (Day ' + day + '). Reference that you reached out previously with no reply. Add a new angle or insight. Keep it shorter than the first email. Do not be passive-aggressive.';
  } else {
    dayInstruction = 'This is the FINAL breakup email (Day ' + day + '). Keep it very short (3-4 sentences). Let them know this is your last outreach. Leave the door open. No guilt-tripping.';
  }

  const researchContext = [
    lead.researchBrief ? `Research Brief: ${lead.researchBrief}` : '',
    lead.personalizationHooks?.length ? `Personalization Hooks: ${lead.personalizationHooks.join('; ')}` : '',
    lead.bestAngle ? `Best Angle: ${lead.bestAngle}` : '',
    lead.painPoints?.length ? `Pain Points: ${lead.painPoints.join('; ')}` : '',
    lead.suggestedSubject ? `Suggested Subject: ${lead.suggestedSubject}` : '',
    templateHints ? `Additional Hints: ${templateHints}` : '',
  ].filter(Boolean).join('\n\n');

  const prompt = `Write a cold outreach email for this lead.

Lead:
- Firm: ${lead.firmName}
- Contact: ${lead.contactName || 'Unknown'}
- Email: ${lead.email || 'Unknown'}
- Location: ${lead.city || 'Unknown'}, ${lead.county || 'Unknown'} County, FL
- Practice Area: ${lead.practiceArea || 'Unknown'}
- Firm Size: ${lead.firmSize || 'Unknown'}
- Active Matters: ${lead.matterVolume || 'Unknown'}

${researchContext}

Sequence Day: ${day}
${dayInstruction}

Return ONLY raw JSON with these fields:
{
  "subject": "email subject line",
  "body": "full email body with line breaks as \\n",
  "painPointUsed": "the specific pain point referenced in the email",
  "angle": "the outreach angle used"
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
        system: 'You are an expert B2B sales copywriter for SalesEdge, selling LegalEdge — an AI operating system for Florida real estate litigation firms. Write cold outreach emails that are direct, specific, and personalized. Never generic. Never salesy. Always reference the firm\'s specific pain point. Return ONLY raw JSON, no markdown.',
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
        return res.status(502).json({ error: 'Failed to parse email response' });
      }
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Email write handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
