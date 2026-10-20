# Evaluación de AOS original

Fecha de ejecución: 2026-10-20. Rama: `codex/aos-optimization`. Base: `master` en `b59ecb3867c7d1f7bd398bc3d41cfefc52e27a42`. Motor fijado por lockfile: `aos@3.0.0-beta.6`.

## Control independiente

Se extrajo el commit base en `/private/tmp/anfb-aos-control-s6iiso7q`, fuera del checkout del candidato. Se instalaron dependencias con `corepack pnpm install --frozen-lockfile`; resolución: 1553 paquetes, 1551 reutilizados, 0 descargados. No hay enlace a los `node_modules` del candidato. Entorno: Node v24.21.0, pnpm 10.24.0, Chrome 154.0.8037.98 y PHP 8.1.29.

`npm run build` terminó correctamente dos veces en esa misma ruta y generó los mismos hashes en ambas ejecuciones. `npm test` terminó correctamente: 42 pruebas unitarias en 4 suites, además de las comprobaciones de runtime e inicialización del propio script. El único aviso del build es que la base local de Browserslist/caniuse-lite tiene 18 meses; no se actualizó durante la medición.

| Artefacto | bytes | SHA-256 de `master` | SHA-256 del build de control |
| --- | ---: | --- | --- |
| `build/aos.js` | 13686 | `d1f7f3bd5b89d0df705d7dfa5c712a1703d02618a62d2504d675c40e29148706` | `1a8cf74230058984921c25054d5d18946cd654745a704007e8356ae1598b2cf5` |
| `build/init.js` | 2512 | `2594507db10b377685b969d07ab740e1b5776c971b0cda18b94df8a265be0eef` | `ec82741ba131b5daef750d876a1ab2bd4380498a822676a2cc09fc5b35103ed5` |
| `build/aos.css` | 31380 | `53d3a1c5d6ecd68da49ad62a1143382717210194b13d6cfefa67ce87b58f7bd3` | igual |
| `build/editor.css` | 46072 | `8dcfba482ee9549e83013c754b2c9b123e6642e794b4aec95173e3462d0afefc` | igual |

La diferencia en JS es el identificador numérico interno que webpack deriva de la ruta de compilación; la repetición en la misma ruta fue idéntica. Los CSS sí son byte a byte idénticos. Tamaños gzip reproducibles del `master` con `gzip -9`: AOS JS 4827, init JS 1257, AOS CSS 2868 y editor CSS 3794 bytes.

## Disponibilidad de integración

No se encontró una instalación WordPress local con `ANFB_TEST_SITE` definido en su `wp-config.php` efectivo; no se ejecutó ni modificó ningún sitio. PHP 8.1 está disponible. Chrome está disponible; no se encontraron ejecutables locales de Firefox ni Safari en las rutas de aplicación estándar. La validación siguiente usa una página sintética en localhost con los bundles reales, no sustituye la aceptación en WordPress.

## Observación inicial de AOS

Una comprobación aislada de `AOS.refresh()`/`refreshHard()` sobre el bundle original detectó acumulación lineal de listeners de scroll: 1 tras init, 21 tras 20 `refresh()` y 41 tras otros 20 `refreshHard()`. La reproducción en navegador se registró abajo: 2 al terminar la carga y 22 tras 20 `refreshHard()`. La tarea 05 corrigió la acumulación y su medición final aparece más abajo.

## Resultados de compatibilidad y rendimiento

### Compatibilidad de bundles

Comando ejecutado desde la raíz:

```sh
node tests/aos-browser.cjs --mode contract --control /private/tmp/anfb-aos-control-s6iiso7q --candidate "$PWD" --output /private/tmp/anfb-aos-results
```

Resultado: ambos pasan (`/private/tmp/anfb-aos-results/contract-chromium.json`, SHA-256 `a8b6e938f0208c2fc52af37f8eab1687049d578ebb3c0cacf920daba8201eac6`).

