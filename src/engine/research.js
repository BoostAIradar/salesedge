export async function runResearch(lead) {
  try {
    const res = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firmName: lead.firmName,
        contactName: lead.contactName,
        email: lead.email,
        city: lead.city,
        county: lead.county,
        practiceArea: lead.practiceArea,
        firmSize: lead.firmSize,
        matterVolume: lead.matterVolume,
        barNumber: lead.barNumber,
      }),
    });

    if (!res.ok) {
      throw new Error(`Research API error: ${res.status}`);
    }

    const data = await res.json();
    return {
      researchBrief: data.researchBrief || '',
      painPoints: data.painPoints || [],
      personalizationHooks: data.personalizationHooks || [],
      bestAngle: data.bestAngle || '',
      suggestedSubject: data.suggestedSubject || '',
      competitorAlert: data.competitorAlert || null,
    };
  } catch (err) {
    console.error('Research failed:', err);
    throw err;
  }
}
