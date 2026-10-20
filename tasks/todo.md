# Tareas: entradas con IntersectionObserver

[Plan](plan.md), 2026-10-20. Estado: tareas 01/02 completadas; integración top-bottom en progreso; el usuario autorizó continuar con el resto del plan. Rama `codex/aos-intersection-observer`, base optimizada `04b8e2a6e11eb377561170b626d2ad08dd7eb503`. Lista única de tareas y checkpoints; no hay tracker externo. Evidencia: [evaluación de IntersectionObserver](../docs/aos-intersection-evaluation.md).

Cada tarea conserva el contrato del plan. Los archivos indicados son previsiones; si aparecen más de cinco archivos sustantivos o una decisión independiente, dividir antes de implementar. Build generado y hash mecánico de lockfile se entregan con cada cambio de motor y se revisan aparte. No marcar criterios como cumplidos por el solo hecho de escribir una prueba.

## 01 — Precisar el contrato contra AOS optimizado

**Descripción:** Congelar el control independiente y reforzar el runner para que mida los puntos exactos de activación, no solo la eventual aparición de la clase. Registrar versiones objetivo y entornos de prueba disponibles antes de decidir el diseño.

**Criterios de aceptación:**
- [x] Control extraído independientemente del commit base, hashes/versiones registrados; tabla concreta de navegadores actuales y mínimos representativos de finales de 2023 con fuentes oficiales y cobertura pendiente; WordPress mínimo y declarado como probado registrados. La reinstalación congelada de paquetes quedó limitada por DNS de npm.
- [x] Oráculo geométrico independiente del candidato y muestras debajo/en/encima para los nueve placements, offsets y ancla externa; scroll real, altura, fórmula, redondeo y alcance de scroll registrados. Una alteración deliberada de +1 px hace fallar el arnés.
- [x] Retorno de API, opciones globales/locales, prioridad once/mirror, eventos con ID, clases, scroll inicial/inverso/saltos y peculiaridades del control caracterizados sin nuevas correcciones.

**Verificación:** `node tests/aos-browser.cjs --mode contract` con ambas variantes apuntando al control; muestras geométricas y ruido de referencia guardados en temporal privada. Revisar fechas de versiones con fuentes oficiales. No ejecutar fixtures WordPress todavía.

**Dependencias:** Ninguna. **Archivos previstos:** `tests/aos-browser.cjs`, `tests/aos-contract-fixture.cjs` (extraer fixture si conviene), `docs/aos-intersection-evaluation.md` (nuevo). **Alcance:** M, 3 archivos.

## 02 — Demostrar el detector IO en una fixture

**Descripción:** Probar una estrategia de observación que represente los umbrales verticales de AOS antes de modificar el motor distribuido. Resolver el riesgo de transformaciones, recortes y saltos rápidos al principio.

**Criterios de aceptación:**
- [x] Fixture IO compara los nueve placements, entrada/salida de mirror, `once` prioritario, ancla externa, saltos, scroll restaurado, transforms/clipping, alturas grandes/cero/ocultas, nested scroll, posición horizontal, fixed y sticky frente al control con tolerancia de 1 px CSS.
- [x] Referencia de marcadores elegida de forma provisional tras comparar IO directo; coste de observadores/objetivos/DOM documentado para 30/500/1000 elementos heterogéneos. Dimensiones y capturas no cambian; no quedan recursos tras limpieza.
- [x] Estado final y throttling explícito demostrados; el callback actualiza únicamente los registros notificados y no hay listener global de scroll en el prototipo.

**Verificación:** Contratos geométricos del runner en Chromium y otro motor disponible, con prototipo cargado solo por la fixture; screenshots/layout antes y después; contadores de callbacks/objetivos y pruebas de salto. Mantener los bundles de producción intactos.

**Dependencias:** 01. **Archivos previstos:** `tests/fixtures/aos-intersection-prototype.js` (nuevo y temporal), `tests/aos-browser.cjs`, `tests/aos-contract-fixture.cjs`, `docs/aos-intersection-evaluation.md`. **Alcance:** M, 4 archivos.

