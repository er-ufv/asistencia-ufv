# AsistenciaQR

Aplicación estática en español para GitHub Pages, con Supabase como base de datos y autenticación del profesor. Alumnos: formulario móvil sin cuenta, protegido por código personal y QR semanal. Profesor: grupos, importación CSV, sesiones, correcciones e historial.

## Empieza aquí

Abre **GUIA-SUPABASE.html**: explica la configuración completa y permite generar config.js con un formulario. También puedes abrir index.html para explorar la demostración sin conectar ninguna cuenta.

1. Crea un proyecto gratuito en Supabase.
2. Ejecuta supabase/01-configurar.sql completo en SQL Editor.
3. Crea tu usuario de profesor en Authentication > Users y ejecuta supabase/02-autorizar-profesor.sql cambiando el correo.
4. Rellena config.js con la URL y la clave PUBLICABLE, o genéralo desde la guía. Nunca uses service_role, secret o contraseñas.
5. Publica el contenido de esta carpeta en la raíz de un repositorio público de GitHub y activa Pages (main / root).
6. Abre la dirección publicada, entra como profesor e importa la plantilla para probar entre tu ordenador y tu móvil.

No se necesitan npm, compilación, API de OpenAI ni un servicio externo de QR. El único servicio de datos es tu Supabase.

## Archivos

- index.html, styles.css, app.js, core.js: interfaz y lógica del navegador.
- config.js: URL, clave publicable y zona horaria de los grupos nuevos.
- vendor/qrcode.js: generador QR local qrcode-generator 1.4.4 (MIT).
- supabase/01-configurar.sql: tablas privadas y funciones API con permisos explícitos.
- supabase/02-autorizar-profesor.sql: autorización de un usuario creado en Supabase Auth.
- plantilla-alumnos.csv: ejemplos ficticios para importar, separador punto y coma, UTF-8.
- GUIA-SUPABASE.html y guide.js: guía y generador local de configuración.

## Operación y límites

- La demo usa localStorage y SOLO comparte cambios entre pestañas del mismo navegador/origen. No sirve para recoger asistencias reales entre dispositivos. Se elimina borrando los datos del sitio (clave aq-demo-v1).
- La aplicación real guarda los registros exclusivamente en Supabase. No cae silenciosamente al modo demo si hay errores.
- La sesión del profesor se guarda en sessionStorage de su pestaña y se refresca cuando hace falta. No hay registro público en la interfaz. Una cuenta no autorizada no puede utilizar el panel ni acceder a tablas.
- La matrícula se identifica por grupo e identificador. La importación actualiza nombres sin cambiar códigos existentes. No elimina ni traslada matrículas. Un cambio de grupo crea otra matrícula; los grupos anteriores se conservan para consultar su historial.
- La lista queda fijada al abrir una sesión: cambios de nombre o alumnos nuevos no modifican sesiones anteriores. No abras la clase antes de terminar la importación.
- Los QR caducan el lunes a las 00:00 en la zona horaria del grupo. El panel genera el nuevo al visitarlo o abrir clase. No hace falta una tarea programada.
- Cada grupo puede tener una sola sesión abierta. Se cierra por tiempo (5, 10, 15 o 30 minutos) o manualmente. Crear una nueva cierra la anterior.
- La hora y la caducidad se comprueban en la base de datos. Presentes y ausentes corresponden a la lista de cada sesión.
- Los códigos de 12 caracteres hexadecimales se generan en servidor y se guardan como SHA-256 con el ID del grupo. El profesor solo ve el código en la importación o al regenerarlo. Entrega los códigos individualmente; el CSV de códigos es privado.
- Se limitan intentos por grupo (600/5 minutos) y nombre normalizado (8/5 minutos). Esto reduce intentos de adivinar códigos, pero no sustituye una protección de red frente a ataques volumétricos.
- Las correcciones se auditan en aq_private.corrections. Una ausencia marcada por el profesor no puede revertirse mediante el formulario de alumno.
- El panel se actualiza cada 20 segundos mientras está visible. Historial carga las últimas 300 sesiones; el filtro de fecha recupera también las anteriores. Exporta una sesión por CSV.
- Nombres y apellidos se comparan ignorando mayúsculas, tildes y espacios repetidos. No se usa coincidencia aproximada que pueda asignar otra identidad.
- El QR y el código personal se pueden compartir: no acreditan presencia física.
- El plan gratuito de Supabase tiene límites y puede pausar proyectos por inactividad. Exporta periódicamente datos y revisa el proyecto tras vacaciones.

## Modelo de acceso

aq_private no se expone en la Data API. Todas sus tablas tienen RLS activado, sin permisos para anon/authenticated. Solo las funciones con security definer, search_path vacío y comprobación de propiedad pueden operar sobre ellas. No se precisa una clave de servicio en el navegador.

API pública:
- aq_portal(p_token): devuelve únicamente el grupo y la disponibilidad de la clase.
- aq_checkin(p_token,p_first,p_last,p_code): valida token, tiempo, código, matrícula y duplicados en una transacción.

API autenticada:
- aq_admin(action,payload): exige auth.uid() autorizado y limita cada operación a grupos del profesor. Acciones: dashboard, create_group, import, open, close, report, correct, reset_code, sessions_date.

## Validación y puesta en marcha

Se incluyen resultados de comprobación en VALIDACION.md. La conexión real con tu proyecto y la publicación no están hechas todavía: necesitas completar la guía y la prueba entre dos dispositivos.

Documentación: https://supabase.com/docs/guides/database/functions · https://supabase.com/docs/guides/database/secure-data · https://docs.github.com/en/pages/quickstart

## Actualización UFV

Se incluye el logo original facilitado por el usuario en assets/logo-ufv.png. El azul #0d3b5e se ha extraído de ese archivo.

El CSV admite curso, codigo_asignatura, asignatura y numero_matricula. Son opcionales; se conservan en la matrícula del alumno y en la lista de cada sesión. Los valores faltantes se mantienen desconocidos; no se asume primera matrícula. Una importación sin esos campos no borra datos académicos ya existentes.

La matrícula se muestra en grupos, listas de clase e historial y se puede filtrar. Se incluye en exportaciones de asistencia y de códigos, junto con curso y asignatura. No altera las reglas de asistencia ni se expone a otros alumnos.

Si actualizas desde la versión inicial, conserva tu config.js, vuelve a ejecutar 01-configurar.sql y reimporta tu CSV completo. No se requiere recrear usuarios ni borrar datos. Las sesiones anteriores conservan sus valores originales (sin dato si entonces no se guardaban).

Los listados reales se entregan por separado en una carpeta privada y nunca se incluyen en el ZIP publicable.
