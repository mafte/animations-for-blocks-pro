# Tareas: evaluación de AOSIO

Estado: implementación privada autorizada; T2–T4 en curso.
Contrato: [spec aprobada](../SPEC-aosio-evaluation.md). Decisiones: [plan](plan.md).
Trabajo anterior completo: [archivo preservado](completed/2026-10-19-wordpress-animation-skill-todo.md).

## T1: Confirmar viabilidad
**Descripción:** Fijar origen/licencia/build y entorno; preservar control antes de incorporar el fork.

**Acceptance criteria:**
- [x] SHA, fecha del último commit, ausencia de licencia/atribuciones y mecanismo de instalación/build reproducible documentados; licencia pendiente bloquea integración.
- [x] Control con fuente/lock/bundles/hashes, AOS resuelto 3.0.0-beta.6 y versiones de Node/pnpm/PHP disponibles registrados.
- [x] Build upstream compilado solo en `/private/tmp`; no se incorporó código no licenciado al plugin ni se cambió una instalación existente.

**Verification realizada:** SHA/historial/árbol/licencia comprobados; `npm ci --ignore-scripts && npm run build` en clon upstream temporal; control: `npm test` (42 pruebas), `npm run build`, `php -l animations-for-blocks.php`. Resultados y hashes: `docs/aosio-evaluation.md`.
**Dependencies:** Revisión humana del plan y tareas.
**Files likely touched:** `docs/aosio-evaluation.md`; snapshots privados fuera del repositorio.
**Estimated scope:** Small, 1 archivo de entrega.

## T2: Capturar el control
**Descripción:** Crear un runner/fixture compartidos que contrasten contrato y rendimiento con ambos builds; completar la línea base.

**Acceptance criteria:**
- [ ] Fixture reutilizable toma catálogo/variantes/curvas/anclajes del esquema y añade casos geométricos; ningún catálogo manual duplicado.
- [ ] Modo compatibility captura estilos/transiciones/estados/eventos/geometría y separa latencia; control contra control no produce diferencias espurias.
- [x] Smoke preliminar sirve ambos builds en Chromium, confirma estado visible, clases y eventos para 20/100/500 elementos y registra JSON. No es benchmark comparativo.

**Verification:** Smoke ejecutado con AOS y AOSIO compilados desde sus fuentes; evidencia y límites en `docs/aosio-evaluation.md`. El runner completo de compatibilidad/benchmark sigue pendiente.
**Dependencies:** T1.
**Files likely touched:** `tests/aos-engine.cjs`, `tests/aos-engine.html`, `docs/aosio-evaluation.md`.
**Estimated scope:** Medium, 3 archivos.

## Checkpoint A: Viabilidad
- [x] SHA fijado y build upstream técnicamente viable en copia temporal.
- [x] Licencia ausente; autorización del usuario limitada a evaluación privada en esta rama. No publicar ni redistribuir hasta aclarar derechos.
- [x] Línea base AOS reproducible; smoke preliminar de ambos motores. Falta la matriz completa.

## T3: Ejecutar una entrada candidata
**Descripción:** Integrar el motor JS fijado en la carga actual. Puede conservarse temporalmente CSS original para aislar API; no representa compatibilidad completa.

**Acceptance criteria:**
- [x] Fuente exacta fijada por SHA del ZIP y commit upstream, vendorizada sin cambios; el plugin no descarga en runtime.
- [x] Una entrada con AOSIO funciona en el smoke del bundle del plugin, conserva `window.AOS`, clases/eventos y el orden de chunks; no requiere cambiar handles PHP.
- [x] CSS de AOS original se conserva para aislar API; editor y frontend siguen importando el mismo recurso CSS registrado mientras la comparación visual de T4 está pendiente.

**Verification:** SHA/procedencia en `vendor/aosio/PROVENANCE.md`; `npm test`, `npm run build`, PHP lint y smoke Chromium de control, upstream y bundle del plugin. Compatibilidad del filtro PHP y `window.AOS` externo siguen pendientes.
**Dependencies:** Checkpoint A; uso privado del ZIP autorizado expresamente por el usuario.
**Files likely touched:** `package.json`, `pnpm-lock.yaml`, `webpack.config.js`, `src/init.js`; `build/` generado.
**Estimated scope:** Medium, 4 archivos fuente/config; revisión de generados por lotes <=5.

## T4: Conservar estilos y previsualización
**Descripción:** Evaluar CSS de AOSIO en frontend y Gutenberg; adaptar lo mínimo para conservar el contrato visual.