### Checkpoint A — Viabilidad antes de integración

- [x] Geometría y estado demostrados, enfoque y costes documentados; las limitaciones de instalación limpia y cobertura de navegador quedan explícitas.
- [x] El usuario autorizó continuar con la estrategia documentada y las diferencias de contrato registradas antes de integrar el motor.

## 03 — Activar top-bottom mediante IO

**Descripción:** Incorporar la estrategia demostrada al fuente AOS parcheado para la entrada predeterminada, conservando su recorrido completo de clases, eventos y opciones. Los otros ocho placements siguen funcionando temporalmente con el detector anterior.

**Criterios de aceptación:**
- [x] `top-bottom` usa IO con offset local/global y `data-aos-anchor`, once/mirror/eventos completos y aplicación del estado solo a objetivos afectados; preserva init/refresh, CSS y sus retornos observados.
- [x] Los ocho placements restantes siguen operativos por una ruta temporal delimitada; sin barrido de nodos ya migrados. El controlador limpia recursos básicos, descarta callbacks antiguos y evita recursión por sus propias mutaciones desde este incremento.
- [x] El prototipo validado se incorpora al parche reproducible y se retira su implementación duplicada de pruebas; API pública y número de solicitudes sin ampliaciones.

**Verificación:** Regresión del caso migrado, contratos contra control, `npm test`, `npm run build`; comprobar instalación congelada y chunks/versión de AOS. Revisar observación activa y evento de entrada/salida real.

**Dependencias:** Checkpoint A revisado. **Archivos previstos:** `patches/aos@3.0.0-beta.6.patch`, `tests/aos-browser.cjs`, `tests/aos-contract-fixture.cjs`, retiro de `tests/fixtures/aos-intersection-prototype.js`; lockfile/build mecánicos. **Alcance:** M, 4 archivos sustantivos.

## 04 — Completar los nueve placements

**Descripción:** Aplicar el detector a las ocho combinaciones restantes y retirar el detector temporal por scroll, manteniendo intacta la geometría ya calculada por AOS.

**Criterios de aceptación:**
- [x] Nueve placements y anclas externas/compartidas pasan límites, tamaños/offsets heterogéneos y la prioridad once/mirror; las transformaciones de animación no cambian umbrales ni provocan oscilaciones.
- [x] No queda listener propio de scroll ni recorrido completo de entradas en el camino IO normal; las notificaciones solo actualizan los objetivos afectados. Cargas inicialmente más allá de la salida y saltos en ambos sentidos producen el estado correcto.
- [x] Misma secuencia de clases/eventos observables en los casos estabilizados, con `detail` e IDs; no se inventan transiciones durante saltos ni se corrigen peculiaridades ajenas a la migración.

**Verificación:** Matriz geométrica completa en bundles reales y comparación de eventos; casos con valores explícitos de throttle; `npm test`, `npm run build` y diff de parche/lock/build.

**Dependencias:** 03. **Archivos previstos:** parche AOS, `tests/aos-browser.cjs`, `tests/aos-contract-fixture.cjs`, `docs/aos-intersection-evaluation.md`; lockfile/build mecánicos. **Alcance:** M, 4 archivos.

### Checkpoint B — Detector completo

- [x] Nueve anclajes y comportamientos comparados; sin barrido global por scroll ni ruta temporal restante.
- [x] El usuario autorizó continuar el plan. Resultado del contrato: Chromium conserva geometría y estado; la ruta IO no instala scroll listeners. Coste global y otros motores se miden en tareas posteriores.

## 05 — Estabilizar refresh y mutaciones

**Descripción:** Asegurar que reinit, cambios de contenido y recálculos de geometría mantienen un único conjunto válido de recursos y conservan las mejoras de mutaciones de la rama base.

