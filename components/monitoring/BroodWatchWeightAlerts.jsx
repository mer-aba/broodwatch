'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, RefreshCw, Scale } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/** Place <BroodWatchWeightAlerts farmId={farmId} /> inside the existing Alerts page. */
export function BroodWatchWeightAlerts({ farmId, onOpenWeightRecord, onAlertsChanged }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [showResolved, setShowResolved] = useState(false)
  const load = useCallback(async () => {
    if (!farmId) { setAlerts([]); onAlertsChanged?.(0); return }
    setLoading(true); setError('')
    const db = createClient()
    const [reference, quality, flocks] = await Promise.all([
      db.from('weight_farm_alerts').select('id,farm_id,flock_id,weight_record_id,alert_type,severity,title,message,status,created_at').eq('farm_id',farmId).order('created_at',{ascending:false}).limit(100),
      db.from('weight_quality_alerts').select('id,farm_id,flock_id,weight_record_id,alert_type,severity,title,message,status,created_at,metric_value,metric_unit').eq('farm_id',farmId).order('created_at',{ascending:false}).limit(100),
      db.from('flocks').select('id,name').eq('farm_id',farmId),
    ])
    const errors = [reference,quality,flocks].filter(x=>x.error).map(x=>x.error.message)
    if(errors.length) {setError(errors.join(' · '));onAlertsChanged?.(null);setLoading(false);return}
    const names = new Map((flocks.data||[]).map(f=>[f.id,f.name]))
    const merged = [
      ...(reference.data||[]).map(a=>({...a,source:'reference'})),
      ...(quality.data||[]).map(a=>({...a,source:'quality'})),
    ].map(a=>({...a,flockName:names.get(a.flock_id)||'Flock'}))
      .sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))
    setAlerts(merged)
    onAlertsChanged?.(merged.filter(a=>a.status==='open').length)
    setLoading(false)
  },[farmId,onAlertsChanged])
  useEffect(()=>{void load()},[load])
  async function resolve(alert) {
    if(alert.source!=='quality') return
    setBusy(alert.id);setError('')
    const db=createClient()
    const {error:e}=await db.from('weight_quality_alerts')
      .update({status:'resolved',resolved_at:new Date().toISOString()})
      .eq('id',alert.id).eq('farm_id',farmId)
    setBusy('')
    if(e) setError(e.message)
    else void load()
  }
  const visible=alerts.filter(a=>showResolved||a.status==='open')
  const openCount=alerts.filter(a=>a.status==='open').length
  return <section className="ops-panel" aria-label="Weight monitoring alerts" style={{padding:18,marginTop:18}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
      <h2 style={{margin:0,fontSize:19,display:'flex',alignItems:'center',gap:8}}><Scale size={19}/> Weight monitoring alerts ({openCount} open)</h2>
      <button type="button" className="quiet-action" disabled={loading} onClick={()=>void load()}><RefreshCw size={15}/> Refresh</button>
    </div>
    <p style={{fontSize:13,opacity:.75}}>MAAIF general references are separate from BroodWatch screening and sample-quality rules. These alerts are not diagnoses.</p>
    <label style={{display:'flex',gap:8,alignItems:'center',fontSize:13}}><input type="checkbox" checked={showResolved} onChange={e=>setShowResolved(e.currentTarget.checked)}/> Show resolved alerts</label>
    {error&&<p role="alert" style={{color:'#b91c1c'}}>Could not load or update weight alerts: {error}</p>}
    {loading&&<p role="status">Loading weight alerts…</p>}
    {!loading&&!visible.length&&<p>No {showResolved?'recorded':'open'} weight alerts for this farm.</p>}
    <div style={{display:'grid',gap:12,marginTop:14}}>{visible.map(a=><article key={`${a.source}-${a.id}`} style={{border:'1px solid var(--border,#cbd5e1)',borderRadius:12,padding:14}}>
      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        {a.status==='resolved'?<CheckCircle2 size={17}/>:<AlertTriangle size={17} color="#b45309"/>}
        <strong>{a.title}</strong><span style={{fontSize:12,opacity:.7}}>{a.severity||'warning'} · {a.source==='reference'?'Growth reference':'Measurement quality'} · {a.status}</span>
      </div>
      <p style={{margin:'8px 0'}}><strong>{a.flockName}</strong> · {new Date(a.created_at).toLocaleString('en-GB')}</p>
      <p style={{margin:'8px 0'}}>{a.message}</p>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        {typeof onOpenWeightRecord==='function'&&<button type="button" className="quiet-action" onClick={()=>onOpenWeightRecord(a.weight_record_id)}>View weighing</button>}
        {a.source==='quality'&&a.status==='open'&&<button type="button" className="quiet-action" disabled={busy===a.id} onClick={()=>void resolve(a)}>{busy===a.id?'Updating…':'Mark resolved'}</button>}
      </div>
    </article>)}</div>
  </section>
}
