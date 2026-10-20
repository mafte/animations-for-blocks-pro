# Evaluación de viabilidad de AOSIO

Fecha de revisión: 2026-10-19. Estado: evaluación privada en curso; sin autorización para publicar o redistribuir.
Rama: `codex/aosio-evaluation`.

## Resultado de T1

- AOSIO `jaredchesebro/aosio`, rama `main`, HEAD `40ed891c66107656a586e35b900cd2b23ff11598`; último commit fechado 2026-03-06, merge de `develop` (`Merge pull request #5 from jaredchesebro/develop`). SHA leído mediante `git ls-remote` y confirmado en el clon temporal.
- El árbol del repositorio no contiene `LICENSE`, `COPYING` ni `NOTICE`; README, CUSTOMIZATION y manifiesto tampoco indican una licencia. El manifiesto declara versión `1.0.0`, autor DuBose Web y `"private": true`. Este último campo impide tratarlo como paquete npm publicado; no otorga permiso para redistribuir código.
- La compilación es técnicamente viable desde una copia temporal fijada al SHA: `npm ci --ignore-scripts` instaló el lockfile y `npm run build` generó `dist/aosio.js` y `dist/aosio.esm.js`. La instalación informó 25 avisos de auditoría en herramientas declaradas como `devDependencies` (7 moderados, 18 altos). No se integró ese árbol de herramientas al plugin ni se caracterizó cada aviso.
- En T1 se detuvo la incorporación porque no constaban permisos de uso/modificación/redistribución; el usuario después autorizó una evaluación privada del ZIP en esta rama. No inferir licencia MIT por su ascendencia AOS.
- El usuario proporcionó `/Users/manuabi/Downloads/aosio-main.zip` y autorizó usarlo para esta evaluación local en la rama. SHA-256 del ZIP: `69663987e5dec69902011b6ecdda3be8663feb602889f7b3214e6f1575f9bf7d`. La fuente coincide con el commit fijado. La autorización permite continuar la prueba privada; no aclara publicación o redistribución.

## Línea base AOS actual

Copia de control en `/private/tmp/anfb-aosio-evaluation/control/`, extraída del commit base `b59ecb3867c7d1f7bd398bc3d41cfefc52e27a42`. Entorno: Node `v24.21.0`, pnpm `10.24.0`, PHP `8.4.6`, dependencias del proyecto ya instaladas.

- `npm test`: pasa; 4 suites, 42 pruebas, además de runtime y arranque.
- `npm run build`: pasa. Se mantiene el aviso previo de Browserslist/caniuse-lite (datos con 18 meses).
- `php -l animations-for-blocks.php`: sin errores de sintaxis.
- Hashes SHA-256 de los artefactos de control:

| Archivo | SHA-256 |
| --- | --- |
| `build/aos.js` | `a01930ac9da8878b270fd60dd466f376bc5d7b3a10d11765e682310dd48f0639` |
| `build/aos.css` | `53d3a1c5d6ecd68da49ad62a1143382717210194b13d6cfefa67ce87b58f7bd3` |
| `build/init.js` | `6f39a3882ec54ec0357ee565f016a661590e657cedc839d27d51a4941ae51858` |
| `build/index.js` | `20b75b70d2a727dff34a292657f13f81d0eb9d1c32189099eb850a1fbb156e5e` |
| `build/editor.js` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `build/lenis.js` | `f0d3dc541a4644a152f9c44e5c88f6bc65b4289a8978e5ce52841693b4d00b7e` |
| `build/text.js` | `d9cd9e908a884ad353d7ee569f7cbf38e6bb0b2fb8de3e05c2f845b0c6d27e3b` |
| `build/index.asset.php` | `ba47509df32fe7ab5512c6904fe12c6d4a3c32d912901a2926f569293a454425` |
| `build/aos.asset.php` | `f7f29a4d026baef64620fbeeb86e7c8ca7aa7276075c4bdf67e3ef772789e9ea` |

