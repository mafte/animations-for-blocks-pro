# Tareas: AOS original

[Spec aprobada](../SPEC-aos-optimization.md). [Plan](plan.md) aprobado; ejecución en curso. Checklist única, sin tracker externo. ANFB_AOS_AUDIT se define en el plan.

## 01 — Congelar control y entorno

- [x] Crear control independiente de master; manifest con revisiones/hashes/versiones y dependencias propias sin enlaces al candidato.
- [x] Registrar build/pruebas originales y descubrir sitios/navegadores; comprobar ANFB_TEST_SITE efectivo y versiones mínimas disponibles.

**Verificar:** comandos de control del plan, node --version y corepack pnpm --version; conservar logs/hashes. **Depende:** ninguna. **Archivos:** docs/aos-evaluation.md; control/manifest/logs en temporal privada. **Tamaño:** S.

## 02 — Caracterizar contratos sobre bundles reales

- [x] Crear runner Playwright y fixture HTTP, con cierre de recursos y código de salida de error ante aserción fallida.
- [x] Caracterizar API/opciones/clases/eventos, nueve placements, once/mirror, anclajes, scroll inverso/saltos; geometría de layout y latencia separadas.
- [x] Distinguir defectos originales de criterios del candidato; dejar el arnés preparado para ampliar casos CSS/DOM en sus tareas específicas.

**Verificar:** comando --mode contract del plan con original y copia idéntica; introducir temporalmente una diferencia de fixture y comprobar fallo del runner. **Depende:** 01. **Archivos:** tests/aos-browser.cjs (runner y fixture HTTP en un archivo), docs/aos-evaluation.md. **Tamaño:** M.

## 03 — Medir baseline y priorizar

- [x] Benchmark de 0/30/100/500 elementos, 1000 estrés, dos viewports, CPU normal/×4, calentamiento y cinco muestras alternadas por caso.
- [x] Medir inicialización, refresh y respuesta a scroll, tamaños raw/gzip y conteos; registrar medianas/p95, unidades y definiciones.
- [ ] Medir coste de lotes de mutaciones, reposo y waterfall HTTP WordPress en sus tareas enfocadas (06/09); no existe sitio desechable disponible aún.
- [x] Medir control contra control y ruido; priorizar CPU/CSS/arranque/compatibilidad antigua según trazas y bundle real.

**Verificar:** comando --mode benchmark; revisar muestras, repetibilidad, trazas y hashes. **Depende:** 02. **Archivos:** ambos archivos del runner y docs/aos-evaluation.md. **Tamaño:** M.

### Checkpoint A — Antes de modificar el motor

- [ ] Contratos/perfiles documentados; el arnés detecta diferencias y no atribuye mejoras a control/control.
- [ ] Revisar con el usuario prioridades y límites antes de continuar.

## 04 — Compilar fuentes originales reproducibles

- [ ] Parche pnpm exacto que retire solo import SCSS interno; importar fuente desde src/init.js manteniendo CSS dist actual.
- [ ] Conservar MIT/procedencia y aplicar parche con instalación congelada limpia, sin ignorar fallos.
- [ ] Misma caracterización funcional, chunks esperados y ausencia de CSS duplicado/recursos faltantes.

**Verificar:** patch/patch-commit e instalación limpia del plan, npm test, npm run build, contratos y análisis de chunks/tamaños. **Depende:** checkpoint A. **Archivos:** patches/aos@3.0.0-beta.6.patch, pnpm-workspace.yaml, pnpm-lock.yaml, src/init.js, licenses/aos.txt; build generado. Si pnpm exige más configuración, separar esa preparación. **Tamaño:** M.

## 05 — Corregir acumulación de listeners

- [ ] Un listener AOS de scroll tras 100 refresh y 100 refreshHard, incluidos resize/orientación/load tardío.
- [ ] Reinit mantiene eventos/observador únicos, ajustes actualizados y cancelación de trabajo pendiente, conservando throttle/startEvent y listeners ajenos.
- [ ] Regresión falla en original y pasa en candidato; mismas clases/eventos/geometría.

