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

Pendientes de las tareas 02–03. Se registrarán comandos, muestras, medianas/p95, dispersión control-control, condiciones de CPU/viewport, solicitudes y límites antes de editar el runtime AOS.