**Acceptance criteria:**
- [x] CSS de las 37 variantes conserva estados iniciales/finales en el fixture `.editor-styles-wrapper`; Scale, Curtain, 21 curvas, duración/retraso y distancias desktop/móvil verificadas.
- [ ] Gutenberg real confirma preview manual/automático, duración/retraso/curvas y persistencia al guardar/reabrir; el motor no se ejecuta en el canvas.
- [x] CSS AOS antiguo retirado de runtime y editor; adaptaciones necesarias (especificidad de preview, transiciones, curvas, distancias) identificadas en fuente. HTML guardado e interfaz no cambiaron.

**Verification:** `npm test`, build, PHP lint y frozen lockfile pasan; smoke A/B de bundles plugin en Chromium; `node tests/aos-css.cjs` pasa con 37 variantes/21 curvas/escritorio-móvil. WordPress real, extremos 0–3000 ms y reduced motion pendientes.
**Dependencies:** T3.
**Files likely touched:** `src/editor.scss`, `src/style-compat.scss`, `src/aos-custom.scss`, `src/AnimatedBlockListBlock.tsx` solo si hace falta, `tests/aos-engine.cjs`; `build/` regenerado.
**Estimated scope:** Medium, hasta 5 fuentes; dividir correcciones que requieran más consumidores.

## Checkpoint B: Integración mínima
- [ ] Build/tests sin nuevas regresiones; frontend y preview funcionan con CSS/adaptaciones identificados.
- [ ] Revisar resultados con el usuario antes de decidir adopción; ampliar alcance requiere decisión explícita.

## T5: Contrastar scroll y API
**Descripción:** Contrastar geometría, eventos/opciones y cambios dinámicos, documentando divergencias del fork.

**Acceptance criteria:**
- [x] Nueve anclajes muestreados con un elemento de 100 px, viewport 600 px y offset 20. Seis puntos exceden 5 px; dos no se disparan; uno queda dentro de tolerancia. Variantes geométricas/resize pendientes.
- [x] Combinaciones básicas `once`/`mirror` y eventos globales/ID contrastados; AOSIO diverge cuando `once=false, mirror=false` y usa `aos:out:probe` donde el control actual emite `aos:in:probe` al salir. `anchor` externo y resto de API públicos siguen pendientes.
- [x] Inserción dinámica con altura de viewport sin cambios falla en AOSIO upstream y pasa en control/candidato del plugin; adaptación y evidencia están registradas. Eliminación, refresh repetidos y fuga/reposo siguen pendientes.

**Verification:** `tests/aos-engine.cjs`, `tests/aos-anchors.cjs`, `tests/aos-api.cjs` con Chromium 154. Datos privados: `/private/tmp/anfb-aosio-evaluation/results/smoke.json`, `anchors.json` y `api.log`. Anclajes y `once`/`mirror` muestran incompatibilidades; API completa y reposo pendientes.
**Dependencies:** Checkpoint B.
**Files likely touched:** `tests/aos-engine.cjs`, `tests/aos-engine.html`, `src/init.js` si se necesita adaptación, `docs/aosio-evaluation.md`.
**Estimated scope:** Medium, hasta 4 archivos.

## T6: Conservar visibilidad y carga
**Descripción:** Verificar protecciones del plugin, carga condicionada y Lenis.

**Acceptance criteria:**
- [x] Contenido visible en Chromium con reduced motion, JS apagado e IntersectionObserver ausente.
- [ ] Recurso bloqueado y excepción de init comprobados; detectar errores silenciosos.
- [ ] Lazy loading/filtros/handles y motor externo en window.AOS conservan contrato sin doble inicialización.
- [ ] Lenis off/on/animate carga según contrato y no pierde entradas con scroll suave; restaurar ajustes de las fixtures.

**Verification:** `node tests/aos-fallback.cjs` pasa no-js, reduced motion y falta de IntersectionObserver en Chromium 154; `node tests/init.mjs` y `npm test` pasan. Recurso bloqueado, filtro/carga externa/Lenis siguen pendientes.
**Dependencies:** T5.
**Files likely touched:** `tests/init.mjs`, `tests/browser.cjs`, `tests/aos-engine.cjs`, `src/init.js`, `animations-for-blocks.php` solo si se demuestra necesario.
**Estimated scope:** Medium, hasta 5 fuentes; bundles regenerados cuando corresponda.

