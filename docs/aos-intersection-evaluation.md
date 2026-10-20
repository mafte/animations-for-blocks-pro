# Evaluación previa: IntersectionObserver para AOS

Fecha: 2026-10-20. Estado: evaluación integrada en la rama `codex/aos-intersection-observer`; la geometría y el fallback pasan en Chromium, pero el coste total medido no justifica adoptar IO. La rama es experimental y no se recomienda como reemplazo del motor optimizado.

## Control y entorno

- Control independiente: `git archive` del commit `04b8e2a6e11eb377561170b626d2ad08dd7eb503`, extraído en `/private/tmp/anfb-io-control.q539AQ/project`. Conserva los bundles compilados de ese commit. Los hashes de control y workspace coinciden:
  - `build/aos.js`: `42f1bd2aaa0f52868098de1a4e1f5517eab5a6ec46a391ee830063d41bbb1204`
  - `build/init.js`: `4e0c53757f9530bb24e70966a497fe3ce8eee4fd24194577017b9d4d1ae1d174`
  - `build/aos.css`: `53d3a1c5d6ecd68da49ad62a1143382717210194b13d6cfefa67ce87b58f7bd3`
- AOS `3.0.0-beta.6`; Node `v24.21.0`, pnpm `10.24.0`, Playwright `1.52.0`. Ejecución real: Google Chrome `154.0.8037.98` en Chromium headless.
- `pnpm install --frozen-lockfile` no pudo descargar paquetes por `ENOTFOUND registry.npmjs.org`. Por eso el control es una extracción limpia del commit, con hashes de bundles verificados, pero no una reinstalación limpia de dependencias. El runner utilizó Playwright ya instalado en el workspace.
- Firefox Developer `158.0b5` y Safari `18.4` están instalados. Playwright no pudo iniciar Firefox del sistema porque su protocolo de automatización requiere el build de Firefox preparado por Playwright; este equipo no tiene ese build descargado. No se ejecutó WebKit/Safari.
- El plugin declara WordPress mínimo `6.6` y `Tested up to: 7.1`. No se ejecutaron pruebas WordPress: las tareas 01/02 son solo browser fixture.

## Navegadores objetivo

El corte solicitado de aproximadamente tres años se representa con las versiones estables de finales de 2023. Son versiones mínimas de producto para la matriz planificada, no versiones ejecutadas en este entorno. IntersectionObserver tiene disponibilidad amplia desde antes de ese corte; no se planea usar `trackVisibility` ni `scrollMargin`.

