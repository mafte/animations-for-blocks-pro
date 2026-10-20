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
- [x] Medir coste de lotes de mutaciones; reposo y waterfall HTTP WordPress siguen pendientes de las tareas enfocadas (06/09) porque no hay sitio desechable disponible.
- [x] Medir control contra control y ruido; priorizar CPU/CSS/arranque/compatibilidad antigua según trazas y bundle real.

**Verificar:** comando --mode benchmark; revisar muestras, repetibilidad, trazas y hashes. **Depende:** 02. **Archivos:** ambos archivos del runner y docs/aos-evaluation.md. **Tamaño:** M.

### Checkpoint A — Antes de modificar el motor

- [x] Contratos/mediciones de baseline documentados; el arnés detecta diferencias y el ruido control/control está medido.
- [x] El usuario aprobó continuar con la evaluación y los cambios priorizados en el plan.

## 04 — Compilar fuentes originales reproducibles

- [x] Parche pnpm exacto que retire solo import SCSS interno; importar fuente desde src/init.js manteniendo CSS dist actual.
- [x] Conservar MIT/procedencia y aplicar parche con instalación congelada limpia, sin ignorar fallos.
- [x] Misma caracterización funcional, chunks esperados y ausencia de CSS duplicado/recursos faltantes.

**Verificar:** patch/patch-commit e instalación limpia del plan, npm test, npm run build, contratos y análisis de chunks/tamaños. **Depende:** checkpoint A. **Archivos:** patches/aos@3.0.0-beta.6.patch, pnpm-workspace.yaml, pnpm-lock.yaml, src/init.js, licenses/aos.txt; build generado. Si pnpm exige más configuración, separar esa preparación. **Tamaño:** M.

## 05 — Corregir acumulación de listeners

- [x] Un listener AOS de scroll tras 100 refresh y 100 refreshHard, incluidos resize/orientación/load tardío.
- [x] Reinit mantiene eventos/observador únicos, ajustes actualizados y cancelación de trabajo pendiente, conservando throttle/startEvent y listeners ajenos.
- [x] Regresión falla en original y pasa en candidato; mismas clases/eventos/geometría.

**Verificar:** tests/aos-browser.cjs --mode contract contra control y candidato; la regresión falla en el original. npm test, build y benchmark tras 100 refresh/refreshHard. El contrato de navegador es un runner separado de npm test porque necesita Chrome y HTTP local. **Depende:** 04. **Archivos:** parche AOS, tests/aos-browser.cjs, docs/aos-evaluation.md; lockfile/build mecánicos. **Tamaño:** M.

### Checkpoint B — Primera corrección

- [x] Pruebas/build/contratos correctos; fuente reproducible, MIT y listener único verificados en ejecución.
- [x] Presentar comparación y revisar; el usuario autorizó continuar con las mejoras del plan.

## 06 — Evaluar agrupación de mutaciones

- [x] Medir y aplicar un refreshHard por entrega relevante del observador; no ampliar observación de atributos.
- [x] Conservar añadidos/retirados/anidados, disableMutationObserver y reinit sin duplicación.
- [x] Conservar el cambio: contrato compatible y mejora repetible en lotes de inserciones.

**Verificar:** regresiones del motor, contratos, benchmark DOM y npm test/build si cambia producción. **Depende:** checkpoint B y perfiles de 03. **Archivos:** parche AOS, tests/aos-engine.mjs, tests/aos-browser.cjs, docs/aos-evaluation.md; lockfile/build mecánicos. **Tamaño:** M.

## 07 — Evaluar coste por pasada de scroll

- [x] Probar lectura única del scroll, mantener estados/comparaciones/throttle y medir mejora fuera del ruido.
- [x] Confirmar que la rama no cambia el detector ni la política de desactivación por dispositivo ya usada por el plugin.
- [x] Informar tiempos y ruido; conservar el cambio respaldado por la mejora medida.

**Verificar:** regresiones, contratos de opciones/eventos, benchmark por cantidad de nodos/reposo; npm test/build cuando cambie producción. **Depende:** 06. **Archivos:** parche AOS, tests/aos-engine.mjs, tests/aos-browser.cjs, docs/aos-evaluation.md; lockfile/build mecánicos. **Tamaño:** M; commits separados para cambios independientes.

### Checkpoint C — JavaScript medido

- [x] Sin regresiones de API/eventos/umbrales ni coste creciente por refrescos; comparar CPU/scroll e init de forma separada.
- [x] Revisar los cambios medidos antes del CSS; se conservan los cambios 06 y 07.

## 08 — Evaluar CSS compacto

- [x] Evaluar variables CSS tipadas como compactación; se descarta porque el frontend aumenta 29 B gzip. Se eliminan solo 60 reglas de duración duplicadas del editor.
- [x] Se mantienen fases, rangos, especificidad y cascada global/local/anidada/cero; sin atributos, catálogo, curvas, Scale, Curtain, distancias ni motor externo nuevos.
- [x] Comparar CSS computado y tamaños raw/gzip de frontend/editor; la eliminación conserva los valores y reduce 134 B gzip del editor.

