export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const voxitEndpoint = process.env.VOXIT_GMAIL_ENDPOINT;
  const voxitKey = process.env.VOXIT_API_KEY;

  if (!voxitEndpoint || !voxitKey || voxitKey === 'your_voxit_key_here') {
    return res.status(500).json({ error: 'VOXIT credentials not configured' });
  }

  const { to, subject, body, leadId, templateId } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'to, subject, and body are required' });
  }

  try {
    const response = await fetch(voxitEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${voxitKey}`,
      },
      body: JSON.stringify({
        to,
        subject,
        body,
        metadata: {
          leadId: leadId || null,
          templateId: templateId || null,
          source: 'salesedge',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('VOXIT send error:', response.status, errorText);
      return res.status(502).json({ error: 'Email send failed', status: response.status });
    }

    const data = await response.json();

    return res.status(200).json({
      messageId: data.messageId || data.id || `msg-${Date.now()}`,
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Email send handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
