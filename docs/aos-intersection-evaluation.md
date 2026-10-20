# Evaluación previa: IntersectionObserver para AOS

Fecha: 2026-10-20. Estado: tareas 01 y 02 completadas en fixture; checkpoint A pendiente de revisión. Rama `codex/aos-intersection-observer`. Esta evaluación no modifica AOS de producción ni sus bundles.

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

La fixture experimental está en `tests/fixtures/aos-intersection-prototype.js`; no se importa desde `src/`. Crea marcadores absolutos invisibles de 1 px en las coordenadas de entrada y salida calculadas por el contrato y comparte un `IntersectionObserver` con margen superior amplio y borde inferior en la línea de scroll. En el callback actualiza solo los registros notificados; no recorre la lista completa ni añade un listener de scroll. Una ventana de throttling agrupa actualizaciones pendientes y respeta el intervalo explícito en la prueba.

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
