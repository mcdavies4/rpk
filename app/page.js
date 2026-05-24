'use client';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';

const ACCENT = '#E8450A';
const GREEN  = '#2ECC71';
const BLUE   = '#3498db';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchData = useCallback(async () => {
    if (!session) return;
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/analytics');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setLastRefresh(new Date());
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, [session]);

  useEffect(() => {
    if (session) fetchData();
  }, [session, fetchData]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!session) return;
    const iv = setInterval(fetchData, 60000);
    return () => clearInterval(iv);
  }, [session, fetchData]);

  // Loading auth state
  if (status === 'loading') return (
    <div style={center}>
      <div style={{ color:'#555', fontSize:13 }}>Loading…</div>
    </div>
  );

  // Not signed in — show login screen
  if (!session) return (
    <div style={center}>
      <div style={{ background:'#0f0f1a', border:'1px solid #1a1a2e', borderRadius:16, padding:32, width:320, textAlign:'center' }}>
        <div style={{ width:52, height:52, background:ACCENT, borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:26, color:'#fff', margin:'0 auto 16px' }}>R</div>
        <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>RightPDFKit Analytics</div>
        <div style={{ fontSize:12, color:'#555', marginBottom:24 }}>Sign in with the Google account that owns your GA4 property</div>
        <button onClick={() => signIn('google')} style={btnStyle(ACCENT, true)}>
          Sign in with Google
        </button>
      </div>
    </div>
  );

  // Signed in — show dashboard
  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'20px 16px 60px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, background:ACCENT, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:20, color:'#fff' }}>R</div>
          <div>
            <div style={{ fontSize:18, fontWeight:800, letterSpacing:'-.02em' }}>RightPDFKit Analytics</div>
            <div style={{ fontSize:11, color:'#555' }}>Signed in as {session.user?.email} · refreshes every 60s</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          {lastRefresh && <span style={{ fontSize:11, color:'#444' }}>Updated {lastRefresh.toLocaleTimeString()}</span>}
          <button onClick={fetchData} disabled={loading} style={btnStyle('#1a1a2e', false, loading, '1px solid #2a2a3e')}>
            {loading ? '⟳' : '↻ Refresh'}
          </button>
          <button onClick={() => signOut()} style={btnStyle('#1a1a2e', false, false, '1px solid #2a2a3e')}>
            Sign out
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background:'rgba(231,76,60,.1)', border:'1px solid rgba(231,76,60,.3)', borderRadius:10, padding:'12px 14px', marginBottom:16, fontSize:13, color:'#e74c3c' }}>
          ⚠ {error}
        </div>
      )}

      {loading && !data && (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#555', fontSize:13 }}>Loading analytics…</div>
      )}

      {data && <>

        {/* Key stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:16 }}>
          {[
            { label:'Live users',   value: data.liveUsers,                    color: GREEN,  sub:'right now' },
            { label:'Tool opens',   value: data.totalToolOpens.toLocaleString(), color: ACCENT, sub:'30 days' },
            { label:'Active users', value: data.totalUsers.toLocaleString(),  color: BLUE,   sub:'30 days' },
            { label:'Downloads',    value: (data.events?.download||0).toLocaleString(),    color:'#9b59b6', sub:'30 days' },
            { label:'AI commands',  value: (data.events?.ai_command||0).toLocaleString(),  color: ACCENT, sub:'30 days' },
            { label:'Scans',        value: (data.events?.scan_to_pdf||0).toLocaleString(), color: GREEN,  sub:'30 days' },
          ].map((s,i) => (
            <div key={i} style={{ background:'#0f0f1a', border:'1px solid #1a1a2e', borderRadius:12, padding:14 }}>
              <div style={{ fontSize:10, color:'#555', marginBottom:5, textTransform:'uppercase', letterSpacing:'.06em' }}>{s.label}</div>
              <div style={{ fontSize:26, fontWeight:800, color:s.color, letterSpacing:'-.03em', lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:10, color:'#444', marginTop:4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Daily chart */}
        <div style={{ background:'#0f0f1a', border:'1px solid #1a1a2e', borderRadius:12, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, marginBottom:12 }}>Daily active users — last 14 days</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:90 }}>
            {(() => {
              const max = Math.max(...data.daily.map(d => d.users), 1);
              return data.daily.map((d, i) => {
                const h = Math.max(4, Math.round(d.users / max * 80));
                const date = `${d.date.slice(4,6)}/${d.date.slice(6,8)}`;
                const isToday = i === data.daily.length - 1;
                return (
                  <div key={i} title={`${date}: ${d.users} users, ${d.sessions} sessions`}
                    style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, cursor:'default' }}>
                    <div style={{ fontSize:9, color: isToday ? ACCENT : '#555' }}>{d.users > 0 ? d.users : ''}</div>
                    <div style={{ width:'100%', height:h, background: isToday ? ACCENT : 'rgba(232,69,10,.4)', borderRadius:'3px 3px 0 0' }}></div>
                    <div style={{ fontSize:8, color:'#444', whiteSpace:'nowrap' }}>{date}</div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>

          {/* Device split */}
          <div style={{ background:'#0f0f1a', border:'1px solid #1a1a2e', borderRadius:12, padding:16 }}>
            <div style={{ fontSize:12, fontWeight:700, marginBottom:12 }}>Device split</div>
            {data.devices.map((d, i) => {
              const cols = [ACCENT, BLUE, GREEN];
              return (
                <div key={i} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                    <span style={{ color:'#ccc', textTransform:'capitalize' }}>{d.device}</span>
                    <span style={{ color:'#666' }}>{d.pct}%</span>
                  </div>
                  <div style={{ height:6, background:'#1a1a2e', borderRadius:20, overflow:'hidden' }}>
                    <div style={{ width:d.pct+'%', height:'100%', background:cols[i%3], borderRadius:20 }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top countries */}
          <div style={{ background:'#0f0f1a', border:'1px solid #1a1a2e', borderRadius:12, padding:16 }}>
            <div style={{ fontSize:12, fontWeight:700, marginBottom:12 }}>Top countries</div>
            {data.countries.slice(0,8).map((c, i) => {
              const max = data.countries[0]?.users || 1;
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                  <div style={{ fontSize:12, color:'#ccc', width:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.country}</div>
                  <div style={{ flex:1, height:5, background:'#1a1a2e', borderRadius:20, overflow:'hidden' }}>
                    <div style={{ width:(c.users/max*100)+'%', height:'100%', background:BLUE, borderRadius:20 }}></div>
                  </div>
                  <div style={{ fontSize:11, color:'#555', width:30, textAlign:'right' }}>{c.users}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tool usage — main table */}
        <div style={{ background:'#0f0f1a', border:'1px solid #1a1a2e', borderRadius:12, padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700 }}>Tool usage — last 30 days</div>
            <div style={{ fontSize:11, color:'#555' }}>{data.tools.length} tools tracked</div>
          </div>
          {data.tools.length === 0 ? (
            <div style={{ fontSize:12, color:'#555', textAlign:'center', padding:'20px 0' }}>
              No tool_open events yet. Deploy the latest RightPDFKit and start using tools.
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {data.tools.map((tool, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:18, textAlign:'right', fontSize:10, color:'#444' }}>{i+1}</div>
                  <div style={{ width:150, fontSize:12, color: i<3?'#f0ede8':'#777', fontWeight:i<3?600:400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {tool.label}
                  </div>
                  <div style={{ flex:1, height:7, background:'#1a1a2e', borderRadius:20, overflow:'hidden' }}>
                    <div style={{ width:tool.pct+'%', height:'100%', borderRadius:20, transition:'width .3s',
                      background: i===0 ? ACCENT : i<3 ? `rgba(232,69,10,.6)` : '#2a2a3e' }}></div>
                  </div>
                  <div style={{ fontSize:11, color:'#555', width:48, textAlign:'right' }}>
                    {tool.count.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ textAlign:'center', padding:'20px 0', fontSize:11, color:'#333' }}>
          RightPDFKit Analytics · Powered by Google Analytics 4
        </div>
      </>}
    </div>
  );
}

const center = { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' };

function btnStyle(bg, full=false, disabled=false, border='none') {
  return {
    background: disabled ? '#111' : bg, color:'#fff', border,
    borderRadius:8, padding: full ? '11px 20px' : '7px 14px',
    fontSize:12, fontWeight:700, cursor: disabled?'not-allowed':'pointer',
    fontFamily:'inherit', opacity: disabled?0.5:1,
    width: full?'100%':'auto', transition:'all .13s',
  };
}