Chrome pasó para el control y para el candidato compilado. La página sintética carga `aos.js`, `init.js` y `aos.css` por HTTP local. Se comprobaron los métodos públicos `init`/`refresh`/`refreshHard`, el estado CSS inicial y final, `aos:in`/`aos:out`/`aos:in:<id>` (incluyendo `event.detail`), los nueve `data-aos-anchor-placement`, `once`, `mirror`, `refreshHard` con nodo insertado y el override `window.AOS` externo. Una copia temporal con `aos.css` vacío hizo fallar la aserción CSS, confirmando que el runner detecta esa regresión. No se impone aquí un umbral geométrico por anclaje: cada valor se inicia desde scroll cero y se comprueba que permanece oculto hasta el scroll y luego se activa.

En el baseline, AOS dejó 2 listeners de scroll al terminar la carga y 22 tras 20 llamadas a `refreshHard()` en los bundles idénticos de control/candidato. Esta medición real complementa la reproducción en VM (1 → 21 → 41); la diferencia inicial se explica porque el navegador también ejecuta el refresco del evento `load`. Es un defecto del control que quedó corregido en la tarea 05; las cifras del candidato actual están en esa sección.

### Benchmark sintético

Se usó Chrome 154.0.8037.98, fixture servido en `127.0.0.1`, 0/30/100/500/1000 elementos animables, viewport 1280×800 y 390×844, throttling CDP ×1/×4, un calentamiento y cinco muestras por celda/variante. Se alternó el orden control/candidato. Se repitió la misma matriz apuntando ambas etiquetas al mismo control: 200 muestras también. Los JSON completos están en `/private/tmp/anfb-aos-results/` y `/private/tmp/anfb-aos-noise/`; no se guardan las trazas dentro del plugin.

Comandos:

```sh
node tests/aos-browser.cjs --mode benchmark --control /private/tmp/anfb-aos-control-s6iiso7q --candidate "$PWD" --output /private/tmp/anfb-aos-results
node tests/aos-browser.cjs --mode benchmark --control /private/tmp/anfb-aos-control-s6iiso7q --candidate /private/tmp/anfb-aos-control-s6iiso7q --output /private/tmp/anfb-aos-noise
```

Hashes SHA-256: comparación control/candidato `e8982db596ed0439800d6edecb120fbff217728b47d645aec921bccb37c1f303`; ruido control/control `bc3f53b3d79a56f2d8a671e43ba23673cbb0e47887eabdd23a02403cc61b7c97`.

Definiciones: `aosReadyMs` es `performance.now()` al asignarse `window.AOS` tras `init`; `assetTransferMs` suma duración de recurso de `aos.js` y `init.js`; `refreshMs` mide la llamada sincrónica a `AOS.refreshHard()`; `scrollResponseMs` cubre scroll + evento y una espera de 130 ms para dejar correr el throttle de AOS (es latencia de respuesta, no CPU puro ni medición de FPS). Cada grupo de conteo contiene 20 muestras por variante, agregando viewport y throttling. Medianas observadas:

| Elementos | AOS listo ms control/candidato | Transferencia JS ms control/candidato | `refreshHard` ms control/candidato | Respuesta scroll ms control/candidato |
| ---: | ---: | ---: | ---: | ---: |
| 0 | 13.6 / 15.1 | 8.3 / 8.7 | 0.1 / 0.1 | 131.5 / 131.7 |
| 30 | 22.4 / 19.2 | 9.1 / 8.7 | 0.3 / 0.3 | 133.0 / 133.0 |
| 100 | 22.5 / 23.0 | 8.7 / 9.1 | 0.7 / 0.6 | 135.2 / 135.3 |
| 500 | 28.6 / 31.4 | 8.7 / 9.0 | 2.5 / 2.6 | 160.4 / 160.1 |
| 1000 | 34.7 / 34.4 | 8.4 / 8.8 | 4.4 / 4.4 | 220.6 / 220.0 |

Para 500 nodos, los p95 control/candidato fueron: listo 68.0/69.2 ms, transferencia 12.5/14.4 ms, refresh 9.0/9.2 ms y respuesta al scroll 249.5/249.3 ms. Control contra control tuvo diferencia mediana absoluta emparejada de 1.68% para ready, 11.22% para transferencia, 4.55% para refresh y 0.63% para scroll. En candidato/control las diferencias fueron 4.73%, 8.05%, 9.09% y 0.32%, respectivamente; la dispersión de refresh y transferencia impide atribuir pequeñas variaciones a código. Control y candidato contienen el mismo runtime (solo cambia un ID interno de webpack), así que no hay mejora esperada en esta etapa.

