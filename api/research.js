export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { firmName, contactName, email, city, county, practiceArea, firmSize, matterVolume, barNumber } = req.body;

  if (!firmName) {
    return res.status(400).json({ error: 'firmName is required' });
  }

  const prompt = `Research the following Florida law firm lead for a sales outreach campaign. We are selling LegalEdge — an AI-powered operating system for Florida real estate litigation firms ($299-$997/mo).

Lead Data:
- Firm: ${firmName}
- Contact: ${contactName || 'Unknown'}
- Email: ${email || 'Unknown'}
- Location: ${city || 'Unknown'}, ${county || 'Unknown'} County, FL
- Practice Area: ${practiceArea || 'Unknown'}
- Firm Size: ${firmSize || 'Unknown'}
- Active Matters: ${matterVolume || 'Unknown'}
- Bar Number: ${barNumber || 'Unknown'}

Based on this information, research and analyze this lead. Return ONLY raw JSON with these fields:
{
  "researchBrief": "2-3 paragraph analysis of the firm, their practice, market position, and technology readiness",
  "painPoints": ["5 specific pain points this firm likely faces based on their profile"],
  "personalizationHooks": ["4 specific hooks we can use to personalize outreach"],
  "bestAngle": "The single best outreach angle for this specific lead, explaining why and how to frame LegalEdge",
  "suggestedSubject": "A compelling email subject line tailored to this lead",
  "competitorAlert": "Any competitive intelligence or risk factors, or null if none"
}

Focus on Florida-specific legal market dynamics, HOA/eviction law challenges, and practice management pain points. Be specific and actionable — avoid generic statements.`;

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
        max_tokens: 2048,
        system: 'You are a sales intelligence agent for SalesEdge which sells LegalEdge — an AI OS for Florida real estate litigation firms. Research the lead and return ONLY raw JSON. No markdown, no code fences, no explanation — just the JSON object.',
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
        return res.status(502).json({ error: 'Failed to parse research response' });
      }
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Research handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
