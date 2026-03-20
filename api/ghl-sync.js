export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ghlKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!ghlKey || ghlKey === 'your_ghl_key_here') {
    return res.status(500).json({ error: 'GHL_API_KEY not configured' });
  }

  const { lead, action } = req.body;

  if (!lead || !lead.firmName) {
    return res.status(400).json({ error: 'lead with firmName is required' });
  }

  const stageMap = {
    new: 'New Lead',
    contacted: 'Contacted',
    replied: 'Replied',
    'demo-booked': 'Demo Booked',
    closed: 'Closed Won',
    dead: 'Dead',
  };

  const contactPayload = {
    firstName: lead.contactName ? lead.contactName.split(' ')[0] : '',
    lastName: lead.contactName ? lead.contactName.split(' ').slice(1).join(' ') : '',
    email: lead.email || '',
    phone: lead.phone || '',
    companyName: lead.firmName,
    tags: [
      `tier-${lead.tier || 3}`,
      `icp-${lead.score || 0}`,
      lead.practiceArea || '',
      'salesedge',
    ].filter(Boolean),
    customField: {
      icp_tier: `Tier ${lead.tier || 3}`,
      icp_score: String(lead.score || 0),
      practice_area: lead.practiceArea || '',
      firm_size: lead.firmSize || '',
      matter_volume: String(lead.matterVolume || 0),
      county: lead.county || '',
      stage: stageMap[lead.stage] || lead.stage || 'New Lead',
    },
  };

  if (locationId) {
    contactPayload.locationId = locationId;
  }

  try {
    const response = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ghlKey}`,
      },
      body: JSON.stringify(contactPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL sync error:', response.status, errorText);
      return res.status(502).json({ error: 'GHL sync failed', status: response.status });
    }

    const data = await response.json();

    return res.status(200).json({
      contactId: data.contact?.id || data.id || null,
      action: action || 'sync',
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('GHL sync handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