El CSS AOS pesa 31380 bytes (2868 gzip); el JS AOS pesa 13686 (4827 gzip). El init pesa 2512 (1257 gzip). El runner local registra duración de transferencia de JS, pero no captura waterfalls WordPress ni bytes transferidos por HTTP; esos quedan para la prueba de carga integrada en una instalación desechable.

### Límites del control

- No hay sitio local con `ANFB_TEST_SITE` efectivo; no se hizo integración con WordPress/Gutenberg ni visualización de frontend real.
- Firefox/WebKit/Safari no se validaron. En esta etapa solo está medido Chrome; la disponibilidad de otros binarios se reexaminará para aceptación.
- Los nueve anclajes se ejercitan funcionalmente, pero todavía no se contrastan sus píxeles exactos de umbral. El runner es una fixture sintética y no mide FPS, compositor ni perfiles de CPU detallados.
- `aos.css` comprimido ya representa ~2.8 KB; cualquier compactación debe superar la meta y conservar especificidad/cascada. Los resultados de control-control no muestran una oportunidad de JS por sí solos: los perfiles guiarán el siguiente paso.

## Tarea 04 — Compilar la fuente original

Se creó `patches/aos@3.0.0-beta.6.patch`, que solo retira el import SCSS interno no utilizado (`styles`) de `src/js/aos.js`. `src/init.js` importa directamente ese fuente; el CSS distribuido `aos/dist/aos.css` sigue siendo el que carga el plugin. La licencia MIT original está en `licenses/aos.txt`. La configuración y lockfile fijan el patch por hash, sin cambiar versiones de dependencias.

`CI=true corepack pnpm install --frozen-lockfile --reporter=append-only` pasó con AOS parcheado; todas las 1553 dependencias se reutilizaron del store. Build completado dos veces con hashes idénticos. `npm test`: 42/42 pruebas y las comprobaciones runtime/init pasaron. La prueba Playwright de contratos fuente/control pasó en Chrome; ambos conservan la API, CSS, eventos, nueve placements, `once`/`mirror`, refresh dinámico y override. CSS AOS mantiene SHA-256 `53d3a1c5d6ecd68da49ad62a1143382717210194b13d6cfefa67ce87b58f7bd3`, sin duplicado.

La fuente movió peso entre chunks: control `aos.js` 13686 B / 4827 gzip y `init.js` 2512 B / 1257 gzip; fuente `aos.js` 9361 B / 3499 gzip e `init.js` 5969 B / 2321 gzip. Total frontend: 16198 → 15330 B raw (-5.4%) y 6084 → 5820 gzip (-4.3%). `build/index.js` cambia solo 2 bytes raw/34 gzip tras reasignación de IDs de módulos al rebuild; no se cambia código de editor. El motor sigue cargándose como chunk dependiente antes de init y no se introduce otra solicitud.

Comparación de fuente contra dist original en las mismas 200 muestras, Chrome y la misma matriz: para 500 elementos, mediana/p95 (control → fuente) fue listo 26.4/66.0 → 27.2/74.1 ms; transferencia JS 8.8/11.9 → 8.6/14.1 ms; `refreshHard` 2.7/8.8 → 2.2/8.9 ms; respuesta a scroll 160.0/246.2 → 160.8/246.1 ms. Esas variaciones no muestran una mejora estable frente al ruido registrado. La compilación de fuente se acepta como preparación para editar y probar correcciones localizadas, no como optimización de rendimiento por sí misma. JSON: `/private/tmp/anfb-aos-source-results/benchmark-chromium.json`, SHA-256 `692fa98dc654d529fd1063d8e12b01b3d517b4f8afbd7600254340dd746a4097`.

## Tarea 05 — Un solo ciclo de listeners