**Verificar:** nuevo node tests/aos-engine.mjs, incluido en npm test mediante package.json; build, contratos y benchmark de refrescos. **Depende:** 04. **Archivos:** parche AOS, tests/aos-engine.mjs, package.json, docs/aos-evaluation.md; lockfile/build mecánicos. **Tamaño:** M.

### Checkpoint B — Primera corrección

- [ ] Pruebas/build/contratos correctos; fuente reproducible, MIT y listener único verificados en ejecución.
- [ ] Presentar comparación y revisar antes de más optimizaciones.

## 06 — Evaluar agrupación de mutaciones

- [ ] Medir y, si compensa, un refreshHard por entrega relevante del observador; no ampliar observación de atributos implícitamente.
- [ ] Conservar añadidos/retirados/reemplazos/anidados, disableMutationObserver y reinit sin duplicación.
- [ ] Conservar cambio solo con compatibilidad y mejora; si no, documentar descarte con evidencia.

**Verificar:** regresiones del motor, contratos, benchmark DOM y npm test/build si cambia producción. **Depende:** checkpoint B y perfiles de 03. **Archivos:** parche AOS, tests/aos-engine.mjs, tests/aos-browser.cjs, docs/aos-evaluation.md; lockfile/build mecánicos. **Tamaño:** M.

## 07 — Evaluar coste por pasada de scroll

- [ ] Probar lectura única del scroll y menor trabajo/cierres donde lo justifique el perfil; mantener estados/comparaciones/throttle.
- [ ] Evaluar compatibilidad antigua realmente incluida, conservando política WordPress y disable por dispositivo; no reemplazar UA por ancho de viewport.
- [ ] Informar CPU/tamaño por variante; conservar solo mejoras fuera del ruido, sin corregir silenciosamente eventos por id.

**Verificar:** regresiones, contratos de opciones/eventos, benchmark por cantidad de nodos/reposo; npm test/build cuando cambie producción. **Depende:** 06. **Archivos:** parche AOS, tests/aos-engine.mjs, tests/aos-browser.cjs, docs/aos-evaluation.md; lockfile/build mecánicos. **Tamaño:** M; commits separados para cambios independientes.

### Checkpoint C — JavaScript medido

- [ ] Sin regresiones de API/eventos/umbrales ni coste creciente por refrescos; resultados CPU normal/×4 e init separados.
- [ ] Revisar conservación/descarte de experimentos antes del CSS.

## 08 — Evaluar CSS compacto

- [ ] Compactar duración/retraso en SCSS fuente consumido por frontend/editor; conservar fases, rangos, especificidad, global/local, ausencia/cero y aislamiento padre/hijo.
- [ ] Mantener catálogo/curvas/Scale/Curtain/distancias y motor externo; sin atributos nuevos ni requisito de attr() tipado; preview sin motor de scroll.
- [ ] Contrastar estilos/fotogramas y coste raw/gzip/init/HTML/editor; conservar original si cambia resultado o no compensa.

**Verificar:** ampliar contratos CSS del runner; npm test, build y benchmark; preview real en 11 antes de declarar aceptación final. **Depende:** checkpoint C. **Archivos:** parche AOS, src/init.js, src/editor.scss, tests/aos-browser.cjs, docs/aos-evaluation.md; lockfile/build mecánicos. **Tamaño:** M.

## 09 — Corregir caché y comprobar carga

- [ ] La URL de aos.js cambia al modificar solo el motor y permanece estable al reconstruir idéntico contenido.
- [ ] Comprobar sin entradas, texto solamente, plantillas/herencia, Lenis off/on/animate, lazyloadAssets, filtros y AOS externo.
- [ ] Mantener orden/chunks/defer, CSS inicial y liberación del contenido; no añadir precargas ni fusionar archivos sin evidencia.

