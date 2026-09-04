(() => {
  'use strict';
  const PRODUCT_ID = 'FlightFlow';
  const APP_VERSION = 'FINAL-OFICIAL-SECURE-1.1';
  const SCHEMA_VERSION = 1;
  const DB_NAME = 'FlightFlowSecureDB';
  const DB_VERSION = 1;
  const STORES = Object.freeze({ records:'records', audit:'auditLog', tombstones:'tombstones', backups:'backups', meta:'meta' });
  const LEGACY = Object.freeze({
    config:'flightflow-config-v2', localities:'flightflow-localities-v1', aerodromes:'flightflow-custom-aerodromes-v1', geo:'flightflow-geo-coordinate-v4',
    aiModel:'flightflow-ai-governance-v1', aiSettings:'flightflow-ai-settings-v1', aiAudit:'flightflow-ai-audit-v1'
  });
  const COLLECTION_MAP = Object.freeze({
    config:['appSettings','main'], localities:['atsCoordinates','localities'], aerodromes:['atsCoordinates','customAerodromes'], geo:['atsCoordinates','geoData'],
    aiModel:['learnedPatterns','main'], aiSettings:['appSettings','aiSettings'], aiAudit:['auditLog','legacyAI']
  });
  const encoder = new TextEncoder();
  let dbPromise = null;
  let deviceId = '';
  let initialized = false;
  let timer = 0;
  let pendingReason = '';
  let lastSaveAt = '';
  let busy = false;

  const q = id => document.getElementById(id);
  const nowIso = () => new Date().toISOString();
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `ff-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const stable = value => {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') return Object.keys(value).sort().reduce((o,k)=>{o[k]=stable(value[k]);return o;},{});
    return value;
  };
  const canonical = value => JSON.stringify(stable(value));
  async function sha256(value) {
    const bytes = encoder.encode(typeof value === 'string' ? value : canonical(value));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  function txDone(tx){ return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('Falha na transação'));tx.onabort=()=>reject(tx.error||new Error('Transação cancelada'));}); }
  function reqDone(req){ return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('Falha no IndexedDB'));}); }
  function openDb(){
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve,reject)=>{
      if (!indexedDB) return reject(new Error('IndexedDB indisponível'));
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(STORES.records)){const s=db.createObjectStore(STORES.records,{keyPath:'id'});s.createIndex('collection','collection',{unique:false});s.createIndex('updatedAt','updatedAt',{unique:false});}
        if(!db.objectStoreNames.contains(STORES.audit)){const s=db.createObjectStore(STORES.audit,{keyPath:'id'});s.createIndex('at','at',{unique:false});}
        if(!db.objectStoreNames.contains(STORES.tombstones)){const s=db.createObjectStore(STORES.tombstones,{keyPath:'id'});s.createIndex('deletedAt','deletedAt',{unique:false});}
        if(!db.objectStoreNames.contains(STORES.backups)){const s=db.createObjectStore(STORES.backups,{keyPath:'id'});s.createIndex('createdAt','createdAt',{unique:false});}
        if(!db.objectStoreNames.contains(STORES.meta)) db.createObjectStore(STORES.meta,{keyPath:'key'});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('Não foi possível abrir a base segura'));
    });
    return dbPromise;
  }
  async function getMeta(key){const db=await openDb();const tx=db.transaction(STORES.meta,'readonly');const value=await reqDone(tx.objectStore(STORES.meta).get(key));await txDone(tx);return value?.value;}
  async function setMeta(key,value){const db=await openDb();const tx=db.transaction(STORES.meta,'readwrite');tx.objectStore(STORES.meta).put({key,value,updatedAt:nowIso()});await txDone(tx);}
  async function getRecord(collection,key){const db=await openDb();const tx=db.transaction(STORES.records,'readonly');const value=await reqDone(tx.objectStore(STORES.records).get(`${collection}:${key}`));await txDone(tx);return value||null;}
  async function putRecord(collection,key,value,reason='atualização',options={}){
    const db=await openDb(); const id=`${collection}:${key}`; const previous=await getRecord(collection,key); const contentHash=await sha256(value);
    if(previous && previous.contentHash===contentHash) return previous;
    const at=nowIso(); const revision=Math.max(Number(previous?.revision||0)+1,Number(options.revision||0));
    const record={id,collection,key,value:clone(value),createdAt:previous?.createdAt||at,updatedAt:at,revision,baseRevision:Number(previous?.revision||0),deviceId,contentHash,deletedAt:null};
    const audit={id:uuid(),at,action:'WRITE',collection,key,revision,deviceId,reason,contentHash};
    const tx=db.transaction([STORES.records,STORES.audit,STORES.tombstones],'readwrite');
    tx.objectStore(STORES.records).put(record);tx.objectStore(STORES.audit).put(audit);tx.objectStore(STORES.tombstones).delete(id);await txDone(tx);return record;
  }
  async function deleteRecord(collection,key,reason='exclusão'){
    const db=await openDb();const id=`${collection}:${key}`;const previous=await getRecord(collection,key);const at=nowIso();
    const tomb={id,collection,key,deletedAt:at,revision:Number(previous?.revision||0)+1,baseRevision:Number(previous?.revision||0),deviceId,contentHash:previous?.contentHash||''};
    const tx=db.transaction([STORES.records,STORES.tombstones,STORES.audit],'readwrite');tx.objectStore(STORES.records).delete(id);tx.objectStore(STORES.tombstones).put(tomb);tx.objectStore(STORES.audit).put({id:uuid(),at,action:'DELETE',collection,key,revision:tomb.revision,deviceId,reason});await txDone(tx);
  }
  async function all(store){const db=await openDb();const tx=db.transaction(store,'readonly');const rows=await reqDone(tx.objectStore(store).getAll());await txDone(tx);return rows||[];}
  function readLegacy(name){try{const raw=localStorage.getItem(name);return raw==null?null:JSON.parse(raw);}catch(_){return null;}}
  function writeLegacy(name,value){try{if(value==null)localStorage.removeItem(name);else localStorage.setItem(name,JSON.stringify(value));}catch(_){}}
  function currentRuntimeSnapshot(){
    const values={
      config: typeof state!=='undefined' ? clone(state.config) : readLegacy(LEGACY.config),
      localities: typeof state!=='undefined' ? {version:1,localities:clone(state.localities||{})} : readLegacy(LEGACY.localities),
      aerodromes: typeof state!=='undefined' ? {version:1,aerodromes:clone(state.customAerodromes||{})} : readLegacy(LEGACY.aerodromes),
      geo: typeof state!=='undefined' ? clone(state.geoData) : readLegacy(LEGACY.geo),
      aiModel: readLegacy(LEGACY.aiModel), aiSettings:readLegacy(LEGACY.aiSettings), aiAudit:readLegacy(LEGACY.aiAudit)
    };
    if(values.config?.fieldLayout) values.fieldLayout=clone(values.config.fieldLayout);
    return values;
  }
  async function snapshot(reason='autosave'){
    if(busy)return;busy=true;pendingReason='';updateStatus('Gravando alterações com transação…');
    try{
      const values=currentRuntimeSnapshot();
      for(const [name,pair] of Object.entries(COLLECTION_MAP)){if(values[name]!=null)await putRecord(pair[0],pair[1],values[name],reason);}
      if(values.fieldLayout!=null)await putRecord('fieldLayouts','main',values.fieldLayout,reason);
      await setMeta('lastSaveAt',nowIso());lastSaveAt=await getMeta('lastSaveAt');updateStatus(`Alterações protegidas em ${formatDate(lastSaveAt)}.`,'success');
    }catch(error){console.error(error);updateStatus(`Falha ao salvar na base segura: ${error.message}`,'error');}
    finally{busy=false;renderState();}
  }
  function scheduleSnapshot(reason='alteração',options={}){pendingReason=reason;clearTimeout(timer);if(options.immediate){timer=setTimeout(()=>snapshot(reason),0);}else{timer=setTimeout(()=>snapshot(pendingReason||reason),500);}renderState();}
  async function flush(reason='flush'){clearTimeout(timer);return snapshot(pendingReason||reason);}
  async function hydrateFromCanonical(){
    const mappings=Object.entries(COLLECTION_MAP);let reloadNeeded=false;let canonicalCount=0;
    for(const [name,[collection,key]] of mappings){const rec=await getRecord(collection,key);if(!rec)continue;canonicalCount++;const legacyKey=LEGACY[name];if(!legacyKey)continue;const local=readLegacy(legacyKey);const localHash=await sha256(local);if(localHash!==rec.contentHash){writeLegacy(legacyKey,rec.value);reloadNeeded=true;}}
    const layout=await getRecord('fieldLayouts','main');
    if(layout){const config=readLegacy(LEGACY.config)||{};if(canonical(config.fieldLayout||{})!==canonical(layout.value||{})){config.fieldLayout=layout.value;writeLegacy(LEGACY.config,config);reloadNeeded=true;}}
    if(reloadNeeded && !sessionStorage.getItem('flightflow-secure-hydrated')){sessionStorage.setItem('flightflow-secure-hydrated','1');location.reload();return true;}
    if(!canonicalCount)await snapshot('migração inicial do armazenamento rápido');
    return false;
  }
  async function saveHistory(input){
    try{
      const raw=String(input?.rawText||'');if(!raw.trim())return null;const rawHash=await sha256(raw);const key=rawHash.slice(0,24);
      const value={id:key,name:input.name||'historico.txt',sourceName:input.sourceName||input.name||'Histórico',rawText:raw,fileSize:Number(input.fileSize||raw.length),fileType:input.fileType||'text/plain',callsign:input.parsed?.meta?.callsign||'',adep:input.parsed?.meta?.adep||'',ades:input.parsed?.meta?.ades||'',eventCount:Array.isArray(input.parsed?.events)?input.parsed.events.length:0,importedAt:nowIso(),rawHash};
      await putRecord('histories',key,value,'histórico carregado');await setMeta('lastWorkspaceId',key);await updateHistoryCount();return value;
    }catch(error){console.warn('Histórico não persistido',error);return null;}
  }
  async function exportKnownDatabase(dbName,storeName){
    return new Promise(resolve=>{let request;try{request=indexedDB.open(dbName);}catch(_){return resolve([]);}let created=false;request.onupgradeneeded=()=>{created=true};request.onerror=()=>resolve([]);request.onsuccess=async()=>{const db=request.result;if(created||!db.objectStoreNames.contains(storeName)){db.close();return resolve([]);}try{const tx=db.transaction(storeName,'readonly');const rows=await reqDone(tx.objectStore(storeName).getAll());await txDone(tx);db.close();resolve(rows||[]);}catch(_){db.close();resolve([]);}};});
  }
  async function capturePayload(){
    await flush('exportação de backup');
    const [records,tombstones,auditLog,manuals,groundCache]=await Promise.all([all(STORES.records),all(STORES.tombstones),all(STORES.audit),exportKnownDatabase('FlightFlowAIBrain','manuals'),exportKnownDatabase('flightflow-airport-ground-v1','airports')]);
    return {records,tombstones,auditLog,externalDatabases:{manuals,groundCache}};
  }
  async function makeBackupObject(){
    const payload=await capturePayload();const exportedAt=nowIso();const exportId=uuid();const recordCounts={records:payload.records.length,tombstones:payload.tombstones.length,auditLog:payload.auditLog.length,manuals:payload.externalDatabases.manuals.length,groundCache:payload.externalDatabases.groundCache.length};
    const manifest={productId:PRODUCT_ID,appVersion:APP_VERSION,schemaVersion:SCHEMA_VERSION,exportId,exportedAt,deviceId,recordCounts,checksum:''};
    manifest.checksum=await sha256({manifest:{...manifest,checksum:''},payload});return {manifest,payload};
  }
  function downloadJson(value,name){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  async function exportBackup(){
    try{updateStatus('Congelando fotografia lógica e calculando SHA-256…');const backup=await makeBackupObject();const stamp=backup.manifest.exportedAt.replace(/[-:]/g,'').replace('T','_').slice(0,13);downloadJson(backup,`FlightFlow_FULL_${stamp}_${APP_VERSION}.ffbackup.json`);await storeRestorePoint(backup,'export-manual');await setMeta('lastExportAt',backup.manifest.exportedAt);await setMeta('lastExportId',backup.manifest.exportId);await putRecord('syncState','main',{lastExportAt:backup.manifest.exportedAt,lastExportId:backup.manifest.exportId,deviceId},'backup exportado');updateStatus(`Backup completo validado: ${backup.payload.records.length} registros e checksum ${backup.manifest.checksum.slice(0,12)}…`,'success');}
    catch(error){console.error(error);updateStatus(`Não foi possível exportar o backup: ${error.message}`,'error');}
  }
  async function validateBackupObject(obj){
    if(!obj||typeof obj!=='object')throw new Error('JSON inválido');if(obj.manifest?.productId!==PRODUCT_ID)throw new Error('Arquivo não pertence ao FlightFlow');if(Number(obj.manifest?.schemaVersion)!==SCHEMA_VERSION)throw new Error(`Schema ${obj.manifest?.schemaVersion} incompatível`);if(!obj.payload||!Array.isArray(obj.payload.records))throw new Error('Payload de registros ausente');
    const expected=await sha256({manifest:{...obj.manifest,checksum:''},payload:obj.payload});if(expected!==obj.manifest.checksum)throw new Error('Checksum SHA-256 inválido: o arquivo pode estar corrompido ou alterado');return true;
  }
  async function storeRestorePoint(backup,reason){const db=await openDb();const record={id:uuid(),createdAt:nowIso(),reason,backup};const tx=db.transaction(STORES.backups,'readwrite');tx.objectStore(STORES.backups).put(record);await txDone(tx);const rows=await all(STORES.backups);rows.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));for(const old of rows.slice(5)){const t=db.transaction(STORES.backups,'readwrite');t.objectStore(STORES.backups).delete(old.id);await txDone(t);}return record;}
  async function createInternalRestorePoint(reason){const backup=await makeBackupObject();return storeRestorePoint(backup,reason);}
  async function importExternalRows(dbName,version,storeName,keyPath,rows,mode){
    if(!Array.isArray(rows)||!rows.length)return;const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(dbName,version);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(storeName))r.result.createObjectStore(storeName,{keyPath});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    const tx=db.transaction(storeName,'readwrite');const store=tx.objectStore(storeName);if(mode==='restore')store.clear();rows.forEach(row=>store.put(row));await txDone(tx);db.close();
  }
  async function applyBackup(obj,policy='merge',conflictPolicy='local'){
    await validateBackupObject(obj);
    await createInternalRestorePoint('antes da importação');
    const db=await openDb();
    const imported=obj.payload.records||[];
    const importedTombstones=obj.payload.tombstones||[];
    const importedAudit=obj.payload.auditLog||[];
    const localRows=await all(STORES.records);
    const localMap=new Map(localRows.map(row=>[row.id,row]));
    const report={new:0,updated:0,identical:0,older:0,conflicts:0,copied:0,deleted:0};
    const recordPuts=[];
    const deletes=[];
    const tombstonePuts=[];
    for(const rec0 of imported){
      const rec=clone(rec0);
      if(!rec?.collection||!rec?.key)continue;
      if(policy==='copy'&&rec.collection!=='histories')continue;
      if(policy==='copy'){
        const suffix=`copy-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
        rec.key=`${rec.key}-${suffix}`;rec.id=`${rec.collection}:${rec.key}`;
        rec.value={...rec.value,id:rec.key,name:`${rec.value?.name||'Histórico'} (cópia)`};
        rec.createdAt=nowIso();rec.updatedAt=rec.createdAt;rec.revision=1;rec.baseRevision=0;rec.deviceId=deviceId;rec.contentHash=await sha256(rec.value);
        recordPuts.push(rec);report.copied++;continue;
      }
      const local=localMap.get(rec.id);
      if(!local){recordPuts.push(rec);report.new++;continue;}
      if(local.contentHash===rec.contentHash){report.identical++;continue;}
      const lr=Number(local.revision||0),ir=Number(rec.revision||0);
      if(ir>lr||policy==='restore'){recordPuts.push(rec);report.updated++;}
      else if(ir<lr){report.older++;}
      else{
        report.conflicts++;
        if(conflictPolicy==='imported'){recordPuts.push(rec);report.updated++;}
        else if(conflictPolicy==='copy'){
          const suffix=`conflict-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
          const copy={...rec,key:`${rec.key}-${suffix}`,id:`${rec.collection}:${rec.key}-${suffix}`,createdAt:nowIso(),updatedAt:nowIso(),revision:1,baseRevision:0,deviceId};
          recordPuts.push(copy);report.copied++;
        }
      }
    }
    for(const tomb0 of importedTombstones){
      const tomb=clone(tomb0);if(!tomb?.collection||!tomb?.key)continue;
      const local=localMap.get(tomb.id);
      const shouldApply=policy==='restore'||!local||Number(tomb.revision||0)>Number(local.revision||0);
      if(shouldApply){deletes.push(tomb.id);tombstonePuts.push(tomb);if(local)report.deleted++;}
    }
    const tx=db.transaction([STORES.records,STORES.tombstones,STORES.audit],'readwrite');
    const recordStore=tx.objectStore(STORES.records),tombStore=tx.objectStore(STORES.tombstones),auditStore=tx.objectStore(STORES.audit);
    if(policy==='restore'){recordStore.clear();tombStore.clear();auditStore.clear();}
    recordPuts.forEach(rec=>{recordStore.put(rec);tombStore.delete(rec.id);});
    deletes.forEach(id=>recordStore.delete(id));
    tombstonePuts.forEach(tomb=>tombStore.put(tomb));
    importedAudit.forEach(entry=>{if(entry?.id)auditStore.put(entry);});
    auditStore.put({id:uuid(),at:nowIso(),action:'IMPORT',deviceId,policy,conflictPolicy,report,sourceExportId:obj.manifest.exportId});
    await txDone(tx);
    if(policy!=='copy'){
      await importExternalRows('FlightFlowAIBrain',1,'manuals','id',obj.payload.externalDatabases?.manuals||[],policy);
      await importExternalRows('flightflow-airport-ground-v1',1,'airports','code',obj.payload.externalDatabases?.groundCache||[],policy);
    }
    await hydrateToLegacy();
    await setMeta('lastImportReport',report);
    await setMeta('lastSyncAt',nowIso());
    await setMeta('lastImportedExportId',obj.manifest.exportId);
    await putRecord('syncState','main',{lastSyncAt:await getMeta('lastSyncAt'),lastImportedExportId:obj.manifest.exportId,deviceId,report},'sincronização manual');
    return report;
  }
  async function hydrateToLegacy(){for(const [name,[collection,key]] of Object.entries(COLLECTION_MAP)){const rec=await getRecord(collection,key);if(rec&&LEGACY[name])writeLegacy(LEGACY[name],rec.value);}const layout=await getRecord('fieldLayouts','main');if(layout){const config=readLegacy(LEGACY.config)||{};config.fieldLayout=layout.value;writeLegacy(LEGACY.config,config);}}
  async function importBackupFile(file){
    try{if(!file)return;updateStatus('Validando arquivo, manifest e checksum…');if(file.size>100*1024*1024)throw new Error('Backup maior que 100 MB');const obj=JSON.parse(await file.text());await validateBackupObject(obj);const counts=obj.manifest.recordCounts||{};const policy=q('secureImportPolicy')?.value||'merge';const conflict=q('secureConflictPolicy')?.value||'local';const message=`Backup de ${new Date(obj.manifest.exportedAt).toLocaleString('pt-BR')}\nRegistros: ${counts.records||0}\nManuais: ${counts.manuals||0}\nPolítica: ${policy}\n\nContinuar?`;if(!confirm(message)){updateStatus('Importação cancelada.','warning');return;}const report=await applyBackup(obj,policy,conflict);updateStatus(`Importação concluída: ${report.new} novos, ${report.updated} atualizados, ${report.identical} idênticos, ${report.conflicts} conflitos, ${report.deleted} exclusões. Reiniciando…`,'success');sessionStorage.removeItem('flightflow-secure-hydrated');setTimeout(()=>location.reload(),1200);}
    catch(error){console.error(error);updateStatus(`Importação bloqueada: ${error.message}`,'error');}finally{if(q('secureBackupFileInput'))q('secureBackupFileInput').value='';}
  }
  async function restorePreviousPoint(){
    try{const rows=await all(STORES.backups);rows.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));const point=rows[0];if(!point)throw new Error('Nenhum ponto de restauração disponível');if(!confirm(`Restaurar o ponto criado em ${new Date(point.createdAt).toLocaleString('pt-BR')}?`))return;const report=await applyBackup(point.backup,'restore','imported');updateStatus(`Ponto restaurado. ${report.new+report.updated} registros aplicados. Reiniciando…`,'success');sessionStorage.removeItem('flightflow-secure-hydrated');setTimeout(()=>location.reload(),1000);}
    catch(error){updateStatus(`Não foi possível restaurar: ${error.message}`,'error');}
  }
  async function validateStorage(){
    try{updateStatus('Verificando hashes e registros críticos…');const records=await all(STORES.records);let invalid=0;for(const rec of records){if(await sha256(rec.value)!==rec.contentHash)invalid++;}const critical=['appSettings:main','fieldLayouts:main','atsCoordinates:localities'];const ids=new Set(records.map(r=>r.id));const missing=critical.filter(id=>!ids.has(id));if(invalid)throw new Error(`${invalid} registro(s) com hash inválido`);updateStatus(`Integridade confirmada: ${records.length} registros, nenhum hash inválido${missing.length?`; pendentes: ${missing.join(', ')}`:''}.`,'success');}
    catch(error){updateStatus(`Verificação encontrou problema: ${error.message}`,'error');}
  }
  async function openLastHistory(){
    try{
      const lastId=await getMeta('lastWorkspaceId');
      let rec=lastId?await getRecord('histories',lastId):null;
      if(!rec){const histories=(await all(STORES.records)).filter(row=>row.collection==='histories').sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));rec=histories[0]||null;}
      if(!rec?.value?.rawText)throw new Error('Nenhum histórico salvo na base segura');
      const file=new File([rec.value.rawText],rec.value.name||'historico_salvo.txt',{type:rec.value.fileType||'text/plain',lastModified:Date.now()});
      if(typeof selectFile==='function')selectFile(file);
      if(typeof loadFile==='function')await loadFile(file,false);
      updateStatus(`Histórico ${rec.value.name||rec.key} restaurado da base segura.`,'success');
    }catch(error){updateStatus(`Não foi possível abrir o histórico salvo: ${error.message}`,'error');}
  }
  async function updateHistoryCount(){try{const rows=await all(STORES.records);const count=rows.filter(row=>row.collection==='histories').length;if(q('secureHistoryCount'))q('secureHistoryCount').textContent=String(count);}catch(_){}}
  function formatDate(value){try{return value?new Date(value).toLocaleString('pt-BR'):'—';}catch(_){return value||'—';}}
  function updateStatus(message,level='normal'){const el=q('secureStorageStatus');if(el){el.textContent=message;el.dataset.level=level;}}
  function renderState(){if(q('secureStorageDbState'))q('secureStorageDbState').textContent=initialized?'IndexedDB ativo · schema 1':'Inicializando…';if(q('secureStorageLastSave'))q('secureStorageLastSave').textContent=lastSaveAt?formatDate(lastSaveAt):(pendingReason?'Alteração pendente':'—');if(q('secureStorageDeviceId'))q('secureStorageDeviceId').textContent=deviceId?deviceId.slice(0,18):'—';}
  function bindUi(){
    q('secureSaveNowBtn')?.addEventListener('click',()=>flush('salvamento manual'));q('secureExportBackupBtn')?.addEventListener('click',exportBackup);q('secureImportBackupBtn')?.addEventListener('click',()=>q('secureBackupFileInput')?.click());q('secureBackupFileInput')?.addEventListener('change',e=>importBackupFile(e.target.files?.[0]));q('secureValidateStorageBtn')?.addEventListener('click',validateStorage);q('secureRestorePointBtn')?.addEventListener('click',restorePreviousPoint);q('secureOpenLastHistoryBtn')?.addEventListener('click',openLastHistory);
    document.addEventListener('click',event=>{const critical=event.target.closest('[data-ai-feedback],[data-ai-restore-confirmed],[data-ai-restore-fp],[data-remove-field],[data-remove-custom],[data-remove-locality],#aiRestoreConfirmedAll,#aiResetBtn');if(critical)setTimeout(()=>flush('ação crítica do operador'),0);},true);
    window.addEventListener('pagehide',()=>{try{flush('fechamento da página');}catch(_){}});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush('página oculta');});
  }
  async function init(){
    try{const db=await openDb();deviceId=await getMeta('deviceId')||localStorage.getItem('flightflow-device-id')||uuid();localStorage.setItem('flightflow-device-id',deviceId);await setMeta('deviceId',deviceId);lastSaveAt=await getMeta('lastSaveAt')||'';initialized=true;renderState();bindUi();const reloaded=await hydrateFromCanonical();if(reloaded)return;lastSaveAt=await getMeta('lastSaveAt')||lastSaveAt;renderState();await updateHistoryCount();updateStatus('Base segura pronta. Autosave transacional de 500 ms habilitado.','success');}
    catch(error){console.error(error);updateStatus(`IndexedDB indisponível: ${error.message}. O programa continuará com o espelho local, mas exporte backups com frequência.`,'error');renderState();}
  }
  window.FlightFlowStorage=Object.freeze({init,scheduleSnapshot,flush,snapshot,saveHistory,exportBackup,importBackupFile,validateStorage,deleteRecord,getRecord,version:APP_VERSION,schemaVersion:SCHEMA_VERSION});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
