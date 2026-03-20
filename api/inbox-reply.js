export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { message, platform, leadContext, sentiment, conversationHistory } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  const toneMap = {
    positive: 'They are interested. Move the conversation toward a 15-minute demo call. Be enthusiastic but not overeager. Suggest a specific time.',
    inquiry: 'They have questions. Answer clearly and concisely, then soft-pitch LegalEdge by relating your answer to a capability. End with a question to keep the conversation going.',
    neutral: 'They are neutral. Provide value by sharing a relevant insight about FL real estate litigation. Nurture the relationship without pushing. End with something useful, not a sales pitch.',
    negative: 'They are not interested or have concerns. De-escalate professionally. Acknowledge their position. Leave the door open for the future. Be brief and respectful. Do NOT push back.',
  };

  const toneInstruction = toneMap[sentiment] || toneMap.neutral;

  const historyContext = conversationHistory?.length
    ? `Previous messages in this thread:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n\n`
    : '';

  const leadInfo = leadContext
    ? `Lead context: ${leadContext.firmName || 'Unknown firm'}, ${leadContext.practiceArea || 'Unknown practice'}, Tier ${leadContext.tier || '?'}, ${leadContext.city || ''} ${leadContext.county || ''}\n\n`
    : '';

  const prompt = `Draft a reply to this ${platform || 'email'} message:

"${message}"

${leadInfo}${historyContext}Tone: ${toneInstruction}

Return ONLY raw JSON:
{
  "draft": "the reply text, ready to send",
  "suggestedNextAction": "what to do after sending this reply",
  "moveToStage": "suggested pipeline stage to move lead to, or null if no change"
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
        system: 'You are a sales communication expert for SalesEdge, selling LegalEdge — an AI OS for Florida real estate litigation firms. Draft replies that are professional, specific to the legal industry, and move conversations forward naturally. Match the platform tone (LinkedIn = professional, email = direct, social = conversational). Return ONLY raw JSON, no markdown.',
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
        return res.status(502).json({ error: 'Failed to parse reply response' });
      }
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Inbox reply handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
