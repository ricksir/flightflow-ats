/* FlightFlow v7.3.5 — camadas FIR selecionáveis e persistentes */
(() => {
  const bridge=window.__FlightFlowFirBridge;
  if(!bridge){console.error('[FlightFlow FIR] Ponte do mapa indisponível.');return;}
  const {
    state,realMapState,normalizeLocalityCode,closeLeafletRing,
    sanitizeLeafletAreaPoints,projectGeo,polygonCentroid,escapeHtml,toast
  }=bridge;
  const FIR_STORAGE_KEY='flightflow-manual-firs-v1';
  const FIR_CATALOG=Object.freeze({
    SBBSZQZX:{name:'Brasília',short:'SBBS',color:'#2467b2',className:'ff-fir-sbbs'},
    SBAZZQZX:{name:'Amazônico',short:'SBAZ',color:'#168b67',className:'ff-fir-sbaz'},
    SBCWZQZX:{name:'Curitiba',short:'SBCW',color:'#8257c7',className:'ff-fir-sbcw'},
    SBREZQZX:{name:'Recife',short:'SBRE',color:'#d1761f',className:'ff-fir-sbre'}
  });
  let googleManualFirOverlays=[];

  function selectedFirs(){
    try{
      const value=JSON.parse(localStorage.getItem(FIR_STORAGE_KEY)||'[]');
      return Array.isArray(value)?[...new Set(value.map(normalizeLocalityCode).filter(code=>FIR_CATALOG[code]))]:[];
    }catch(_){return [];}
  }
  function persistSelectedFirs(values){
    const clean=[...new Set((values||[]).map(normalizeLocalityCode).filter(code=>FIR_CATALOG[code]))];
    try{localStorage.setItem(FIR_STORAGE_KEY,JSON.stringify(clean));}catch(_){}
    syncFirPicker(clean);
    renderManualFirLayers();
    return clean;
  }
  function firGeometry(code){
    code=normalizeLocalityCode(code);
    const indexed=state.geo&&state.geo.accByAftn&&state.geo.accByAftn.get(code);
    if(indexed&&Array.isArray(indexed.points)&&indexed.points.length>=3)return indexed;
    const raw=(state.geoData&&state.geoData.accs||[]).find(item=>normalizeLocalityCode(item&&item[1])===code);
    if(raw&&Array.isArray(raw[2])&&raw[2].length>=3)return{code:raw[0]||code,aftn:code,points:raw[2]};
    return null;
  }
  function validateFirSelection(values,{notify=true}={}){
    const valid=[],missing=[];
    (values||[]).forEach(code=>{
      code=normalizeLocalityCode(code);
      if(firGeometry(code))valid.push(code);else missing.push(code);
    });
    if(missing.length&&notify)toast(`Coordenadas da FIR ${missing.join(', ')} não estão cadastradas nesta base geográfica.`,'error',6500);
    return valid;
  }
  function syncFirPicker(values=selectedFirs()){
    const menu=document.getElementById('realMapFirMenu');
    if(menu)menu.querySelectorAll('input[data-fir-code]').forEach(input=>input.checked=values.includes(input.dataset.firCode));
    const btn=document.getElementById('realMapFirBtn');
    if(btn){btn.textContent=values.length?`FIR (${values.length})`:'FIR';btn.classList.toggle('active',values.length>0);}
  }
  function clearGoogleManualFirs(){
    googleManualFirOverlays.forEach(item=>{try{item.setMap(null);}catch(_){}});
    googleManualFirOverlays=[];
  }
  function renderLeafletManualFirs(items){
    if(!window.L||!realMapState.map)return;
    if(!realMapState.layers)realMapState.layers={};
    let layer=realMapState.layers.manualFirs;
    if(!layer){layer=L.layerGroup().addTo(realMapState.map);realMapState.layers.manualFirs=layer;}
    layer.clearLayers();
    items.forEach(({code,item,meta})=>{
      const coords=closeLeafletRing(sanitizeLeafletAreaPoints(item.points));
      if(coords.length<3)return;
      L.polygon(coords,{renderer:realMapState.renderer,className:`ff-manual-fir ${meta.className}`,color:meta.color,weight:2.4,opacity:.98,fillColor:meta.color,fillOpacity:.075,dashArray:'9 5',interactive:true})
        .bindTooltip(`<strong>FIR ${escapeHtml(meta.name)}</strong><br>${escapeHtml(code)}<br>Camada exibida manualmente`,{sticky:true})
        .addTo(layer);
    });
  }
  function renderGoogleManualFirs(items){
    clearGoogleManualFirs();
    if(!(window.google&&google.maps&&realMapState.map))return;
    items.forEach(({code,item,meta})=>{
      const path=(item.points||[]).map(p=>({lng:Number(p[0]),lat:Number(p[1])})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
      if(path.length<3)return;
      const polygon=new google.maps.Polygon({map:realMapState.map,paths:path,strokeColor:meta.color,strokeOpacity:.98,strokeWeight:2,fillColor:meta.color,fillOpacity:.075,zIndex:110});
      googleManualFirOverlays.push(polygon);
    });
  }
  function renderVectorManualFirs(items){
    const layer=document.getElementById('manualFirLayer');if(!layer)return;
    layer.replaceChildren();
    const ns='http://www.w3.org/2000/svg';
    items.forEach(({code,item,meta})=>{
      const pts=(item.points||[]).map(c=>projectGeo(Number(c[0]),Number(c[1]))).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
      if(pts.length<3)return;
      const path=document.createElementNS(ns,'path');
      path.setAttribute('d',`M${pts.map((p,i)=>`${i?'L':''}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')} Z`);
      path.setAttribute('stroke',meta.color);path.setAttribute('fill',meta.color);path.dataset.aftn=code;
      const title=document.createElementNS(ns,'title');title.textContent=`FIR ${meta.name} · ${code} · camada manual`;path.appendChild(title);layer.appendChild(path);
      const center=polygonCentroid(pts),label=document.createElementNS(ns,'g');label.setAttribute('class','fir-label');label.setAttribute('transform',`translate(${center.x.toFixed(1)} ${center.y.toFixed(1)})`);
      const rect=document.createElementNS(ns,'rect');rect.setAttribute('x','-58');rect.setAttribute('y','-15');rect.setAttribute('width','116');rect.setAttribute('height','30');rect.setAttribute('rx','8');
      const text=document.createElementNS(ns,'text');text.setAttribute('y','4');text.textContent=`FIR · ${code}`;label.append(rect,text);layer.appendChild(label);
    });
  }
  function renderManualFirLayers(){
    if(typeof state==='undefined'||!state.geoData)return;
    const valid=validateFirSelection(selectedFirs(),{notify:false});
    if(valid.length!==selectedFirs().length){try{localStorage.setItem(FIR_STORAGE_KEY,JSON.stringify(valid));}catch(_){}syncFirPicker(valid);}
    const items=valid.map(code=>({code,item:firGeometry(code),meta:FIR_CATALOG[code]})).filter(entry=>entry.item);
    renderVectorManualFirs(items);
    if(realMapState.engine==='google')renderGoogleManualFirs(items);
    else{clearGoogleManualFirs();renderLeafletManualFirs(items);}
  }
  function bindFirPicker(){
    const picker=document.getElementById('realMapFirPicker'),btn=document.getElementById('realMapFirBtn'),menu=document.getElementById('realMapFirMenu'),clear=document.getElementById('realMapFirClearBtn');
    if(!picker||!btn||!menu)return;
    syncFirPicker();
    btn.addEventListener('click',event=>{event.stopPropagation();menu.hidden=!menu.hidden;btn.setAttribute('aria-expanded',String(!menu.hidden));});
    menu.addEventListener('click',event=>event.stopPropagation());
    menu.querySelectorAll('input[data-fir-code]').forEach(input=>input.addEventListener('change',()=>{
      const requested=[...menu.querySelectorAll('input[data-fir-code]:checked')].map(el=>el.dataset.firCode);
      const valid=validateFirSelection(requested,{notify:true});
      persistSelectedFirs(valid);
      if(valid.length)toast(`${valid.length} FIR${valid.length===1?'':'s'} exibida${valid.length===1?'':'s'} manualmente.`,'success',2200);
    }));
    if(clear)clear.addEventListener('click',()=>persistSelectedFirs([]));
    document.addEventListener('click',()=>{menu.hidden=true;btn.setAttribute('aria-expanded','false');});
  }

  // As funções centrais chamam esta rotina pela ponte depois de cada reconstrução.
  window.renderManualFirLayers=renderManualFirLayers;
  window.addEventListener('storage',event=>{if(event.key===FIR_STORAGE_KEY){syncFirPicker();renderManualFirLayers();}});
  document.addEventListener('DOMContentLoaded',()=>{bindFirPicker();setTimeout(renderManualFirLayers,80);});
})();