**Criterios de aceptación:**
- [ ] Cien refresh y cien refreshHard, reinit/opciones/disable/startEvent no acumulan observadores, objetivos, timers ni referencias a nodos retirados; callbacks pendientes de una generación anterior no escriben estado.
- [ ] Inserción, eliminación, reemplazo y nodos anidados conservan un refreshHard por entrega relevante y cero por cambios irrelevantes; mutaciones auxiliares propias no generan bucles ni ocultan cambios reales.
- [ ] Resize/orientación, cambios de altura y carga tardía actualizan los límites mediante el contrato de refresh existente; registros de once/mirror y las opciones `disableMutationObserver`/`debounceDelay` conservan su comportamiento.

**Verificación:** Regresiones de ciclo de vida del runner, conteos de recursos antes/después y snapshots de nodos/referencias cuando sean medibles; contratos, `npm test`, `npm run build`. Separar el coste de refresh de la ruta de scroll.

**Dependencias:** Checkpoint B revisado. **Archivos previstos:** parche AOS, `tests/aos-browser.cjs`, `tests/aos-contract-fixture.cjs`, `docs/aos-intersection-evaluation.md`; lockfile/build mecánicos. **Alcance:** M, 4 archivos.

## 06 — Preservar arranque y salida segura

**Descripción:** Comprobar que la integración del nuevo detector conserva la primera transición, movimiento reducido, motor externo y coordinación del texto con las entradas de bloque.

**Criterios de aceptación:**
- [ ] Primera entrada tiene frames intermedios y contenido visible ante IO ausente, error de constructor/callback y fallo de init; sin JavaScript o con movimiento reducido el contenido permanece accesible y no quedan recursos inútiles.
- [ ] `window.AOS` externo conserva su ruta incluso sin IO del navegador; init tardío/startEvent y opciones/clases personalizadas siguen operativos. Fallo asíncrono del detector libera el contenido, no solo excepciones sincrónicas.
- [ ] Secuencias y `startWithBlock` de texto siguen la activación correcta, sin disparos duplicados; el IO de `src/text.js` mantiene su funcionamiento independiente.

**Verificación:** Ampliar `tests/init.mjs` solo para arranque; casos reales del runner para callbacks, ausencia de API y transición visible. `npm test`, `npm run build`; revisar fotogramas y clases del respaldo.

**Dependencias:** 05. **Archivos previstos:** `src/init.js`, parche AOS, `tests/init.mjs`, `tests/aos-browser.cjs`, `tests/aos-contract-fixture.cjs`; lockfile/build mecánicos. **Alcance:** M, máximo 5 archivos.

### Checkpoint C — Ciclo de vida y contenido accesible

- [ ] Reinit/mutaciones no filtran recursos; arranque/fallback y motor externo verificados en navegador.
- [ ] Revisar con el usuario las evidencias antes de medir la recomendación de adopción.

## 07 — Medir scroll sostenido y costes completos

**Descripción:** Añadir medición específica que separe CPU real, renderizado y latencia, comparando IO con el AOS optimizado sin la espera fija del benchmark anterior.

**Criterios de aceptación:**
- [ ] Modo `profile` reproducible en el runner para 0/30/100/500/1000 elementos, configuraciones homogéneas/heterogéneas, dos viewports y CPU ×1/×4; calentamiento, cinco muestras alternadas y control/control. No usar 100 refresh previos como único escenario principal.
- [ ] Guardar scripting atribuible, scripting/layout/paint total, frames/p95, long tasks, activación/transición, init/refresh, recursos, nodos/memoria disponibles y bytes raw/gzip; demostrar que el coste IO nativo no queda excluido de la comparación.
- [ ] Evaluar la meta propuesta de ≥20% menos scripting con 500 nodos y tendencia en 1000, sin regresiones reproducibles >10% y >1 ms según el plan. Informar ruido, valores absolutos y costes; si no compensa, proponer revisión sin etiquetarlo automáticamente como mejora.

**Verificación:** Ejecutar el nuevo modo profile contra control/candidato y control/control; revisar trazas de navegador, muestras y atribución de costes. Si el arnés no detecta trabajo artificial añadido, corregir su instrumentación antes de aceptar resultados.

