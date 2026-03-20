export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Phase 2: Gmail send via VOXIT API
  // Will handle:
  // - Sending emails through VOXIT/GHL integration
  // - Tracking send status and delivery
  // - Managing reply-to threading

  return res.status(501).json({
    error: 'Not implemented',
    message: 'Email send will be available in Phase 2',
  });
}
