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

Una comprobación aislada de `AOS.refresh()`/`refreshHard()` sobre el bundle original detectó acumulación lineal de listeners de scroll: 1 tras init, 21 tras 20 `refresh()` y 41 tras otros 20 `refreshHard()`. Es una reproducción en VM de Node y queda pendiente cubrirla en navegador dentro de las tareas posteriores; aún no se ha cambiado el motor.

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