La prueba de regresión con el dist original falla: 2 listeners de scroll al cargar, 102 tras 100 `refresh()`, 202 tras 100 `refreshHard()` y 225 después de 20 reinit. El bundle candidato mantiene 1 en todos esos puntos. La corrección reutiliza el throttle de scroll; si cambia `throttleDelay`, cancela el callback pendiente y reemplaza ese handler. Resize/orientación, observer y startEvent también se conservan únicos, o se desconectan cuando `disableMutationObserver` pasa a true. Reinit actualiza duración/easing, y el test de startEvent confirma que el evento viejo deja de activar AOS.

El contrato pasa en Chrome para los dos bundles; en el control las aserciones específicas de idempotencia permanecen como defectos caracterizados y el candidato cumple una instancia de cada listener/observer AOS. Se verifica inserción automática por MutationObserver, API/eventos, anchors, `once`/`mirror`, override externo y opciones. JSON final: `/private/tmp/anfb-aos-listener-fix/contract-chromium.json`, SHA-256 `aba12babe52851c22320f25d391bff6d934e7b953c01e5f203673ec88179a9ef`.

Tras 100 `refresh()` + 100 `refreshHard()` y un evento de scroll, Chrome midió:

| Elementos | Respuesta scroll mediana control/candidato | p95 control/candidato | AOS listeners de scroll control/candidato |
| ---: | ---: | ---: | ---: |
| 500 | 182.0 / 160.6 ms (-11.8%) | 326.9 / 244.6 ms | 203 / 1 |
| 1000 | 259.7 / 218.3 ms (-15.9%) | 724.5 / 489.9 ms | 203 / 1 |

Cada conteo tiene 20 muestras/variante que combinan dos viewports y CPU ×1/×4. El control-control focal desktop/CPU ×1 tuvo ruido p95 emparejado de 0.85% en 500 elementos y 3.56% en 1000; la mejora mediana en esa celda fue 11.0% y 15.8%. Las llamadas a refresh no mejoran de forma relevante por sí solas; el ahorro viene de procesar el scroll una vez en lugar de una vez por listener acumulado. JSON completo: `/private/tmp/anfb-aos-listener-bench/benchmark-chromium.json` (SHA-256 `a9d5f2487178b3d50ee367f81effdb5fb1d4864a7dcbe12b51e5ce935ed76c17`); control-control: `/private/tmp/anfb-aos-listener-noise/benchmark-chromium.json` (SHA-256 `eb0e993e1e87b6deacecc7755c807516d3d0c8e92920435d9a216fff4dcf436b`).

Con la corrección, el total frontend `aos.js` + `init.js` queda en 16194 B raw / 6074 gzip frente al dist inicial de 16198 / 6084; el ahorro neto de bytes es despreciable (4 B raw, 10 gzip). `aos.css` permanece idéntico. Se generaron dos builds con hashes idénticos. `npm test` pasa con 42/42 pruebas; `pnpm install --frozen-lockfile` y Playwright contract pasan. `build/aos.js` SHA-256 `abb1796b654d1766de506bc83701f4b77d05e7bef395bd273548e13f04ffafe0`, `build/init.js` `b3ee71e1857edd4598efb48ef04f6fcb492d01f11c32c6f7398c1b581060de04`.

## Tarea 06 — Agrupar registros de mutación

`observer.check()` del paquete recorría todos los `MutationRecord` de una entrega y llamaba `refreshHard()` desde el callback de `forEach`. La corrección recorre en orden y termina al encontrar el primer registro con un elemento AOS añadido, retirado o anidado; conserva el observador de `childList`/`subtree`, sin empezar a observar atributos. Por ello hay un refresco completo como máximo por entrega relevante, y ninguno por registros irrelevantes.

El contrato Chromium inserta 25 elementos y un wrapper con otro AOS, los retira y reemplaza un nodo estático por uno animable. En el bundle anterior, cada entrega con 26 registros provocó 26 llamadas a `refreshHard`; con la corrección cada entrega provoca una llamada. Las inserciones anidadas y el retiro/reemplazo siguen detectándose. También siguen pasando `disableMutationObserver`, reinit, API/eventos y las pruebas existentes. JSON final: `/private/tmp/anfb-aos-mutation-final/contract-chromium.json` (SHA-256 `4fa43981eeb368e4697c7671dc0d953362e50de10ec9fc62b4bf0421dd3da0a9`).

