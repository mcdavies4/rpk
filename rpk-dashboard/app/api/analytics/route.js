// GET /api/analytics
// Fetches RightPDFKit usage data from GA4 Data API
// Protected by simple password header

import { BetaAnalyticsDataClient } from '@google-analytics/data';

const TOOL_LABELS = {
  merge: 'Merge PDFs', split: 'Split PDF', reorder: 'Reorder Pages',
  extract: 'Extract Pages', delete: 'Delete Pages', rotate: 'Rotate Pages',
  crop: 'Crop Pages', addimage: 'Add Image', annotate: 'Annotate',
  redact: 'Redact', headfoot: 'Header/Footer', watermark: 'Watermark',
  pagenums: 'Page Numbers', compress: 'Compress', protect: 'Protect PDF',
  unlock: 'Unlock PDF', ocr: 'OCR', pdftext: 'PDF to Text',
  pdftoword: 'PDF to Word', preview: 'Preview', images: 'PDF to Images',
  blankpage: 'Insert Blank Page', resize: 'Resize Pages', flatten: 'Flatten Forms',
  grayscale: 'Grayscale', metadata: 'Edit Metadata', sign: 'Sign PDF',
  dupepage: 'Duplicate Page', nup: 'N-up Print', repair: 'Repair PDF',
  qrstamp: 'QR Stamp', fillform: 'Fill PDF Form', 'compare-pdf': 'Compare PDFs',
  bates: 'Bates Numbers', pdftocsv: 'PDF to CSV', redline: 'PDF Redline',
  pwcheck: 'Password Strength', scan: 'Scan to PDF', ai: 'AI Assistant',
  batch: 'Batch Process',
};

export async function GET(request) {
  // Simple password protection
  const auth = request.headers.get('x-dashboard-key');
  if (auth !== process.env.DASHBOARD_PASSWORD) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const propertyId = process.env.GA4_PROPERTY_ID;
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!propertyId || !serviceAccountKey) {
    return Response.json({ error: 'Missing GA4 config' }, { status: 500 });
  }

  let credentials;
  try {
    credentials = JSON.parse(serviceAccountKey);
  } catch(e) {
    return Response.json({ error: 'Invalid service account key JSON' }, { status: 500 });
  }

  const analyticsClient = new BetaAnalyticsDataClient({ credentials });

  try {
    // Run all queries in parallel
    const [toolUsage, dailyActive, realtimeData, deviceData, countryData, eventTotals] = await Promise.all([

      // 1. Tool usage — which tools are used most (last 30 days)
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'customEvent:tool' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: { value: 'tool_open', matchType: 'EXACT' }
          }
        },
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 40,
      }),

      // 2. Daily active users (last 14 days)
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '13daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),

      // 3. Realtime — users right now
      analyticsClient.runRealtimeReport({
        property: `properties/${propertyId}`,
        metrics: [{ name: 'activeUsers' }],
      }),

      // 4. Device split
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      }),

      // 5. Top countries
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10,
      }),

      // 6. Key event totals (downloads, AI commands, scans)
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: {
              values: ['download', 'ai_command', 'scan_to_pdf', 'pdf_to_word',
                       'pdf_signed', 'feedback_submitted', 'share']
            }
          }
        },
      }),
    ]);

    // Process tool usage
    const tools = (toolUsage[0].rows || []).map(row => ({
      id: row.dimensionValues[0].value,
      label: TOOL_LABELS[row.dimensionValues[0].value] || row.dimensionValues[0].value,
      count: parseInt(row.metricValues[0].value),
    }));
    const maxToolCount = tools[0]?.count || 1;

    // Process daily data
    const daily = (dailyActive[0].rows || []).map(row => ({
      date: row.dimensionValues[0].value,
      users: parseInt(row.metricValues[0].value),
      sessions: parseInt(row.metricValues[1].value),
    }));

    // Realtime users
    const liveUsers = parseInt(realtimeData[0].rows?.[0]?.metricValues?.[0]?.value || '0');

    // Device split
    const devices = (deviceData[0].rows || []).map(row => ({
      device: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value),
    }));
    const totalSessions = devices.reduce((s, d) => s + d.sessions, 0);

    // Countries
    const countries = (countryData[0].rows || []).map(row => ({
      country: row.dimensionValues[0].value,
      users: parseInt(row.metricValues[0].value),
    }));

    // Event totals
    const events = {};
    (eventTotals[0].rows || []).forEach(row => {
      events[row.dimensionValues[0].value] = parseInt(row.metricValues[0].value);
    });

    // Totals
    const totalToolOpens = tools.reduce((s, t) => s + t.count, 0);
    const totalUsers = daily.reduce((s, d) => s + d.users, 0);

    return Response.json({
      liveUsers,
      totalToolOpens,
      totalUsers,
      tools: tools.map(t => ({ ...t, pct: Math.round(t.count / maxToolCount * 100) })),
      daily,
      devices: devices.map(d => ({ ...d, pct: Math.round(d.sessions / totalSessions * 100) })),
      countries,
      events,
      lastUpdated: new Date().toISOString(),
    });

  } catch(err) {
    console.error('GA4 error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
