'use client';
import { useState, useEffect, useCallback } from 'react';

const ACCENT = '#E8450A';
const GREEN  = '#2ECC71';

export default function Dashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [password, setPassword] = useState('');
  const [authed, setAuthed]   = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchData = useCallback(async (pw) => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/analytics', {
        headers: { 'x-dashboard-key': pw || password }
      });
      const json = await res.json();
      if (res.status === 401) { setError('Wrong password'); setAuthed(false); return; }
      if (json.error) throw new Error(json.error);
      setData(json);
      setAuthed(true);
      setLastRefresh(new Date());
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, [password]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!authed) return;
    const iv = setInterval(() => fetchData(), 60000);
    return () => clearInterval(iv);
  }, [authed, fetchData]);

  // Login screen
  if (!authed) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
      <div style={{ background:'#0f0f1a', border:'1px solid #1a1a2e', borderRadius:16, padding:32, width:320 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
          <div style={{ width:36, height:36, background:ACCENT, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:17, color:'#fff' }}>R</div>
          <div>
            <div style={{ fontSize:14, fontWeight:700 }}>RightPDFKit</div>
            <div style={{ fontSize:11, color:'#666' }}>Analytics Dashboard</div>
          </div>
        </div>
        <input
          type="password"
          placeholder="Dashboard password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchData(password)}
          style={{ width:'100%', background:'#1a1a2e', border:'1px solid #2a2a3e', borderRadius:8, padding:'10px 12px', fontSize:14, color:'#f0ede8', outline:'none', marginBottom:10, fontFamily:'inherit' }}
          autoFocus
        />
        {error && <div style={{ fontSize:12, color:'#e74c3c', marginBottom:8 }}>{error}</div>}
        <button onClick={() => fetchData(password)} style={btnStyle(ACCENT, true)}>
          {loading ? 'Checking…' : 'Access Dashboard'}
        </button>
      </div>
    </div>
  );

  if (loading && !data) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', color:'#555' }}>
      Loading analytics…
    </div>
  );

  if (error) return (
    <div style={{ padding:32, color:'#e74c3c' }}>Error: {error}</div>
  );

  const totalDownloads = data.events?.download || 0;
  const totalAI = data.events?.ai_command || 0;
  const totalScans = data.events?.scan_to_pdf || 0;

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'20px 16px 60px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, background:ACCENT, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:20, color:'#fff' }}>R</div>
          <div>
            <div style={{ fontSize:18, fontWeight:800, letterSpacing:'-.02em' }}>RightPDFKit Analytics</div>
            <div style={{ fontSize:11, color:'#555' }}>Last 30 days · refreshes every 60s</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {lastRefresh && <span style={{ fontSize:11, color:'#444' }}>Updated {lastRefresh.toLocaleTimeString()}</span>}
          <button onClick={() => fetchData()} disabled={loading} style={btnStyle('#1a1a2e', false, false, '1px solid #2a2a3e')}>
            {loading ? '⟳' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Live users + key stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:10, marginBottom:20 }}>
        {[
          { label: 'Live users', value: data.liveUsers, color: GREEN, sub: 'right now' },
          { label: 'Tool opens', value: data.totalToolOpens.toLocaleString(), color: ACCENT, sub: '30 days' },
          { label: 'Active users', value: data.totalUsers.toLocaleString(), color: '#3498db', sub: '30 days' },
          { label: 'Downloads', value: totalDownloads.toLocaleString(), color: '#9b59b6', sub: '30 days' },
          { label: 'AI commands', value: totalAI.toLocaleString(), color: ACCENT, sub: '30 days' },
          { label: 'Scans', value: totalScans.toLocaleString(), color: GREEN, sub: '30 days' },
        ].map((s, i) => (
          <div key={i} style={{ background:'#0f0f1a', border:`1px solid #1a1a2e`, borderRadius:12, padding:14 }}>
            <div style={{ fontSize:11, color:'#555', marginBottom:5, textTransform:'uppercase', letterSpacing:'.06em' }}>{s.label}</div>
            <div style={{ fontSize:28, fontWeight:800, color:s.color, letterSpacing:'-.03em', lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:10, color:'#444', marginTop:4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>

        {/* Daily chart */}
        <div style={{ background:'#0f0f1a', border:'1px solid #1a1a2e', borderRadius:12, padding:16, gridColumn:'1/-1' }}>
          <div style={{ fontSize:12, fontWeight:700, marginBottom:12 }}>Daily active users — last 14 days</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:80 }}>
            {(() => {
              const max = Math.max(...data.daily.map(d => d.users)) || 1;
              return data.daily.map((d, i) => {
                const h = Math.max(4, Math.round(d.users / max * 72));
                const date = `${d.date.slice(4,6)}/${d.date.slice(6,8)}`;
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }} title={`${date}: ${d.users} users`}>
                    <div style={{ fontSize:9, color:'#444' }}>{d.users > 0 ? d.users : ''}</div>
                    <div style={{ width:'100%', height:h, background:ACCENT, borderRadius:'3px 3px 0 0', opacity: i === data.daily.length-1 ? 1 : 0.6 }}></div>
                    <div style={{ fontSize:8, color:'#444', whiteSpace:'nowrap' }}>{date}</div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Device split */}
        <div style={{ background:'#0f0f1a', border:'1px solid #1a1a2e', borderRadius:12, padding:16 }}>
          <div style={{ fontSize:12, fontWeight:700, marginBottom:12 }}>Device split</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {data.devices.map((d, i) => {
              const colours = [ACCENT, '#3498db', '#2ECC71'];
              return (
                <div key={i}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                    <span style={{ color:'#ccc', textTransform:'capitalize' }}>{d.device}</span>
                    <span style={{ color:'#666' }}>{d.pct}% · {d.sessions.toLocaleString()}</span>
                  </div>
                  <div style={{ height:6, background:'#1a1a2e', borderRadius:20, overflow:'hidden' }}>
                    <div style={{ width:d.pct+'%', height:'100%', background:colours[i % colours.length], borderRadius:20 }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top countries */}
        <div style={{ background:'#0f0f1a', border:'1px solid #1a1a2e', borderRadius:12, padding:16 }}>
          <div style={{ fontSize:12, fontWeight:700, marginBottom:12 }}>Top countries</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {data.countries.slice(0, 8).map((c, i) => {
              const max = data.countries[0]?.users || 1;
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ fontSize:12, color:'#ccc', width:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.country}</div>
                  <div style={{ flex:1, height:5, background:'#1a1a2e', borderRadius:20, overflow:'hidden' }}>
                    <div style={{ width:(c.users/max*100)+'%', height:'100%', background:'#3498db', borderRadius:20 }}></div>
                  </div>
                  <div style={{ fontSize:11, color:'#555', width:36, textAlign:'right' }}>{c.users}</div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Tool usage — the main attraction */}
      <div style={{ background:'#0f0f1a', border:'1px solid #1a1a2e', borderRadius:12, padding:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:700 }}>Tool usage — last 30 days</div>
          <div style={{ fontSize:11, color:'#555' }}>{data.tools.length} tools tracked</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {data.tools.map((tool, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:20, textAlign:'right', fontSize:10, color:'#444' }}>{i+1}</div>
              <div style={{ width:160, fontSize:12, color:i < 3 ? '#f0ede8' : '#888', fontWeight: i < 3 ? 600 : 400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {tool.label}
              </div>
              <div style={{ flex:1, height:7, background:'#1a1a2e', borderRadius:20, overflow:'hidden' }}>
                <div style={{
                  width: tool.pct + '%', height:'100%',
                  background: i === 0 ? ACCENT : i < 3 ? `rgba(232,69,10,${0.7 - i*0.1})` : '#2a2a3e',
                  borderRadius:20,
                  transition:'width .3s'
                }}></div>
              </div>
              <div style={{ fontSize:11, color:'#555', width:50, textAlign:'right' }}>
                {tool.count.toLocaleString()}
              </div>
            </div>
          ))}
          {data.tools.length === 0 && (
            <div style={{ fontSize:12, color:'#555', textAlign:'center', padding:'20px 0' }}>
              No tool_open events recorded yet. Make sure GA4 is receiving events.
            </div>
          )}
        </div>
      </div>

      <div style={{ textAlign:'center', padding:'20px 0', fontSize:11, color:'#333' }}>
        RightPDFKit Analytics · Data from Google Analytics 4
      </div>
    </div>
  );
}

function btnStyle(bg, full=false, disabled=false, border='none') {
  return {
    background: disabled ? '#1a1a2e' : bg, color:'#fff', border,
    borderRadius:8, padding: full ? '10px 20px' : '7px 14px',
    fontSize:12, fontWeight:700, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily:'inherit', opacity: disabled ? 0.5 : 1,
    width: full ? '100%' : 'auto', transition:'all .13s',
  };
}