**Dependencias:** Checkpoint C revisado. **Archivos previstos:** `tests/aos-browser.cjs`, `tests/aos-performance.cjs` (helper nuevo si el tamaño lo exige), `tests/aos-contract-fixture.cjs`, `docs/aos-intersection-evaluation.md`. **Alcance:** M, máximo 4 archivos.

## 08 — Verificar la matriz de navegadores

**Descripción:** Ejecutar el contrato en distintos motores y contrastar el extremo inferior de la ventana de tres años sin presentar emulación como una versión histórica real.

**Criterios de aceptación:**
- [ ] Chromium, Firefox y WebKit disponibles pasan geometría, salto, eventos y ciclo de vida; Safari real se registra por separado. Probar viewports móviles y documentar cuándo se usa solo emulación de tamaño.
- [ ] Verificar versiones mínimas fijadas en 01 mediante entornos seguros disponibles; registrar versión de navegador/SO y resultados. Si falta un extremo, la cobertura de esa ventana queda pendiente y no se declara completa.
- [ ] Mantener tolerancia y contrato entre motores; errores nativos y edge cases no se ocultan con exclusiones genéricas, esperas arbitrarias o rebaja de aserciones.

**Verificación:** Runner `--mode contract --browser chromium|firefox|webkit` y sesiones identificadas de Safari/históricos; capturas y logs por entorno. No afirmar Safari 2023 por ejecutar WebKit actual.

**Dependencias:** 07. **Archivos previstos:** `tests/aos-browser.cjs`, `tests/aos-contract-fixture.cjs`, `docs/aos-intersection-evaluation.md`. **Alcance:** M, 3 archivos; esfuerzo de entorno registrado aparte.

### Checkpoint D — Rendimiento y soporte

- [ ] Rendimiento, coste total y cobertura contrastados con los criterios; carencias de entorno documentadas, sin aprobación ficticia de compatibilidad completa.
- [ ] Revisar con el usuario la evidencia para continuar a aceptación WordPress o revisar el diseño.

## 09 — Validar WordPress y Gutenberg

**Descripción:** Comprobar el motor integrado en los dos entornos WordPress previstos, conservando carga condicional, contenido guardado y opciones del editor.

**Criterios de aceptación:**
- [ ] Entorno desechable WordPress 6.6/PHP 8.1 con GenerateBlocks compatible y entorno actual pasan contenido/CLI; Gutenberg guarda/reabre bloques actuales/heredados, controles, secuencias y texto sin bloques inválidos.
- [ ] Escenarios lazy-empty/lazy-animated/eager/filtered/Lenis y motor externo conservan dependencias/handles/defer; una sola carga por recurso, hash AOS correcto y ningún paquete o solicitud extra exigidos por IO.
- [ ] Frontend escritorio/móvil, movimiento reducido, JavaScript desactivado y fallo del detector pasan; fixtures solo con `ANFB_TEST_SITE` efectivo, y limpieza/restauración documentadas.

**Verificación:** Comandos de `docs/testing.md`: `tests/content.php`, escenarios separados de `tests/aos-assets.php`, `tests/cli.py`, `tests/fixture.php` y `npm run test:browser`; inspección visual del canvas real de Gutenberg y waterfall. `php -l` si hay PHP afectado.

**Dependencias:** Checkpoint D revisado. **Archivos previstos:** `tests/browser.cjs`, `tests/aos-assets.php`, `tests/fixture.php`, `docs/aos-intersection-evaluation.md`; PHP principal solo ante una corrección de carga demostrada, subdividiendo si supera cinco archivos. **Alcance:** M, 4–5 archivos.

## 10 — Comparar una página real de Akumbele

**Descripción:** Medir el resultado que verá el usuario con una copia local representativa y la misma página/configuración bajo ambos builds, además del estrés sintético.

**Criterios de aceptación:**
- [ ] Seleccionar la página y guardar hashes/configuración/estado antes de alternar variantes en un clon o copias locales; no añadir animaciones artificiales, no enviar formularios y no modificar páginas originales.
- [ ] Capturar carga fría/caliente y scroll sostenido idéntico en escritorio/móvil, calentamiento y cinco muestras alternadas por variante; comparar scripting/layout/paint, frames, latencia y red. Distinguir mejora del motor de mejora perceptible de página.
- [ ] Restaurar plugin/ajustes/activación y limpiar copias temporales; verificar hashes de originales. Concluir adoptar, corregir o descartar con evidencia funcional y de coste total.