| Navegador | Mínimo representativo | Fecha estable | Fuente oficial | Ejecución disponible |
|---|---:|---|---|---|
| Chrome | 119 | 7 nov 2023 | [calendario de Chrome](https://developer.chrome.com/blog/faster-chrome-releases-round2?hl=en) | Chrome 154, sí |
| Firefox | 119 | 24 oct 2023 | [notas de Firefox 119](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/119) | Firefox Dev 158 instalado; no compatible con Playwright local |
| Safari | 17.1 | 25 oct 2023 | [notas de Safari 17.1](https://developer.apple.com/documentation/safari-release-notes/safari-17_1-release-notes) | Safari 18.4 instalado; no ejecutado |
| Edge | 119 | 16 nov 2023 | [archivo estable de Edge](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-relnote-archive-stable-channel) | No ejecutado por separado |

## Contrato geométrico observado

La referencia es el AOS optimizado del commit base. Sus reglas observadas son:

- Entrada: `T + a·h − b·H + Oin`, donde `T` es el offset superior sin transforms, `h` el `offsetHeight`, `H` la altura del viewport y `a`/`b` valen `0`, `0.5` o `1` según los nueve placements.
- Salida de `mirror`: `T + h − Oout`. Si `once` y `mirror` son ambos verdaderos, prevalece `once` y no se oculta.
- Placement explícito sin offset en el elemento usa `Oin = 0`; la salida aún puede usar el offset global. El runner conserva esa diferencia.
- Los límites enteros/fractionales se comprobaron debajo, en y encima del umbral alcanzable. Chromium aplicó los umbrales `.5` al primer `scrollY` entero que los supera.

El contrato automatizado pasó contra el control independiente y el build del workspace: 29 configuraciones geométricas, con 99 muestras de scroll en el prototipo. Incluyen los nueve placements, placement global, offsets locales `0`, `17` y `-13`, ancla externa, `mirror`, prioridad de `once`, carga restaurada, alturas cero/ocultas/superiores al viewport, viewport de 667/800/900 px, transform del target y ancestro con clipping, horizontal fuera del viewport, `sticky`, `fixed`, y scroll dentro de un contenedor. El scroll anidado no activa AOS, igual que el control. También se conservan los chequeos existentes de API, eventos, clases, refresh, mutaciones, opciones y motor externo. Una mutación deliberada de `+1 px` al umbral teórico hizo fallar el oráculo en `scrollY=1000` (AOS real: activo; expectativa mutada: inactivo).

Resultados completos de Playwright: `/private/tmp/anfb-io-results/task01/contract-chromium.json`.

## Estrategia prototipada

Durante task02 se usó una fixture experimental (`tests/fixtures/aos-intersection-prototype.js`), retirada después de integrar el motor para evitar mantener una implementación duplicada. Creaba marcadores absolutos invisibles de 1 px en las coordenadas de entrada y salida calculadas por el contrato y compartía un `IntersectionObserver` con margen superior amplio y borde inferior en la línea de scroll. El prototipo agrupaba registros notificados y no añadía un listener de scroll.

Este diseño separa la geometría de AOS del rectángulo visible del bloque. La fixture comprobó saltos grandes, ida y vuelta, scroll restaurado, transformaciones, clipping, horizontal fuera de pantalla, posiciones sticky/fixed, altura cero/grande, ancla externa, mirror/once y scroll anidado. Los marcadores se quitaron al limpiar el observador; el documento mantuvo el mismo ancho y alto y las capturas antes/después fueron idénticas. No hubo callbacks luego de desconectar y limpiar.

Dos comparaciones muestran por qué observar directamente el bloque no conserva el contrato:

- Transformado: al `scrollY=800`, el target ya intersectaba el viewport, pero AOS y el marcador no lo animaron hasta `scrollY=1000`.
- Fuera del viewport horizontal: el target no intersectaba horizontalmente cuando AOS y el marcador lo activaron al llegar al umbral vertical.

## Coste inicial del prototipo

Una pasada en Chrome 154, headless, con offsets heterogéneos; son conteos y tiempos exploratorios, no un benchmark comparativo ni una medición de dispositivos móviles. Los tiempos varían entre ejecuciones.

| Elementos | Observables IO | Observadores | Entregas iniciales | Registros actualizados | Tiempo hasta notificación inicial |
|---:|---:|---:|---:|---:|---:|
| 30 | 60 | 1 | 1 callback / 60 entries | 30 | 27.6 ms |
| 500 | 1.000 | 1 | 1 callback / 1.000 entries | 500 | 26.0 ms |
| 1.000 | 2.000 | 1 | 1 callback / 2.000 entries | 1.000 | 17.5 ms |

No cambió `scrollWidth` ni `scrollHeight`; la limpieza quitó los marcadores. El coste claro es dos nodos DOM observados por elemento aunque `mirror` esté desactivado. Antes de integrar conviene reducir a un marcador por elemento normal y crear el marcador de salida solo para `mirror`; medir de nuevo esa variante. El margen superior se calcula con el tamaño de documento al inicializar: refresh tras contenido que aumente significativamente la página debe reconstruir el observador para cubrir el nuevo rango.

## Estado de checkpoint A

La geometría probada justifica continuar con un prototipo integrado, sujeto a revisión del coste y del ciclo de vida. Todavía no demuestra ventaja de rendimiento frente al AOS optimizado, no cubre la matriz de Firefox/Safari ni prueba imágenes o contenido dinámico que amplíen el documento. No integrar mientras no se revise si se acepta el modelo de marcadores y su coste, y si el siguiente incremento incluye la optimización de un solo marcador cuando `mirror` es falso.

Runner del prototipo y escala: `/private/tmp/anfb-io-results/task02/prototype-chromium.json`. Capturas: `/private/tmp/anfb-io-results/task02/geometry-before.png` y `/private/tmp/anfb-io-results/task02/geometry-after.png`.

## Integración y perfil de scroll — checkpoint D

La rama integra un observador compartido, un marcador de entrada por elemento (uno adicional cuando `mirror` exige salida), limpieza en `refresh`/`refreshHard`/disable y fallback de scroll cuando IO falta o su constructor falla. Si una entrega asíncrona del callback lanza, se desconectan los observadores y se quitan los atributos AOS para revelar el contenido. El callback agrupa sus registros antes de aplicar clases para no reentrar al motor por cada target. El contrato de nueve placements pasa en Chrome 154.0.8037.98; `npm test` y `npm run build` pasan.

`tests/aos-browser.cjs --mode profile` ejecutó 600 corridas: 0/30/100/500/1000 targets, configuración homogénea/heterogénea, escritorio 1280×800/móvil 390×844, CPU ×1/×4, cinco muestras alternadas y un control-control por muestra, más warmup por variante. Cada corrida midió 30 pasos de scroll. CDP entrega tiempo de scripting, tarea total, layout, recalculo de estilo y pintura; la tarea total incluye el trabajo nativo de IO, pero CDP no permite aislar su porción. PerformanceObserver midió long tasks; el runner registró p95 de intervalos entre frames, eventos y activación, transferencia, refresh, heap/nodos disponibles, objetivos DOM y bytes raw/gzip. Una prueba con 100 ms de trabajo JS artificial produjo 90 ms de `ScriptDuration` y 95 ms de tarea total.

Mediana de diferencias entre ocho configuraciones por cantidad, calculadas como mediana candidato menos mediana control:

| Targets | Scripting | Tarea total | Layout | p95 de frames | Refresh |
|---:|---:|---:|---:|---:|---:|
| 30 | −0.25 ms (−19%) | +2.23 ms (+17%) | +0.22 ms | 0 ms | +0.5 ms |
| 100 | −0.63 ms (−24%) | +5.66 ms (+21%) | +3.95 ms | 0 ms | +1.1 ms |
| 500 | −1.67 ms (−31%) | +42.56 ms (+55%) | +21.77 ms | 0 ms | +5.4 ms |
| 1000 | −1.70 ms (−32%) | +105.22 ms (+65%) | +53.95 ms | 0 ms | +9.0 ms |

En 500 targets, la mediana absoluta de ruido control-control fue 5.2% para scripting, 5.7% para tarea total y 4% para layout; en 1000 fue 5.8%, 2.7% y 6.6%. La reducción de scripting a 500 supera el ruido, pero el coste agregado de tarea/layout y refresh también supera el ruido por mucho. Sin batching, el candidato llegó a p95 50 ms en 500/CPU×4 y 200 ms en 1000/CPU×4; el batching eliminó esa regresión de p95, aunque no el exceso de layout/tarea. El candidato mantiene p95 cercano a 16.7 ms en las muestras de la segunda matriz.

`aos.js` crece de 10,257 a 11,418 bytes raw y de 3,775 a 4,231 bytes gzip (+1,161/+456). `init.js` y `aos.css` no cambian. El perfil no cumple el criterio de coste total: **no recomiendo adoptar esta variante IO**. La rama queda como evaluación, no como mejora de rendimiento aprobada.

Evidencia completa: `/private/tmp/anfb-io-profile-full/profile-chromium.json` (sin batching) y `/private/tmp/anfb-io-profile-batch-full/profile-chromium.json` (variante final). El runner verifica también que `ScriptDuration` incluya 90 ms de una carga artificial de 100 ms. Smoke del perfil: `/private/tmp/anfb-io-profile-ready-smoke/profile-chromium.json`.

## Cobertura de navegadores

El contrato completo pasó en Chrome 154.0.8037.98. Firefox Developer Edition instalado cerró inmediatamente al recibir el protocolo de Playwright (`-juggler-pipe`), y Playwright WebKit no está instalado en la caché local (`webkit-2158/pw_run.sh` ausente). Safari 18.4 existe en el sistema, pero no se ejecutó una matriz real de Safari; Chrome no se presenta como sustituto. Compatibilidad de Firefox, WebKit, Safari y mínimos de 2023 queda pendiente.

## Reproducción y reversión

La validación geométrica y de ciclo de vida se reproduce con `node tests/aos-browser.cjs --mode contract --control "$ANFB_IO_CONTROL" --candidate "$PWD" --output "$ANFB_IO_RESULTS/contracts"`. El perfil sintético se reproduce con `node tests/aos-browser.cjs --mode profile --control "$ANFB_IO_CONTROL" --candidate "$PWD" --output "$ANFB_IO_RESULTS/profile"`; el perfil requiere Chromium/CDP. Los detalles de opciones y muestras se conservan en `tests/aos-browser.cjs` y las salidas completas se guardan en el directorio temporal privado citado arriba.

El cambio no altera contenido ni exige migración. Para volver al control, usar el commit base `04b8e2a6e11eb377561170b626d2ad08dd7eb503` (motor AOS optimizado sin IO), o retirar el parche `aos@3.0.0-beta.6` y regenerar lockfile/build desde ese estado. No se preparó un ZIP de esta rama: los perfiles no recomiendan adoptarla. La reinstalación congelada limpia tampoco se verificó por indisponibilidad de `registry.npmjs.org`; los builds y contratos se ejecutaron con las dependencias ya instaladas.

El detector ya integrado se puede inspeccionar y comparar en esta rama, pero no está validado para una entrega de producción: faltan la matriz Firefox/WebKit/Safari, las pruebas WordPress/Gutenberg en sitio desechable y la comparación Akumbele. La integración de secuencias de texto también permanece pendiente.
