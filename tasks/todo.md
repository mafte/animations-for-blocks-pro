# Tareas: evaluación de AOSIO

Estado: detenido en T1 por licencia no especificada; T2–T8 no iniciadas.
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
- [ ] Fixture toma catálogo/variantes/curvas/anclajes del esquema y añade casos geométricos; ningún catálogo manual duplicado.
- [ ] Modo compatibility captura estilos/transiciones/estados/eventos/geometría y separa latencia; control contra control no produce diferencias espurias.
- [ ] Modo benchmark entrega JSON con metadata, visibilidad final, timeouts/limpieza; smoke del control con 20/100/500 elementos.

**Verification:** Comandos futuros del plan con ambos paths al control; comprobar unidades y casos conocidos de tiempo/desplazamiento; `npm test` conserva resultados iniciales. Runner todavía no existe al escribir este plan.
**Dependencies:** T1.
**Files likely touched:** `tests/aos-engine.cjs`, `tests/aos-engine.html`, `docs/aosio-evaluation.md`.
**Estimated scope:** Medium, 3 archivos.

## Checkpoint A: Viabilidad
- [x] SHA fijado y build upstream técnicamente viable en copia temporal.
- [x] Licencia ausente; bloqueo de redistribución documentado. Se deriva a T9 sin correr T2–T8 ni integrar el fork.
- [x] Línea base AOS reproducible y fallos/avisos registrados. Ningún código de producto modificado.

## T3: Ejecutar una entrada candidata
**Descripción:** Integrar el motor JS fijado en la carga actual. Puede conservarse temporalmente CSS original para aislar API; no representa compatibilidad completa.

**Acceptance criteria:**
- [ ] Dependencia exacta reproducible sin CDN; scripts de instalación revisados, fuente del fork sin cambios.
- [ ] Una entrada funciona con bootstrap/handles/filtros y `window.AOS` actuales, sin motores duplicados.
- [ ] Snapshot candidato y configuración CSS identificados; separación de recursos frontend/editor comprobada.

**Verification:** Instalación según T1, `npm test`, `npm run build`, runner para entrada simple y recursos reales en navegador.
**Dependencies:** Checkpoint A.
**Files likely touched:** `package.json`, `pnpm-lock.yaml`, `webpack.config.js`, `src/init.js`; `build/` generado.
**Estimated scope:** Medium, 4 archivos fuente/config; revisión de generados por lotes <=5.

## T4: Conservar estilos y previsualización
**Descripción:** Evaluar CSS de AOSIO en frontend y Gutenberg; adaptar lo mínimo para conservar el contrato visual.

**Acceptance criteria:**
- [ ] Familias/variantes, Scale/Curtain, curva propia y distancias responsive conservan inicio/transición/final en frontend.
- [ ] Preview manual/automático conserva duración/retraso/curvas mediante clases/atributos sin ejecutar motor de scroll en canvas.
- [ ] CSS original que siga siendo necesario y adaptaciones se identifican y contabilizan; interfaz/HTML guardado conservados.

**Verification:** `npm test`, `npm run build`, runner compatibility y Gutenberg real con estilos computados/fotogramas; extremos válidos de tiempos, escritorio y móvil.
**Dependencies:** T3.
**Files likely touched:** `src/editor.scss`, `src/style-compat.scss`, `src/aos-custom.scss`, `src/AnimatedBlockListBlock.tsx` solo si hace falta, `tests/aos-engine.cjs`; `build/` regenerado.
**Estimated scope:** Medium, hasta 5 fuentes; dividir correcciones que requieran más consumidores.

## Checkpoint B: Integración mínima
- [ ] Build/tests sin nuevas regresiones; frontend y preview funcionan con CSS/adaptaciones identificados.
- [ ] Revisar resultados con el usuario antes de decidir adopción; ampliar alcance requiere decisión explícita.

## T5: Contrastar scroll y API
**Descripción:** Contrastar geometría, eventos/opciones y cambios dinámicos, documentando divergencias del fork.

**Acceptance criteria:**
- [ ] Nueve anclajes/offset, once/mirror, scroll bidireccional, inicio intermedio, elementos altos/resize/layout cumplen <=5 px o quedan como fallos reproducibles.
- [ ] init/refresh/refreshHard, eventos estándar/por id, anchor externo y configuración pública conservan conducta observable.
- [ ] Inserción/eliminación y refresh repetidos no acumulan recursos ni ciclos de mutaciones; registrar cambios necesarios y coste de mantenerlos.