**Verificación:** Recorridos de navegador reales y perfiles con los recursos compilados de cada commit; logs/capturas/muestras privadas y revisión visual. Probar cambio de variante y restauración, no limitarse a comprobar que el ZIP existe.

**Dependencias:** 09. **Archivos previstos:** `tests/aos-performance.cjs` si hace falta adaptar el recorrido, `docs/aos-intersection-evaluation.md`; artefactos y copias en temporal privada. **Alcance:** S–M, máximo 2 archivos sustantivos.

### Checkpoint E — Aceptación en el plugin

- [ ] Evidencia sintética, WordPress y página real reunida; restauración local confirmada y discrepancias resueltas o explícitas.
- [ ] Revisar con el usuario la recomendación de adopción y cualquier límite de soporte antes de preparar la entrega final.

## 11 — Documentar el mantenimiento del detector

**Descripción:** Dejar claro qué hace el nuevo detector, dónde se mantiene y cómo se reproduce y se revierte, con los resultados y límites efectivamente comprobados.

**Criterios de aceptación:**
- [ ] Documentar estrategia elegida, geometría/tiempo/opciones y limpieza interna, procedencia MIT y patch exacto; soporte previsto separado de versiones probadas y peculiaridades de AOS conservadas.
- [ ] Informe con tabla control/IO, muestras, ruido y decisión de adopción; actualizar comandos de pruebas y guía de desarrollo solo donde cambie el flujo real.
- [ ] Describir reversión al commit optimizado sin migración de datos y reproducción con instalación congelada; no presentar una evaluación rechazada como mejora integrada.

**Verificación:** Revisión cruzada de documentación con código, comandos existentes y resultados guardados; validar enlaces locales y `git diff --check`. No repetir suites completas por un cambio exclusivo de prosa.

**Dependencias:** Checkpoint E revisado. **Archivos previstos:** `docs/aos-intersection-evaluation.md`, `docs/development.md`, `docs/testing.md`, `docs/upstream.md`. **Alcance:** M, 4 archivos.

## 12 — Entregar el ZIP verificable

**Descripción:** Cerrar la rama con fuentes, parche y build coherentes y producir un ZIP que el usuario pueda instalar para revisar el resultado aprobado.

**Criterios de aceptación:**
- [ ] Instalación congelada limpia y build reproducible; regresiones pertinentes y contratos finales pasan, licencia/build incluidos y diff revisado. Repetir pruebas únicamente tras cambios o preocupaciones pendientes que lo justifiquen.
- [ ] ZIP con raíz `animations-for-blocks`, recursos compilados y PHP necesarios; sin node_modules, backups, credenciales, `.git` o `skills/`. Identificar commit y checksum, sin publicar ni hacer merge automático.
- [ ] Comprobar instalación del ZIP en el entorno desechable y recorrido breve de entrada/scroll; registrar cobertura/limitaciones y dejar commits propios guardados y trabajo ajeno intacto.

**Verificación:** `corepack pnpm install --frozen-lockfile`, `npm test`, `npm run build`, contratos afectados, sintaxis PHP pertinente y `git diff --check`; inspección del ZIP y prueba de instalación desechable. Reutilizar resultados aún válidos de la misma revisión para evitar repetición sin causa.

**Dependencias:** 11. **Archivos previstos:** actualización final de `docs/aos-intersection-evaluation.md` y de esta lista; build/ZIP como artefactos. **Alcance:** S, 1–2 archivos sustantivos.

### Checkpoint final — Entrega para revisión

- [ ] Tareas completadas con evidencia y decisiones humanas registradas; no confundir ausencia de entorno con compatibilidad certificada.
- [ ] ZIP y commit identificados; recomendaciones y límites claros, control optimizado conservado y ningún contenido original alterado.