## Checkpoint C: Motor
- [x] Matriz parcial de scroll/API/visibilidad con evidencia; seis anclajes exceden 5 px, dos no disparan; once/mirror y eventos por ID registrados.
- [x] Regresiones impiden recomendar sustitución directa; corregir los anclajes requiere cambiar la lógica del observador.
- [x] Tests/build pasan; los fallos funcionales son reproducibles. Integración WP real sigue sin verificar.

## T7: Validar WordPress completo
**Descripción:** Ejecutar integración real en sitios desechables: edición/persistencia, secuencias y texto dentro de ancestros animados.

**Acceptance criteria:**
- [ ] WP 6.6/PHP 8.1 y WP reciente con GenerateBlocks compatible: selección/preview/guardar/reabrir sin bloques inválidos; evidencia escritorio/viewport móvil.
- [ ] Default/Inherit, secuencias anidadas/ordenadas, condiciones por página y cuatro efectos de texto conservados; proveedores no se animan como hijos.
- [ ] Contenido actual/legado, metadatos, desactivación/reactivación, clipboard y CLI v1 conservados, contrastando HTML/formatos/estado antes y después.

**Verification:** Comandos de la spec para content/persistence/migration PHP, CLI, fixture y `npm run test:browser`; ampliar únicamente casos ausentes. Capturar versiones/capturas y navegadores pendientes; nunca fixtures sobre cliente.
**Dependencies:** Checkpoint C.
**Files likely touched:** `tests/fixture.php`, `tests/browser.cjs`, `tests/aos-engine.cjs`, `docs/aosio-evaluation.md`.
**Estimated scope:** Medium, hasta 4 archivos; separar ejecución por entorno si supera una sesión enfocada. Correcciones a producción requieren una tarea acotada identificada por el fallo.

## T8: Medir A/B
**Descripción:** Medir control/fork y candidato adaptado si existe, con integración estable y condiciones iguales.

**Acceptance criteria:**
- [ ] Benchmark de runtime 20/100/500: calentamiento y >=5 medidas por motor/escenario alternadas; se detiene tras Checkpoint C. El smoke no cuenta como benchmark.
- [x] Payloads JS/CSS/editor raw y gzip comparados en la misma compilación; tamaños quedan en el informe.
- [ ] Inicio, scripting/layout, tareas largas, p95/frames largos, tamaño bytes/gzip y reposo con medianas/dispersión y datos brutos; cero inferencias sobre batería.
- [ ] Aislamiento contrastado en WP y Lenis aparte; mejora >=20% y regresiones >10% valoradas contra variación, incluidos resultados negativos/inconclusos.

**Verification:** Runner benchmark y trazas con parámetros registrados; validar unidades/estadísticas; repetir solo corridas inválidas justificadas. Métricas no comparables quedan pendientes; correcciones posteriores invalidan medidas afectadas.
**Dependencies:** Checkpoint C; el benchmark de runtime no se ejecutó por incompatibilidades funcionales.
**Files likely touched:** `tests/aos-engine.cjs`, `docs/aosio-evaluation.md`; JSON/trazas privados con reproducción documentada.
**Estimated scope:** Small, hasta 2 archivos de entrega.

## Checkpoint D: Evidencia
- [ ] Nueve grupos de compatibilidad de la spec con pasa/falla/pendiente y evidencia.
- [ ] A/B con variación y entorno conocidos; no ocultar corridas desfavorables.
- [ ] Pendientes/fallos impiden afirmar compatibilidad completa.

## T9: Entregar recomendación
**Descripción:** Consolidar resultados y distribución revisable; comprobar retorno al control sin tocar trabajo previo.

**Acceptance criteria:**
- [x] Informe con SHA/licencia, comandos reales, línea base, matriz parcial, adaptación, payload y pendientes.
- [x] Recomendación negativa de sustitución directa; sin publicación ni cambios en instalaciones existentes.

**Verification:** Revisar diff/Definition of Done; artefactos corresponden a última corrida válida. Repetir checks solo por cambios posteriores; instalar desde lock y volver al control en copias distintas. Revisión humana de resultados antes de adoptar.
**Dependencies:** Checkpoint C permite la recomendación negativa temprana; T7 y benchmark formal T8 quedan pendientes.
**Files likely touched:** `docs/aosio-evaluation.md`, `docs/testing.md`, `tasks/todo.md`; revisión final de generados por grupos <=5, sin edición manual.
**Estimated scope:** Medium, 3 archivos de documentación/estado más revisión de distribución.

## Checkpoint final
- [x] Evidencia parcial de compatibilidad/payload revisada; los pendientes impiden afirmar compatibilidad completa.
- [x] Recomendación negativa y límite de distribución documentados; no se afirma compatibilidad completa.