Los comandos de línea base se ejecutaron en el snapshot temporal. La prueba de humo se ejecutó en Chromium `154.0.8037.98`, con AOS control, AOSIO upstream y los bundles reales del plugin. Cada motor animó todos los elementos y emitió entradas en los casos de 20, 100 y 500, con visibilidad final correcta. Los tiempos brutos fixture-a-init fueron control 33/35/40 ms, AOSIO upstream 40/35/39 ms y plugin con AOSIO 32/31/37 ms. No son mediciones comparativas de rendimiento: no aíslan inicialización, incluyen la fixture y tienen una sola corrida. JSON: `/private/tmp/anfb-aosio-evaluation/results/smoke.json`.

El código del plugin incorpora ahora una copia privada de `src/js/` y `src/sass/` del ZIP bajo `vendor/aosio/`; ver [procedencia](../vendor/aosio/PROVENANCE.md). La entrada usa el motor y el CSS de AOSIO; AOS antiguo se retiró de `package.json`/lockfile. Si falta IntersectionObserver, la entrada revela el contenido.

`node tests/aos-css.cjs` valida en Chromium 154 las 37 variantes del esquema, estados iniciales/finales de preview, las 21 curvas, duración/retraso y distancias desktop/móvil. Los overrides conservan Scale/Curtain, curvas y preview Gutenberg; los hallazgos de especificidad están reflejados en `src/aos-custom.scss` y `src/style-compat.scss`.

`tests/aos-engine.cjs` valida carga de bundles, clases, eventos, visibilidad y nodos dinámicos para 20/100/500. El ZIP no observa un elemento agregado por `refreshHard()` si no cambia la altura de ventana; `vendor/aosio/src/js/aosio-core.js` contiene un parche de una línea. AOS y el plugin animan y emiten evento para el nodo dinámico; el ZIP original lo deja oculto en los tres tamaños.

`tests/aos-anchors.cjs` contrasta las nueve posiciones con viewport de 600 px, elemento de 100 px y offset 20. El AOS de control dispara dentro de 4–12 px del punto esperado; el ZIP y el plugin presentan: `top-bottom` +100 px, `center-bottom` +100/102, `bottom-bottom` 0/+2, `top-center` +62/+60, `center-center` sin disparo, `bottom-center` −40, `top-top` +60/+62, `center-top` sin disparo y `bottom-top` −40. Es una sola geometría; la diferencia excede el ruido base en seis puntos y los dos disparos ausentes son fallos claros.

`tests/aos-api.cjs` muestra que ambas combinaciones con `once=true` coinciden; `once=false, mirror=false` diverge porque el fork no quita la clase al salir hacia arriba; con `mirror=true`, ambos quitan la clase, pero el control actual emite `aos:in:probe` al salir y AOSIO emite `aos:out:probe`. Scroll/API restante, WordPress/Gutenberg real, fallos de carga, texto/secuencias/Lenis y benchmark formal siguen pendientes.

`node tests/aos-fallback.cjs` también pasa en Chromium 154 para movimiento reducido, JavaScript apagado y `IntersectionObserver` ausente: el bloque termina visible. El caso de recurso bloqueado/excepción, carga condicionada y WordPress/Gutenberg real no se pudo validar en una instalación porque `ANFB_TEST_SITE` no está habilitado.

## Alcance aún no comprobado

No se afirma compatibilidad completa con Gutenberg, secuencias, texto, Lenis, movimiento reducido, fallos de carga, contenido legado, CLI, WordPress/PHP mínimos ni navegadores. Tampoco se ha medido rendimiento formal. La prueba de humo verifica únicamente inicialización, clases/eventos y visibilidad en Chromium.

La evaluación técnica continúa por autorización del usuario para esta rama privada. Antes de publicar, fusionar o redistribuir el plugin con AOSIO, debe aclararse que el titular concede los derechos necesarios; hasta entonces mantener el cambio en esta rama local.
