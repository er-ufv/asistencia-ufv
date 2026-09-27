document.querySelector('#config-form').addEventListener('submit',e=>{
 e.preventDefault();const box=document.querySelector('#config-message');
 try{const u=new URL(document.querySelector('#project-url').value.trim());
 if(u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co')||u.username||u.password)throw Error('Introduce la URL HTTPS de tu proyecto, terminada en .supabase.co.');
 const key=document.querySelector('#public-key').value.trim();let valid=key.startsWith('sb_publishable_');
 if(!valid&&key.split('.').length===3){try{let p=key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');p+='='.repeat((4-p.length%4)%4);valid=JSON.parse(atob(p)).role==='anon';}catch{}}
 if(!valid)throw Error('Usa la clave Publishable o anon. No se admiten claves secret o service_role.');
 const config={supabaseUrl:u.origin,supabaseKey:key,timezone:document.querySelector('#timezone').value};
 const text='// Configuración pública. Nunca introduzcas contraseñas ni claves secret.\nwindow.ASISTENCIA_CONFIG = '+JSON.stringify(config,null,2)+';\n';
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:'text/javascript;charset=utf-8'}));a.href=url;a.download='config.js';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
 box.className='notice';box.textContent='Archivo generado. Reemplaza config.js en tu carpeta y súbelo con la aplicación a GitHub.';
 }catch(err){box.className='error';box.textContent=err.message;}
});