**Verification:** Runner compatibility con errores/timeouts, estados/eventos y reposo; `npm test`/build si cambia fuente. Capturar diferencia del fork original antes de adaptar; rediseño del motor fuera de alcance.
**Dependencies:** Checkpoint B.
**Files likely touched:** `tests/aos-engine.cjs`, `tests/aos-engine.html`, `src/init.js` si se necesita adaptación, `docs/aosio-evaluation.md`.
**Estimated scope:** Medium, hasta 4 archivos.

## T6: Conservar visibilidad y carga
**Descripción:** Verificar protecciones del plugin, carga condicionada y Lenis.

**Acceptance criteria:**
- [ ] Contenido/controles visibles con reduced motion, JS apagado, recurso bloqueado, excepción de init e IntersectionObserver ausente; detectar fallos silenciosos.
- [ ] Lazy loading/filtros/handles y motor externo en window.AOS conservan contrato sin doble inicialización.
- [ ] Lenis off/on/animate carga según contrato y no pierde entradas con scroll suave; restaurar ajustes de las fixtures.

**Verification:** `node tests/init.mjs`, `npm test`, navegador real para fallos y carga, red/DOM/estado final; build/PHP lint si se modifica producción. Separar fallos preexistentes del candidato.
**Dependencies:** T5.
**Files likely touched:** `tests/init.mjs`, `tests/browser.cjs`, `tests/aos-engine.cjs`, `src/init.js`, `animations-for-blocks.php` solo si se demuestra necesario.
**Estimated scope:** Medium, hasta 5 fuentes; bundles regenerados cuando corresponda.

## Checkpoint C: Motor
- [ ] Matriz scroll/API/visibilidad con evidencia y comparación con fallos previos.
- [ ] Regresión de acceso al contenido o adaptación extensa impide recomendar sustitución directa.
- [ ] Tests/build correctos o fallo concreto registrado para recomendación negativa.

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
- [ ] 20/100/500 elementos: calentamiento y >=5 medidas por motor/escenario alternadas; configuración/contenido/hashes registrados.
- [ ] Inicio, scripting/layout, tareas largas, p95/frames largos, tamaño bytes/gzip y reposo con medianas/dispersión y datos brutos; cero inferencias sobre batería.
- [ ] Aislamiento contrastado en WP y Lenis aparte; mejora >=20% y regresiones >10% valoradas contra variación, incluidos resultados negativos/inconclusos.

**Verification:** Runner benchmark y trazas con parámetros registrados; validar unidades/estadísticas; repetir solo corridas inválidas justificadas. Métricas no comparables quedan pendientes; correcciones posteriores invalidan medidas afectadas.
**Dependencies:** T7.
**Files likely touched:** `tests/aos-engine.cjs`, `docs/aosio-evaluation.md`; JSON/trazas privados con reproducción documentada.
**Estimated scope:** Small, hasta 2 archivos de entrega.

## Checkpoint D: Evidencia
- [ ] Nueve grupos de compatibilidad de la spec con pasa/falla/pendiente y evidencia.
- [ ] A/B con variación y entorno conocidos; no ocultar corridas desfavorables.
- [ ] Pendientes/fallos impiden afirmar compatibilidad completa.

## T9: Entregar recomendación
**Descripción:** Consolidar resultados y distribución revisable; comprobar retorno al control sin tocar trabajo previo.

**Acceptance criteria:**
- [x] Informe con SHA/licencia, comandos reales, línea base y bloqueo preciso; matriz, adaptaciones y métricas se declaran pendientes por la licencia.
- [x] No se creó build candidato del plugin; se conservó AOS en el checkout y se verificó su build en snapshot independiente.
- [x] T1 y ruta de bloqueo reflejan el trabajo ejecutado; tareas T2–T8 no iniciadas. No hubo publicación/merge ni cambios en instalaciones existentes.

**Verification:** Revisar diff/Definition of Done; artefactos corresponden a última corrida válida. Repetir checks solo por cambios posteriores; instalar desde lock y volver al control en copias distintas. Revisión humana de resultados antes de adoptar.
**Dependencies:** Checkpoint D; se completa en la ruta de bloqueo de T1 sin afirmar compatibilidad ni mejora de rendimiento.
**Files likely touched:** `docs/aosio-evaluation.md`, `docs/testing.md`, `tasks/todo.md`; revisión final de generados por grupos <=5, sin edición manual.
**Estimated scope:** Medium, 3 archivos de documentación/estado más revisión de distribución.

## Checkpoint final
- [x] Bloqueo legal/técnico documentado con evidencia; compatibilidad y rendimiento explícitamente pendientes.
- [x] Recomendación actual: no adoptar ni distribuir sin permiso del titular; mantener AOS mientras se resuelve.
- [x] Rama local lista para revisar; sin publicación ni merge.
