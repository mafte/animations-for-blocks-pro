# Evaluación de viabilidad de AOSIO

Fecha de revisión: 2026-10-19. Estado: bloqueada antes de integrar al plugin.
Rama: `codex/aosio-evaluation`.

## Resultado de T1

- AOSIO `jaredchesebro/aosio`, rama `main`, HEAD `40ed891c66107656a586e35b900cd2b23ff11598`; último commit fechado 2026-03-06, merge de `develop` (`Merge pull request #5 from jaredchesebro/develop`). SHA leído mediante `git ls-remote` y confirmado en el clon temporal.
- El árbol del repositorio no contiene `LICENSE`, `COPYING` ni `NOTICE`; README, CUSTOMIZATION y manifiesto tampoco indican una licencia. El manifiesto declara versión `1.0.0`, autor DuBose Web y `"private": true`. Este último campo impide tratarlo como paquete npm publicado; no otorga permiso para redistribuir código.
- La compilación es técnicamente viable desde una copia temporal fijada al SHA: `npm ci --ignore-scripts` instaló el lockfile y `npm run build` generó `dist/aosio.js` y `dist/aosio.esm.js`. La instalación informó 25 avisos de auditoría en herramientas declaradas como `devDependencies` (7 moderados, 18 altos). No se integró ese árbol de herramientas al plugin ni se caracterizó cada aviso.
- La distribución de AOSIO no se incorporó al plugin porque su permiso de uso/modificación/redistribución no está documentado. La prueba funcional dentro del plugin y el benchmark quedan pendientes hasta obtener una licencia o autorización escrita del titular que cubra la distribución prevista. No inferir licencia MIT por su ascendencia AOS.

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

Los comandos se ejecutaron en el snapshot temporal; no cambiaron `src/` ni `build/` del checkout del plugin. El checkout permanece en `codex/aosio-evaluation`.

## Alcance aún no comprobado

No se integró AOSIO, no se creó el runner A/B y no se afirma compatibilidad con Gutenberg, secuencias, texto, Lenis, movimiento reducido, fallback, contenido legado, CLI, WordPress/PHP mínimos ni navegadores. Tampoco se midió rendimiento. El repositorio upstream compila, pero eso no verifica compatibilidad del plugin.

El siguiente paso depende de que el titular conceda una licencia/autorización que permita incorporar y distribuir el código en este plugin. Con ella se reanuda T2 y la matriz de la especificación. Si no se obtiene, cerrar la evaluación técnica como “no adoptable con las condiciones actuales” y mantener AOS.
