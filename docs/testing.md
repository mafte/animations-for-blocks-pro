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

## Entradas y secuencias 1.4 — Akumbele

Se confirmó el fallo inicial midiendo fotogramas: AOS añadía el estado final mientras el CSS de respaldo todavía forzaba visibilidad, sin transición perceptible (69 muestras con opacidad 1). Preparar y pintar el estado inicial antes de inicializar AOS produjo 63 muestras intermedias de opacidad/desplazamiento. El arranque usa dos requestAnimationFrame y un respaldo de 1500 ms que libera el contenido si no se inicializa. Sin JavaScript no se aplica la clase de preparación. Movimiento reducido omite el arranque y conserva el contenido.

`npm test` incluye comprobaciones del orden de arranque, fallo, inicialización tardía y movimiento reducido. `tests/content.php` añade distancia responsive, condición de página, validación, secuencias, orden y ausencia de retrasos globales entre renders (49 comprobaciones).

La nueva página 1345, «Home — Motion del plugin», es una copia borrador de la original 19. Los planes y respaldos privados se conservan en `/private/tmp/anfb-home-plan.json`, `/private/tmp/anfb-header-plan.json`, `/private/tmp/anfb-home-1345-before.json` y `/private/tmp/anfb-header-51-before.json`. La cabecera compartida 51 tiene condición `[1345]`. No se añadió CSS/JS manual al contenido ni se modificó el tema.

En el navegador interno se comprobaron el recorrido de 24 px y 16 px móvil, scroll completo, menú móvil, pestaña Agricultura, apertura/cierre del mapa y controles del formulario sin enviar datos. La prueba anterior 1338 y la copia 1345 muestran el mismo iframe `blob:` sin documento accesible y lienzo `about:blank`, sin errores de consola. Esto impide certificar visualmente los controles y el guardado/reapertura de Gutenberg en ese navegador; no demuestra bloques dañados. Movimiento reducido, JavaScript desactivado y fallo de arranque tienen cobertura de lógica y respaldo, pero no emulación visual nueva en el navegador interno, que no expone esos controles.

La batería final pasó en WordPress 6.6 y 7.1: 49 comprobaciones PHP, runtime JavaScript, arranque e integración CLI (permisos, atomicidad, hash desactualizado, idempotencia, copias privadas, limpieza y restauración). En Akumbele se restauró realmente la página 1345 y se reaplicó el plan con un segundo respaldo; quedó como borrador. Los hashes de 19 y 1338 permanecieron iguales. La referencia 1341 incorporó durante la sesión el CSS facilitado; ningún lote de este trabajo apuntó a esa página ni se sobrescribió ese cambio.

## Cabecera global en Brave

Tras vaciar `pageIds`, la configuración de la cabecera 51 seguía siendo global correctamente. Brave mostró que el wrapper `#gp-header-wrp` recibía AOS, pero el tema imponía `transition: background .3s`, anulando las transiciones de opacidad y transform. Se trasladó la misma entrada al bloque interior `generateblocks-pro/site-header` (`#gp-header-main`), quitándola del wrapper fijo. No se modificó el tema ni el código del plugin. Brave confirmó después opacidad y transform de 600 ms, retraso de 100 ms y la curva suave configurada. Plan y copia: `/private/tmp/anfb-header-inner-plan.json` y `/private/tmp/anfb-header-global-before.json`.

La grabación de recarga del home original en Brave (`/private/tmp/anfb-header-brave.json.gz`) registró transiciones `transform` y `opacity` para `#gp-header-main`, ambas terminadas, de aproximadamente 700 ms incluyendo el retraso. Sus capturas muestran la cabecera inicialmente oculta y después entrando. El contenido de la página 19 no se modificó; el ajuste vive en la cabecera compartida 51 y continúa global.

## Nueva propuesta Motion Design — página 1353

Se reinstaló la compilación 1.4.0 del proyecto en Akumbele, con copia previa del plugin en `/private/tmp/anfb-local-update-l1odqpw9/`. Se creó «Home — Motion Design · Plugin» como borrador a partir de la página 19. Se aplicaron 34 operaciones usando inspect, hash, dry-run y respaldo: `/private/tmp/anfb-motion-v2-plan.json`, `/private/tmp/anfb-motion-v2-before.json`. Hero 550/750 ms, paisaje 1600 ms, segundo tiempo de palabras 650 ms; entradas 24/16 px, tarjetas 350 ms con intervalo 100 ms, contadores de 20+ y 100% de 1100 ms. Se mantuvo intacta la configuración global de cabecera.

Brave permitió abrir el iframe real de Gutenberg, comprobar los controles de 24/16 px y 750/300 ms del título, guardar y volver a abrir sin avisos de bloques inválidos. El hash del contenido después del guardado fue idéntico al previo; repetir el plan con hash vigente devolvió changed=false. Se revisaron escritorio, scroll hasta el final, emulación iPhone 16 de 393×852 y apertura/cierre de menú móvil. Se restauró la vista de escritorio y quedó abierta la previa. No se enviaron formularios. No se repitieron en esta copia las emulaciones de movimiento reducido ni JavaScript desactivado. Compilación y npm test pasaron.

Se confirmó que la página 19 mantiene su hash original. La copia 1353 sigue como borrador y contiene cero bloques HTML y cero etiquetas style/script añadidas. Captura: `/private/tmp/anfb-motion-v2-brave.png`.

## Cortina — Akumbele, 17 de octubre de 2026

Compilación y npm test correctos; tests/content.php pasó 62 comprobaciones sin escribir páginas. Se añadieron las cuatro direcciones, preservación de HTML, idempotencia y rechazo de dirección inválida. PHP lint correcto.

Borrador 1541 «Nosotros — Demostración Cortina», copia de 297. Cuatro entradas de 1500 ms: subtítulo, título y dos imágenes, con direcciones alternadas. Inspect, simulación y aplicación registrados en /private/tmp/anfb-curtain-*.json; respaldo privado en ~/.local/share/anfb-backups/akumbele/curtain-demo/before-1541.json. Fuente original conservó hash c3486311d774f647369a8fa2a39a5e97b74dc127658726707d4d13400bab4144.

Navegador interno: máscara inicial inset(0 0 0 100%), 50 muestras con valores intermedios entre 98.619% y 31.7115%, estado final inset(0px); revisadas imágenes al scroll. Recursos del plugin incluyen clip-path entre las propiedades de transición. La copia no contiene bloques HTML ni etiquetas style/script adicionales.

Gutenberg volvió a mostrar iframe about:blank y controles incompletos incluso con el título seleccionado desde la lista. No se certificó visualmente guardado/reapertura ni los controles; no se deduce que el contenido esté dañado. No se ejecutó nueva emulación móvil, movimiento reducido o JavaScript desactivado; los estilos incluyen liberación de máscara para estas dos últimas condiciones y para fallo del motor. No se ejecutaron las fixtures destructivas del sitio desechable en Akumbele.
