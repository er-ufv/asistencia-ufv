# Comprobaciones realizadas

## Actualización UFV comprobada el 27 de septiembre de 2026

- Logo original y azul UFV revisados en las pantallas del profesor y del alumno.
- Pruebas de navegador completadas: filtros de matrícula, historial, importación, exportación y pantalla móvil sin desbordamiento.
- Conversión del Excel verificada fila a fila: 37 alumnos, 35 en primera matrícula y 2 en segunda. Curso se conserva por separado: 32 en primero y 5 en segundo.
- Pruebas PostgreSQL locales completadas: actualización desde el esquema anterior sin borrar sesiones; conservación de curso, asignatura y matrícula; los cambios posteriores no modifican las listas históricas.
- La lista real está en un CSV privado separado y no se incluye en el ZIP publicable.
- Sigue pendiente configurar el proyecto real de Supabase, publicar en GitHub Pages y completar la prueba entre dispositivos con la URL publicada.

16 de septiembre de 2026.

## Resultado

Aplicación preparada para configurar y publicar. No se ha conectado una cuenta de Supabase ni publicado en GitHub. Los archivos de configuración no contienen credenciales ni alumnos reales.

## Pruebas completadas

- Sintaxis JavaScript de los archivos de la aplicación.
- Ejecución del SQL en PostgreSQL local mediante PGlite, incluyendo una segunda ejecución para comprobar que la instalación puede repetirse.
- Importación de alumnos, actualización sin revelar códigos y copia de la lista al abrir una sesión.
- Identificación ignorando mayúsculas, tildes y espacios repetidos.
- Registro correcto y rechazo de códigos incorrectos, QR inválidos/caducados, sesiones cerradas y sesiones cuyo tiempo se agotó.
- Duplicados: una matrícula conserva un solo registro por sesión.
- Límites de intentos persistentes tras respuestas fallidas.
- Generación de nuevos códigos y rechazo de los anteriores.
- Correcciones de profesor y protección contra su reversión desde el formulario del alumno.
- Separación de los datos de distintos profesores; denegación de lectura directa de tablas y de funciones administrativas a usuarios anónimos/no autorizados.
- Interfaz en Edge con vista de escritorio de 1440 px y móvil de 390 px; sin desbordamiento horizontal general ni errores JavaScript observados.
- Navegación, búsqueda, importación CSV, descarga de códigos, historial, correcciones, exportación de asistencia y generador de configuración.
- CSV con comillas, separadores, BOM, identificadores repetidos y protección de celdas que comienzan con caracteres de fórmula.
- QR generado y decodificado con una biblioteca independiente: el contenido coincide con el enlace del grupo.
- Integración de la interfaz con el SQL real mediante un transporte local que simula Supabase: 40 alumnos y dos contextos de navegador independientes. Se verificó que una respuesta de guardado fallida no muestra confirmación; un registro correcto aparece en el panel y deja 39 ausencias al cerrar la sesión.

## Pendiente al conectar tu cuenta

- Autenticación y respuestas de la API de tu proyecto real de Supabase. Las pruebas de integración locales simularon el transporte HTTPS y la autenticación; no equivalen a una prueba de extremo a extremo en tu cuenta.
- Publicación y rutas bajo tu dirección real de GitHub Pages.
- Escaneo con tu cámara y registro real entre tu móvil y tu ordenador, siguiendo el paso 7 de la guía.
- La lectura opcional de resumen vía WebMCP solo se activa si el navegador admite document.modelContext. No se dispone de un contexto nativo compatible para validarla; la aplicación no depende de esta función.

Las comprobaciones no son una auditoría de seguridad externa ni una prueba de carga del servicio alojado. El código personal y el QR no demuestran presencia física.
