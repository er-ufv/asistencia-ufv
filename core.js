/* Utilidades compartidas. Sin dependencias externas. */
(function(root){
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function enrollment(value){
    if(value==null||String(value).trim()==='')return null;
    const text=String(value).trim();
    if(!/^[1-9]\d?$/.test(text)||Number(text)>20)throw Error('El número de matrícula debe ser un entero entre 1 y 20.');
    return Number(text);
  }
  function academicMeta(o){
    let year=o.curso==null||String(o.curso).trim()===''?null:Number(o.curso);
    if(year!==null&&(!Number.isInteger(year)||year<1||year>10))throw Error('El curso debe ser un entero entre 1 y 10.');
    return {numero_matricula:enrollment(o.numero_matricula),curso:year,codigo_asignatura:String(o.codigo_asignatura||'').trim(),asignatura:String(o.asignatura||'').trim()};
  }
  function enrollmentLabel(n){return n==null?'Sin dato':n===1?'1.ª matrícula':n===2?'2.ª matrícula':n+'.ª matrícula';}
  function parseCSV(text){
    text=text.replace(/^\uFEFF/,'');
    const first=text.split(/\r?\n/)[0];const sep=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
    const rows=[];let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++){let c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===sep&&!quoted){row.push(cell.trim());cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}
    if(quoted)throw Error('Hay comillas sin cerrar en el CSV.');row.push(cell.trim());if(row.some(Boolean))rows.push(row);
    if(rows.length<2)throw Error('El CSV debe incluir cabeceras y al menos un alumno.');
    const header=rows.shift().map(s=>normalize(s).replace(/\s+/g,'_')),required=['identificador','nombre','apellidos','grupo'];
    if(!required.every(h=>header.includes(h)))throw Error('Usa las columnas identificador, nombre, apellidos y grupo.');
    if(rows.length>500)throw Error('Importa un máximo de 500 alumnos cada vez.');
    const seen=new Set();return rows.map((r,i)=>{const o=Object.fromEntries(required.map(k=>[k,r[header.indexOf(k)]||'']));if(Object.values(o).some(v=>!v||v.length>100))throw Error('Revisa los campos de la fila '+(i+2)+'.');const key=normalize(o.grupo)+'|'+normalize(o.identificador);if(seen.has(key))throw Error('Identificador repetido en el mismo grupo: '+o.identificador);seen.add(key);const optional=['curso','codigo_asignatura','asignatura','numero_matricula'];const raw=Object.fromEntries(optional.map(k=>[k,header.includes(k)?r[header.indexOf(k)]:null]));if(String(raw.asignatura||'').length>150||String(raw.codigo_asignatura||'').length>100)throw Error('Revisa los datos de asignatura de la fila '+(i+2)+'.');return {...o,...academicMeta(raw)};});
  }
  function csv(rows){return '\uFEFF'+rows.map(r=>r.map(v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(';')).join('\r\n');}
  function randomCode(){const b=new Uint8Array(6);crypto.getRandomValues(b);return Array.from(b,x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();}
  function dateKey(d=new Date(),timezone='Europe/Madrid'){return new Intl.DateTimeFormat('sv-SE',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
  const api={normalize,escape,parseCSV,csv,randomCode,dateKey,academicMeta,enrollmentLabel};root.AQCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