**Verificar:** php -l en PHP modificado; nuevo wp --path=RUTA_DESECHABLE --user=1 eval-file tests/aos-assets.php por escenarios/procesos separados; npm run test:browser y waterfall. **Depende:** 08. **Archivos:** animations-for-blocks.php, tests/aos-assets.php, tests/fixture.php, tests/browser.cjs, docs/aos-evaluation.md; build si cambia fuente. **Tamaño:** M.

### Checkpoint D — CSS y recursos

- [ ] CSS computado/fotogramas equivalentes; motor externo, caché y carga comprobados en WordPress desechable.
- [ ] Revisar ahorro total y regresiones superiores al 10%; compatibilidad antes de ahorro de bytes.

## 10 — Concluir alternativas modernas

- [ ] Decisión adoptar/descartar/posponer para IO, Scroll/View Timelines, WAAPI, RAF/throttle, arranque, propiedades y compatibilidad antigua, con fuentes/perfiles.
- [ ] Si hace falta prototipo, variante temporal aislada y mismo arnés; no añadir segundo motor de producción para completar el estudio.
- [ ] Explicar soporte/semántica y distinguir conclusiones documentales de experimentales; cambios observables se presentan aparte.

**Verificar:** trazas/contratos/benchmark de prototipos ejecutados y cobertura de todas las oportunidades de la spec. **Depende:** checkpoint D. **Archivos:** docs/aos-evaluation.md, runner/fixture si falta una medición. **Tamaño:** S–M; sin diff de producción por omisión.

## 11 — Aceptación integrada

- [ ] Contratos en Chromium y navegadores disponibles; WordPress 6.6/PHP 8.1 y versión reciente, GenerateBlocks compatible y versiones reales registradas.
- [ ] Gutenberg: preview/controles/guardar/reabrir, datos antiguos/nuevos, Default/Inherit/secuencias/texto, sin bloques inválidos; frontend desktop/móvil, reducido/sin JS/fallo/lentitud y AOS externo.
- [ ] PHP/CLI/browser solo en desechables, limpieza/restauración; cada caso no ejecutado pendiente, sin afirmar cobertura completa.

**Verificar:** comandos de spec/plan con rutas y resultados reales; contratos --browser firefox y --browser webkit si disponibles; Safari real aparte; revisar capturas/fotogramas. **Depende:** 10 y cambios aceptados de 05–09. **Archivos:** docs/aos-evaluation.md, tests/browser.cjs, tests/aos-browser.cjs si quedan huecos; no introducir lógica nueva de producción en aceptación. **Tamaño:** M.

### Checkpoint E — Compatibilidad demostrada

- [ ] Pruebas ejecutables correctas, evidencia visual revisada y límites identificados.
- [ ] Revisar recomendación antes de preparar entrega.

## 12 — Informe y distribución

- [ ] Tabla antes/después por dimensión/caso, muestras enlazadas, decisiones y metas alcanzadas/no alcanzadas, con ruido/límites.
- [ ] MIT/revisión, mantenimiento del parche, comandos/reversión; instalación congelada, build generado y diff final revisado.
- [ ] Cumplir spec/Definition of Done; recomendar qué integrar, sin merge/publicación/despliegue.

**Verificar:** instalación congelada, npm test, npm run build, php -l pertinente, git diff --check y segunda compilación sin diferencias inesperadas; revisión completa. **Depende:** checkpoint E. **Archivos:** docs/aos-evaluation.md, docs/upstream.md, docs/testing.md, docs/development.md si cambia mantenimiento; build generado. **Tamaño:** M.

### Checkpoint final — Entrega para revisión

- [ ] Commits por incremento; parche/lock/fuentes/build coherentes e informe/resultados disponibles.
- [ ] Trabajo ajeno y páginas originales conservados; recomendación lista para revisión humana.
