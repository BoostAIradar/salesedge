export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { emailMetrics, socialMetrics, pipelineMetrics, sequenceMetrics } = req.body;

  const prompt = `Analyze this week's SalesEdge performance data and generate strategic recommendations.

EMAIL METRICS:
${JSON.stringify(emailMetrics || {}, null, 2)}

SOCIAL METRICS:
${JSON.stringify(socialMetrics || {}, null, 2)}

PIPELINE METRICS:
${JSON.stringify(pipelineMetrics || {}, null, 2)}

SEQUENCE METRICS:
${JSON.stringify(sequenceMetrics || {}, null, 2)}

Return ONLY raw JSON with this structure:
{
  "weekSummary": "2-3 sentence executive summary of the week",
  "emailInsights": [
    { "insight": "specific observation", "impact": "high|medium|low", "action": "what to do about it" }
  ],
  "socialInsights": [
    { "insight": "specific observation", "impact": "high|medium|low", "action": "what to do about it" }
  ],
  "pipelineInsights": [
    { "insight": "specific observation", "impact": "high|medium|low", "action": "what to do about it" }
  ],
  "strategyDecisions": [
    {
      "decision": "what to change",
      "rationale": "why, based on data",
      "affects": "email|social|pipeline|sequence",
      "implementation": "how to implement"
    }
  ],
  "templateChanges": [
    {
      "templateId": "template identifier or null",
      "action": "retire|promote|test",
      "reason": "data-driven reason"
    }
  ],
  "contentThemes": ["theme1", "theme2", "theme3"],
  "prioritySegment": "description of highest-priority lead segment for next week",
  "northStarProgress": {
    "demosBooked": 0,
    "target": 5,
    "trend": "up|down|flat"
  }
}

Be direct and specific — not vague. Every insight must reference actual numbers from the data. Every recommendation must be actionable.`;

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
        max_tokens: 3000,
        system: 'You are the intelligence engine for SalesEdge. Analyze weekly performance data across email, social, and pipeline. Identify what worked, what failed, and make specific strategy decisions for next week. Be direct and specific — not vague. Return ONLY raw JSON, no markdown.',
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
        return res.status(502).json({ error: 'Failed to parse report response' });
      }
    }

    parsed.generatedAt = new Date().toISOString();
    parsed.weekOf = new Date().toISOString().split('T')[0];

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Weekly report handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