**Verificar:** ampliar contratos CSS del runner; npm test, build y benchmark; preview real en 11 antes de declarar aceptación final. **Depende:** checkpoint C. **Archivos:** parche AOS, src/init.js, src/editor.scss, tests/aos-browser.cjs, docs/aos-evaluation.md; lockfile/build mecánicos. **Tamaño:** M.

## 09 — Corregir caché y comprobar carga

- [x] `build/aos.asset.php` cambió su hash de versión al cambiar el motor y el build repetido conservó hashes idénticos.
- [x] WordPress/Akumbele: carga diferida sin animación, primer bloque animado, modo eager, filtros y Lenis pasan en procesos WP-CLI separados; Gutenberg/frontend obtuvo un único HTTP 200 para AOS JS, init y CSS. El handle AOS ahora toma su versión de `aos.asset.php` (la prueba encontró que usaba `index.asset.php`).
- [x] Se mantienen handles, dependencias, chunks, `defer`, CSS inicial y liberación del contenido; no se añaden solicitudes.

**Verificar:** php -l en PHP modificado; nuevo wp --path=RUTA_DESECHABLE --user=1 eval-file tests/aos-assets.php por escenarios/procesos separados; npm run test:browser y waterfall. **Depende:** 08. **Archivos:** animations-for-blocks.php, tests/aos-assets.php, tests/fixture.php, tests/browser.cjs, docs/aos-evaluation.md; build si cambia fuente. **Tamaño:** M.

### Checkpoint D — CSS y recursos

- [x] CSS computado/fotogramas equivalentes en Chromium; cache-busting y carga comprobados en Akumbele. El filtro de carga se probó en PHP; navegador de host externo no añadido.
- [x] Revisados ahorro total y regresiones: sin regresión de contrato; pruebas locales y waterfall HTTP integrados correctos.

## 10 — Concluir alternativas modernas

- [x] Decisión documentada para IO, Scroll/View Timelines, WAAPI, RAF/throttle y propiedades con documentación actual y perfiles locales.
- [x] No se requiere prototipo: las alternativas no preservan por sí solas los contratos AOS y no se añadió un segundo motor.
- [x] Soporte documental y mediciones experimentales quedan distinguidos en el informe.

**Verificar:** trazas/contratos/benchmark de prototipos ejecutados y cobertura de todas las oportunidades de la spec. **Depende:** checkpoint D. **Archivos:** docs/aos-evaluation.md, runner/fixture si falta una medición. **Tamaño:** S–M; sin diff de producción por omisión.

## 11 — Aceptación integrada

- [x] Contratos en Chromium y sintaxis PHP; integración real en Akumbele, WordPress 7.1.3, PHP 8.4.4 y GenerateBlocks 2.5.0.
- [x] Gutenberg/frontend: preview, guardar/reabrir, contenido heredado, móvil, movimiento reducido, sin JS, fallo de init y captura de waterfall HTTP.
- [x] Las fixtures se ejecutaron con autorización explícita en Akumbele; el guard `ANFB_TEST_SITE` se cargó solo en procesos WP-CLI, sin cambiar `wp-config.php`.

**Verificar:** comandos de spec/plan con rutas y resultados reales; contratos --browser firefox y --browser webkit si disponibles; Safari real aparte; revisar capturas/fotogramas. **Depende:** 10 y cambios aceptados de 05–09. **Archivos:** docs/aos-evaluation.md, tests/browser.cjs, tests/aos-browser.cjs si quedan huecos; no introducir lógica nueva de producción en aceptación. **Tamaño:** M.

### Checkpoint E — Compatibilidad demostrada

- [x] Pruebas locales ejecutables correctas; límites de navegador y de integración señalados.
- [x] Revisar capturas de Gutenberg/frontend en Chrome; la fixture se eliminó tras la verificación.

## 12 — Informe y distribución

- [x] Tabla antes/después, muestras privadas enlazadas, decisiones/metas, ruido y límites documentados.
- [x] MIT conservada, parche reproducible, instalación congelada, build generado y diff revisado.
- [x] Recomendación y evidencia integrada preparadas; sin merge/publicación/despliegue.

**Verificar:** instalación congelada, npm test, npm run build, php -l pertinente, git diff --check y segunda compilación sin diferencias inesperadas; revisión completa. **Depende:** checkpoint E. **Archivos:** docs/aos-evaluation.md, docs/upstream.md, docs/testing.md, docs/development.md si cambia mantenimiento; build generado. **Tamaño:** M.

### Checkpoint final — Entrega para revisión

- [x] Commits creados; parche/lock/fuentes/build coherentes e informe/resultados disponibles.
- [x] Trabajo ajeno y páginas originales conservados; copia temporal retirada y estado original del plugin restaurado.