Medición sintética en Chrome 154, viewport 1280×800, CPU ×1: se insertaron 100 elementos en un turno y se midió hasta el siguiente frame. Cinco muestras por variante y tamaño:

| Elementos existentes | refrescos control/candidato | mediana control/candidato | p95 control/candidato |
| ---: | ---: | ---: | ---: |
| 500 | 100 / 1 | 252.7 / 6.0 ms (-97.6%) | 261.4 / 6.9 ms |
| 1000 | 100 / 1 | 455.6 / 9.8 ms (-97.8%) | 465.3 / 11.3 ms |

Los JSON están en `/private/tmp/anfb-aos-mutation-bench-final/benchmark-chromium.json` (SHA-256 `5164730e7eff0e3f55c012bd1da4d2515802da0ceae2d3f2874c525295c67007`). Es un lote sintético aislado, no una medición de WordPress/Gutenberg ni un perfil de reposo. La corrección acorta una pasada repetida al procesar mutaciones en bloque; no cambia qué atributos se observan ni el momento entre entregas del navegador. El parche completo se aplica con `git apply --check` a los fuentes originales de AOS. La instalación congelada con pnpm 10.24.0 pasó sin descargas.

## Tarea 07 — Una lectura por pasada de scroll

`handleScroll()` leía `window.pageYOffset` por cada elemento. El cambio toma la posición una vez y la pasa a las comparaciones existentes; no altera throttle, umbrales, eventos ni la política de desactivación por dispositivo. El contrato confirma 3 lecturas por pasada con el bundle anterior y una con el nuevo.

En Chrome 154, viewport 1280×800, CPU ×1, se midieron diez muestras por variante en cada tamaño tras 100 `refresh()` y 100 `refreshHard()`:

| Elementos | Mediana/p95 de respuesta a scroll, anterior | Mediana/p95, nueva | Control-control ruido p95 |
| ---: | ---: | ---: | ---: |
| 500 | 158.4 / 159.5 ms | 132.0 / 132.7 ms (-16.7% mediana) | 0.63% |
| 1000 | 216.0 / 217.1 ms | 132.9 / 133.3 ms (-38.5% mediana) | 1.26% |

El tiempo para 100 llamadas a `refresh()` también bajó de 177.9 a 169.4 ms en 500 elementos y de 356.9 a 331.9 ms en 1000, aunque el p95 del caso de 1000 tiene dispersión; la recomendación se basa en la respuesta a scroll, cuyo ruido control-control fue bajo. El JSON de cambio está en `/private/tmp/anfb-aos-scroll-bench-final/benchmark-chromium.json` (SHA-256 `8351f63781b4c690e96141112aed7a9e00a6a0b6ea27a9ea02a2f7febfab7846`); el de ruido, `/private/tmp/anfb-aos-scroll-noise/benchmark-chromium.json` (SHA-256 `827931e5582882dffac0d5b60fb7c09b80734b997bfa8e9956c0993cafed37e4`). Las cifras son de un fixture sintético tras la secuencia de refrescos, no un perfil de una página WordPress real.

## Tarea 08 — CSS de duración y retraso

Probé una hoja temporal que sustituye las 60 reglas de duración y 120 de retraso de AOS por variables CSS. La cascada global/local, el retraso previo y activo, el valor cero y el caso anidado dieron los mismos estilos computados en Chrome. Aun así, en frontend la hoja pasó de 31,380 B / 2,861 B gzip a 27,197 B / 2,890 B gzip; reduce 4,183 B raw pero **aumenta 29 B gzip**, por lo que no se conservó. El experimento agregaba complejidad y variables CSS sin reducir la descarga.

Sí eliminé de `src/style-compat.scss` las 60 declaraciones locales de duración del editor: son duplicadas de AOS CSS, que el editor ya carga. El resultado conserva los valores computados para duración local, global, anidada y cero; también conserva el retraso de preview con `data-anfb-animate`. Una comparación Chromium del CSS actual y el temporal dio idénticos resultados (`0.25s` local, `0.1s` de retraso activo, `0s` antes, `0.4s` hijo sin opción y `0.75s` para duración cero con valor global). La salida compilada coincide byte a byte con el experimento.

