// GET /api/analytics
// Uses the user's Google OAuth access token to call GA4 Data API directly
// No service account needed — works with your own Google account

import { getServerSession } from 'next-auth';
import { google } from 'googleapis';

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
  // Get session — user must be logged in with Google
  const session = await getServerSession();
  if (!session?.accessToken) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const propertyId = process.env.GA4_PROPERTY_ID;

  // Use the user's OAuth access token directly
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: session.accessToken });

  // Call GA4 Data API via googleapis
  const analyticsData = google.analyticsdata({ version: 'v1beta', auth });

  try {
    const [toolUsage, dailyActive, realtimeData, deviceData, countryData, eventTotals] = await Promise.all([

      // Tool usage
      analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
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
        }
      }),

      // Daily active users
      analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: '13daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'date' }],
          metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
          orderBys: [{ dimension: { dimensionName: 'date' } }],
        }
      }),

      // Realtime
      analyticsData.properties.runRealtimeReport({
        property: `properties/${propertyId}`,
        requestBody: {
          metrics: [{ name: 'activeUsers' }],
        }
      }),

      // Device split
      analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        }
      }),

      // Top countries
      analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'country' }],
          metrics: [{ name: 'activeUsers' }],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
          limit: 10,
        }
      }),

      // Key events
      analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'eventName' }],
          metrics: [{ name: 'eventCount' }],
          dimensionFilter: {
            filter: {
              fieldName: 'eventName',
              inListFilter: {
                values: ['download','ai_command','scan_to_pdf',
                         'pdf_to_word','pdf_signed','share']
              }
            }
          },
        }
      }),
    ]);

    // Process results
    const tools = (toolUsage.data.rows || []).map(row => ({
      id: row.dimensionValues[0].value,
      label: TOOL_LABELS[row.dimensionValues[0].value] || row.dimensionValues[0].value,
      count: parseInt(row.metricValues[0].value),
    }));
    const maxCount = tools[0]?.count || 1;

    const daily = (dailyActive.data.rows || []).map(row => ({
      date: row.dimensionValues[0].value,
      users: parseInt(row.metricValues[0].value),
      sessions: parseInt(row.metricValues[1].value),
    }));

    const liveUsers = parseInt(realtimeData.data.rows?.[0]?.metricValues?.[0]?.value || '0');

    const devices = (deviceData.data.rows || []).map(row => ({
      device: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value),
    }));
    const totalSessions = devices.reduce((s, d) => s + d.sessions, 0);

    const countries = (countryData.data.rows || []).map(row => ({
      country: row.dimensionValues[0].value,
      users: parseInt(row.metricValues[0].value),
    }));

    const events = {};
    (eventTotals.data.rows || []).forEach(row => {
      events[row.dimensionValues[0].value] = parseInt(row.metricValues[0].value);
    });

    return Response.json({
      liveUsers,
      totalToolOpens: tools.reduce((s, t) => s + t.count, 0),
      totalUsers: daily.reduce((s, d) => s + d.users, 0),
      tools: tools.map(t => ({ ...t, pct: Math.round(t.count / maxCount * 100) })),
      daily,
      devices: devices.map(d => ({ ...d, pct: Math.round(d.sessions / totalSessions * 100) })),
      countries,
      events,
      lastUpdated: new Date().toISOString(),
    });

  } catch(err) {
    console.error('GA4 error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
