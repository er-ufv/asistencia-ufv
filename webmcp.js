/* Lectura opcional del resumen visible para navegadores compatibles. */
(() => {
  if (studentToken || !document.modelContext?.registerTool) return;
  const lifecycle = new AbortController();
  const tool = {
    name: 'read_visible_attendance_summary',
    title: 'Consultar resumen de asistencia visible',
    description: 'Lee los totales de la sesión seleccionada en el panel del profesor. No abre clases ni modifica registros.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('Esta consulta no admite parámetros.');
      if ((!isDemo && !auth) || !report) throw new Error('Entra como profesor y selecciona una sesión.');
      return {
        demo: isDemo,
        group: currentGroup()?.name,
        session: report.session.label,
        date: report.session.class_date,
        open: active(report.session),
        total: report.rows.length,
        present: report.rows.filter(r => r.present).length,
        missing: report.rows.filter(r => !r.present).length
      };
    }
  };
  try {
    Promise.resolve(document.modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => {});
  } catch { /* Navegador sin soporte completo: la interfaz sigue disponible. */ }
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
})();