El editor baja de 46,072 B / 3,784 B gzip a 41,767 B / 3,650 B gzip: **4,305 B raw y 134 B gzip menos**. Sumando ambos CSS servidos por separado, el ahorro es 4,305 B raw y 134 B gzip; es una reducción pequeña en transferencia, no un objetivo del 25%. No cambié CSS frontend, previsualización, HTML ni atributos.

## Tarea 09 — Versiones y rutas de carga

El handle `animate-on-scroll` ya versiona `build/aos.js` con `build/aos.asset.php`; `init.js` depende de ese handle salvo que el filtro `anfb_aos_handle` lo reemplace. El estilo usa hash de contenido del CSS. El hash de versión de AOS pasó de `70d7aeea742dd7a6fd3d` en el build base a `9ce382b80c2f024555a5` con la fuente actual y dos builds repetidos produjeron hashes idénticos. Se preservan `defer`, dependencias, filtros `anfb_load_scripts/styles`, carga diferida, Lenis y CSS de liberación.

La inspección de código confirma que con `lazyloadAssets` activo AOS se encola al renderizar el primer bloque animado; si no hay entradas, no se solicita AOS. Las animaciones de texto usan su propio recurso, y las secuencias/herencia pasan por el mismo renderizador de bloques. Lenis mantiene sus rutas `on` y `animate`; los filtros y el handle AOS externo siguen aplicando. No se modificó PHP ni se añadieron precargas.

**Pendiente de ejecución:** no existe un sitio desechable con `ANFB_TEST_SITE`, así que no se midieron requests/waterfall ni se ejecutaron los casos con WordPress, Gutenberg y GenerateBlocks. Esto también deja pendientes las pruebas de navegación real de la aceptación integrada; las conclusiones de carga anteriores son una revisión de código más el hash del asset compilado, no una prueba HTTP de WordPress.

## Tarea 10 — Alternativas modernas

| API | Evaluación para este plugin | Decisión |
| --- | --- | --- |
| `IntersectionObserver` | MDN la marca ampliamente disponible. Puede avisar al cruzar límites sin inspeccionar todos los elementos en cada scroll, pero AOS además expone nueve anclajes, offsets, `once`/`mirror` y eventos. Un reemplazo necesita agrupar opciones y demostrar igualdad de umbrales. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver) | No reemplazar ahora; posible prototipo separado si el perfil de una página WordPress lo justifica. |
| CSS scroll/view timelines | Expresan progreso continuo del scroll o visibilidad. La función `scroll()` aún figura como de disponibilidad limitada en MDN; sus timelines tampoco equivalen directamente a activar una transición de entrada y luego emitir los eventos actuales. [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-timeline/scroll) | No usarlas como motor requerido ni como degradación de AOS. |
| Web Animations API | `Element.animate()` está ampliamente disponible. Es una interfaz para crear animaciones, no un disparador de visibilidad; adoptarla no elimina por sí sola los cálculos y contratos de scroll. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate) | Mantener CSS transitions y AOS; no añadir una segunda ruta de animación. |
| RAF / throttle / propiedades | AOS ya limita el handler con throttle. No se perfiló una página WP que demuestre que cambiarlo por RAF mejore su carga; conservaría además el ritmo observable de eventos. El cambio medido reduce listeners acumulados y lecturas por pasada sin alterar el throttle. | Conservar el throttle y el conjunto de propiedades; no cambiar temporalmente ni adoptar compositor por suposición. |

Las conclusiones de disponibilidad provienen de la documentación de MDN consultada el 2026-10-20. La ventaja potencial de IntersectionObserver en coste por scroll es una inferencia que requiere una comparación real; no se presenta como mejora medida. No se hicieron prototipos de un segundo motor porque el requisito de igualdad para anclajes, secuencias, eventos y compatibilidad no compensa esa complejidad con la evidencia disponible.
