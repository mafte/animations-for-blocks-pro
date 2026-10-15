# Desarrollo y comprobaciones

Código fuente recuperado de la revisión documentada en `upstream.md`. PHP mínimo 8.1; WordPress mínimo 6.6. Usar pnpm 10.24.0 (el `packageManager` está fijado):

```sh
corepack pnpm install --frozen-lockfile
npm run build
npm test
php -l animations-for-blocks.php
```

Los archivos `build/` son parte del plugin distribuible. El build conserva AOS y Lenis y añade el módulo `text`. No editar los bundles a mano.

Las pruebas de integración requieren un WordPress desechable, con GenerateBlocks V2 y el plugin activos. No usar sitios de clientes. Definir `ANFB_TEST_SITE` como `true` en el `wp-config.php` de esa instalación. Puede utilizarse SQLite Database Integration para no tocar servidores MySQL existentes.

```sh
wp --path=/sitio/desechable --user=1 eval-file tests/content.php
ANFB_WP_PATH=/sitio/desechable ANFB_WP_CLI=wp python3 tests/cli.py
wp --path=/sitio/desechable --user=1 eval-file tests/fixture.php
ANFB_TEST_URL=http://127.0.0.1:8765 ANFB_TEST_POST=ID_DEVUELTO npm run test:browser
```

La prueba CLI crea y elimina una página y un usuario de prueba; usa copias temporales privadas. La fixture de navegador crea una página publicada `ANFB acceptance fixture`. La prueba de navegador espera el usuario `anfb-test`, contraseña `anfb-local-tests-only`, y Chrome en su ruta macOS habitual (sobrescribible con `CHROME_PATH`). Estas credenciales son solo para el sitio desechable.

La prueba de navegador guarda efectos, vuelve a abrir el editor y comprueba escritorio, móvil, movimiento reducido y JavaScript desactivado. Las capturas quedan en `/private/tmp/anfb-{editor,desktop,mobile}.png`. Tras verificar, restaurar la fixture con su copia original o eliminar el sitio desechable.

## Verificación de esta ampliación

Comprobado con WordPress 6.6 y 7.1, GenerateBlocks 2.3.0, GeneratePress y PHP 8.4.6 en dos instalaciones SQLite aisladas. Pasan la compilación, las comprobaciones de runtime, 36 comprobaciones PHP de contenido, la integración CLI y la integración de navegador. Esta última incluye la barra de formatos, guardado/reapertura, animaciones en marcha, escritorio/móvil, movimiento reducido, ausencia de JavaScript y fallo de inicialización AOS.

PHP 8.1 se conserva como mínimo de código, pero no se ejecutó una matriz de runtimes PHP ni de navegadores: el navegador probado fue Chrome. Las actualizaciones del plugin original requieren integrar y volver a probar estas modificaciones; una actualización que sustituya esta carpeta puede perder la ampliación.

## Contador simplificado en Akumbele

Prueba solicitada en `http://akumbele.local/prueba-contador-animations/` (página 1335), mediante el helper local-wpcli y el navegador integrado de Codex. Se verificaron valores intermedios y restauración del texto final para `98%`, `1.250,50 €` y `20+`, incluyendo GenerateBlocks V2 Text. Las pruebas de runtime cubren la inferencia del valor y formato, números negativos y selecciones inválidas.

El iframe `blob:` de Gutenberg quedó vacío en el navegador integrado; no se pudo completar allí la comprobación visual del nuevo panel. No se ejecutaron las fixtures de sitio desechable contra Akumbele. Los archivos anteriores del editor se conservaron en `/private/tmp/anfb-akumbele-counter-backup` y el contenido inicial de la página en `/private/tmp/anfb-akumbele-page-before.json`.
