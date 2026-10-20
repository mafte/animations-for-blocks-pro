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

Una comprobación aislada de `AOS.refresh()`/`refreshHard()` sobre el bundle original detectó acumulación lineal de listeners de scroll: 1 tras init, 21 tras 20 `refresh()` y 41 tras otros 20 `refreshHard()`. La reproducción en navegador se registró abajo: 2 al terminar la carga y 22 tras 20 `refreshHard()`. Aún no se ha cambiado el motor.

## Resultados de compatibilidad y rendimiento

### Compatibilidad de bundles

Comando ejecutado desde la raíz:

```sh
node tests/aos-browser.cjs --mode contract --control /private/tmp/anfb-aos-control-s6iiso7q --candidate "$PWD" --output /private/tmp/anfb-aos-results
```

Resultado: ambos pasan (`/private/tmp/anfb-aos-results/contract-chromium.json`, SHA-256 `a8b6e938f0208c2fc52af37f8eab1687049d578ebb3c0cacf920daba8201eac6`).

Chrome pasó para el control y para el candidato compilado. La página sintética carga `aos.js`, `init.js` y `aos.css` por HTTP local. Se comprobaron los métodos públicos `init`/`refresh`/`refreshHard`, el estado CSS inicial y final, `aos:in`/`aos:out`/`aos:in:<id>` (incluyendo `event.detail`), los nueve `data-aos-anchor-placement`, `once`, `mirror`, `refreshHard` con nodo insertado y el override `window.AOS` externo. Una copia temporal con `aos.css` vacío hizo fallar la aserción CSS, confirmando que el runner detecta esa regresión. No se impone aquí un umbral geométrico por anclaje: cada valor se inicia desde scroll cero y se comprueba que permanece oculto hasta el scroll y luego se activa.

`AOS` dejó 2 listeners de scroll en la página al terminar la carga y 22 tras 20 llamadas a `refreshHard()`. Las mismas cuentas aparecieron en control/candidato. Esta medición real complementa la reproducción en VM (1 → 21 → 41); la diferencia inicial se explica porque el navegador también ejecuta el refresco del evento `load`. Es un defecto del control que la tarea 05 debe corregir, no un criterio de aceptación del candidato actual.

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
