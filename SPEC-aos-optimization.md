# Especificación: evaluación y optimización de AOS original

Estado: aprobada por el usuario el 2026-10-20. Planificación en `tasks/plan.md`; tareas en `tasks/todo.md`.

## Objetivo y alcance

Evaluar AOS original y su integración en Animations for Blocks; después, implementar únicamente mejoras demostrables de coste de ejecución, CSS, transferencia y mantenimiento que conserven el comportamiento del plugin. La persona que edita una página debe obtener las mismas entradas, secuencias y efectos de texto, con los mismos controles y contenido guardado.

Una sola capacidad: optimizar el motor de entradas existente dentro de su contrato actual. JavaScript, CSS y carga son dimensiones de esa capacidad. No se requiere un mapa de módulos separado.

Supuestos comunicados al usuario: conservar la interfaz, los datos y el comportamiento; medir antes de adoptar otra arquitectura. No se presupone que una API reciente sea más rápida o compatible por su antigüedad. AOSIO queda descartado por decisión del usuario.

Rama: `codex/aos-optimization`, creada desde `master` en `b59ecb3867c7d1f7bd398bc3d41cfefc52e27a42`. La evaluación AOSIO permanece en su propia rama. Esta fase entrega investigación y especificación; el plan y las tareas se redactarán tras su aprobación. Los planes completados que vienen de master se conservan hasta entonces.

## Base técnica y procedencia

- Plugin 1.5.0; WordPress mínimo 6.6 y PHP mínimo 8.1.
- Dependencia declarada `aos: ^3.0.0-beta.6`; `pnpm-lock.yaml` resuelve exactamente `3.0.0-beta.6`. No confundirla con AOS estable v2.
- El registro npm identifica `gitHead: 329fb34f777034345f4d3f4def4dc3bcc300cc2e`. Se descargaron desde esa revisión los archivos `src/js/aos.js` y `src/sass/_core.scss`: coinciden byte por byte con los instalados. No se afirma haber comparado todo el paquete.
- AOS tiene licencia MIT. Cualquier fuente derivada debe conservar licencia, autor y revisión de origen; sus cambios deben quedar identificados.
- `@wordpress/scripts` 30.24.0, pnpm 10.24.0, React 18.3.1 y Playwright 1.52.0 ya disponibles. No se necesita un framework adicional.
- No existe Browserslist propio; webpack usa el valor de `@wordpress/scripts`: `extends @wordpress/browserslist-config`. Mantener esa política y registrar las versiones efectivamente probadas. No actualizar dependencias para alterar la comparación.

Fuentes primarias consultadas:

- [AOS original: documentación y contrato de opciones/API](https://github.com/michalsnik/aos).
- [Metadatos del paquete exacto](https://registry.npmjs.org/aos/3.0.0-beta.6).
- [JavaScript original fijado por revisión](https://github.com/michalsnik/aos/blob/329fb34f777034345f4d3f4def4dc3bcc300cc2e/src/js/aos.js).
- [Generación del CSS original](https://github.com/michalsnik/aos/blob/329fb34f777034345f4d3f4def4dc3bcc300cc2e/src/sass/_core.scss).
- [Licencia de AOS](https://github.com/michalsnik/aos/blob/next/LICENSE).
- [Política de navegadores de WordPress](https://make.wordpress.org/core/handbook/best-practices/browser-support/).
- [Scroll y límites de requestAnimationFrame como throttle](https://developer.mozilla.org/en-US/docs/Web/API/Document/scroll_event).
- [IntersectionObserver: funcionamiento y límites](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API).
- [Animaciones CSS ligadas al desplazamiento](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations).
- [CSS attr(): comprobar soporte por sintaxis y propiedad](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/attr).

## Evaluación inicial: hechos y oportunidades

| Área | Observación comprobada | Evaluación propuesta |
| --- | --- | --- |
| Listeners | `initializeScroll()` crea un nuevo throttle y listener de scroll en cada `refresh()`. `refreshHard()`, resize, orientación y load pueden recorrer esa vía. | Separar registro de eventos y recálculo; mantener un solo listener activo. Es la primera corrección candidata. |
| Recorrido de scroll | `handleScroll()` recorre todos los elementos; lee `window.pageYOffset` para cada uno y crea dos cierres por elemento. Ya evita cambiar clases cuando el estado no cambia. | Perfilar coste por número de elementos; probar lectura única y menor trabajo por pasada. No atribuirle lecturas de geometría que solo ocurren en prepare. |
| Refrescos/DOM | `prepare()` añade clases y calcula offsets; el observador puede pedir varios refrescos para distintos registros de una misma entrega de mutaciones. | Medir layout y exploraciones; agrupar mutaciones relevantes, separar lecturas y escrituras cuando aporte beneficio. Conservar descubrimiento de elementos añadidos y retirados. |
| CSS | `_core.scss` genera 60 duraciones y 60 retrasos. El CSS distribuido contiene 120 selectores con duración y 240 con retraso. Se importa en frontend y editor. | Comparar una generación más compacta y variables CSS con el original. Contabilizar también el JS y el HTML extra necesarios para alimentar variables. |
| Propiedades animadas | El plugin amplía `transition-property` a transform, opacity, background, background-color, color, filter y clip-path. | Medir paint/composición por familia. Conservar Curtain y personalizaciones; no quitar propiedades ni aplicar `will-change` global sin evidencia y prueba de compatibilidad. |
| Arranque | `src/init.js` lee estilos de los elementos y usa dos requestAnimationFrame para pintar el estado inicial. Existen liberación por error y plazo de 1500 ms. | Medir coste con páginas grandes. Cualquier simplificación debe mantener una transición inicial real y contenido visible al fallar. Estas lecturas no prueban por sí solas un reflow por elemento. |
| Carga | Los assets ya son condicionales con `lazyloadAssets`, scripts en footer con `defer`. Hay un pequeño arranque inline global en head. | Medir solicitudes/orden en páginas con y sin animaciones, también plantillas y bloques heredados. No equiparar carga condicional con importación al entrar al viewport. |
| Caché | `build/aos.js` usa como versión `build/index.asset.php`, correspondiente al editor. El CSS AOS usa su propio md5. | Verificar que cambiar solo el motor invalida su URL y que una reconstrucción idéntica mantiene la versión. |
| Código antiguo | El paquete declara classlist-polyfill, lodash.throttle y lodash.debounce; incluye detección de IE y de dispositivos. | Inspeccionar qué llega al bundle y cuánto ocupa. Retirar solo código innecesario para la política de navegadores; conservar semántica de disable phone/tablet/mobile. |

### Comprobaciones realizadas en esta fase

Reproducción aislada con el `dist/aos.js` publicado, ejecutado en Node 24.21.0 mediante VM, DOM mínimo sin elementos animados y `disableMutationObserver: true`:

| Operación acumulada | Listeners de scroll registrados |
| --- | ---: |
| `AOS.init(...)` con documento completo | 1 |
| 20 llamadas a `AOS.refresh()` | 21 |
| Otras 20 llamadas a `AOS.refreshHard()` | 41 |

Esto confirma el registro acumulado en el código publicado. No es una medición de FPS, consumo real de CPU ni de memoria retenida en navegador.

Tamaños de los archivos comprometidos en master, sin recompilar; gzip nivel 9 con `node:zlib`:

| Archivo | Bytes | Gzip bytes |
| --- | ---: | ---: |
| `build/aos.js` | 13 686 | 4 842 |
| `build/init.js` | 2 512 | 1 257 |
| `build/aos.css` | 31 380 | 2 861 |
| `build/editor.css` | 46 072 | 3 784 |

Estos son tamaños locales, no transferencia HTTP observada. Las reducciones de bytes sin comprimir y de gzip se informarán por separado. No hay todavía una optimización implementada ni una ganancia de velocidad demostrada.

## Contrato que debe conservarse

1. Todas las animaciones, variantes, curvas y nueve anchor placements de `includes/animation-schema.json`; Scale, Curtain, `ease-out-soft` y distancias de escritorio/móvil propias del plugin.
2. Duración y retraso actuales, incluidos límites/pasos y ausencia de atributo; offset, once, mirror y sus combinaciones. Conservar precedencia entre valores globales e individuales, incluido el offset particular de un anchor placement explícito.
3. Default, Inherit, orden/intervalo de secuencias, proveedores anidados, condiciones de página y bloques existentes. No modificar `metadata.anfb`, RichText, serialización antigua ni desactivación segura.
4. `window.AOS`, `window.anfbAosSettings`, `init`, `refresh`, `refreshHard`, clases configurables, `useClassNames`, `disable`, `startEvent`, parámetros de throttle/debounce y selección de otro motor ya presente en `window.AOS`.
5. Eventos `aos:in`/`aos:out` y eventos por id, con elemento en `event.detail`. El original emite por error `aos:in:<id>` al salir; caracterizarlo y presentar cualquier corrección observable por separado, sin esconderla en una optimización.
6. Hooks `anfb_aos_handle`, `anfb_load_scripts`, `anfb_load_styles` y `anfb_aos_attributes`; compatibilidad con AOS externo y CSS personalizado. Conservar handles y orden de dependencias salvo propuesta explícita.
7. Vista previa real de Gutenberg, que usa clases/estilos y temporizadores propios, sin arrancar el motor de scroll. Una reducción de CSS debe funcionar también allí y con atributos antiguos o renderizados dinámicamente.
8. Inicio visible y animado, inicialización tardía, documento ya cargado, restauración del scroll, enlaces con fragmento y cambios de tamaño. Movimiento reducido, JS desactivado, motor bloqueado o con error deben mantener accesible el contenido. Registrar inconsistencias preexistentes de opciones de movimiento reducido antes de cambiarlas.
9. Runtime de texto que espera la clase activa del antecesor; no adelantar palabras/contadores ni dejarlos esperando indefinidamente. Convivencia con Lenis en sus tres modos existentes.

## Opciones modernas que hay que comparar

- **Corrección localizada del AOS original:** primera candidata; mantiene las fórmulas de activación y reduce trabajo duplicado. Preferirla a una reescritura si resuelve el problema medido.
- **IntersectionObserver:** experimento condicionado a demostrar equivalencia de geometría, scroll inverso, saltos, anclajes externos, transformaciones y once/mirror. Intersección visible y umbral original de AOS no son contratos equivalentes automáticamente.
- **requestAnimationFrame:** puede coordinar escrituras; por sí solo no sustituye un throttle temporal ni garantiza menos ejecuciones. Mantener el significado de `throttleDelay` salvo cambio aprobado.
- **Variables CSS:** evaluar compactación de reglas conservando valores y cascada. Comparar frontend/editor, globales/individuales, nodos dinámicos y motor externo; evitar depender exclusivamente de `attr()` tipado sin verificar toda la matriz.
- **Scroll/View Timelines y WAAPI:** estudiar viabilidad y soporte. El progreso ligado al scroll no equivale a una transición temporal al cruzar un umbral ni aporta por sí solo los eventos de AOS. No son requisito de adopción.
- **Tamaño y carga:** inspeccionar dependencias realmente incluidas, CSS repetido, caché y waterfall. No exigir un único bundle ni retrasar la descarga hasta el viewport si perjudica el primer revelado o el motor externo.

El informe posterior debe recomendar para cada opción: adoptar, descartar o posponer, con causa y mediciones. No convertir el estudio en una librería nueva de propósito general ni añadir ajustes de interfaz.

## Estructura y alcance de cambios futuros

| Ubicación existente | Responsabilidad / alcance |
| --- | --- |
| `src/init.js` | Integración, configuración y preparación inicial. |
| `src/aos-custom.scss`, `src/editor.scss` | Estilos propios y vista previa. |
| `src/utils.ts`, `src/AnimatedBlockListBlock.tsx` | Atributos/estilos de preview, únicamente si lo requiere la compactación de CSS. |
| `animations-for-blocks.php` | Render de atributos, registro, caché, filtros y carga. |
| `src/text-runtime.js`, `src/lenis.js` | Consumidores para verificar compatibilidad; no ampliar sus funciones. |
| `webpack.config.js`, `package.json`, `pnpm-lock.yaml` | Procedencia reproducible y empaquetado, si procede. |
| `tests/init.mjs`, `tests/runtime.mjs`, `tests/*.test.js`, `tests/browser.cjs` | Reutilizar arnés y convenciones; añadir regresiones enfocadas y benchmark comparativo cuando se apruebe. |
| `docs/development.md`, `docs/testing.md`, `docs/upstream.md` | Contratos, resultados y procedencia. Informe propuesto: `docs/aos-evaluation.md`. |
| `build/` | Distribución generada con el build existente, también entregable. |

La forma de mantener cambios en AOS se resolverá en el plan: integración existente primero; si hay que corregir internos, fuente derivada mínima bajo `src/` o parche reproducible que compile fuentes, con licencia y revisión fijadas. No editar `node_modules` como solución persistente, no modificar bundles a mano y no incorporar la toolchain antigua de AOS. El original sin modificar seguirá disponible como control de comparación.

## Estilo de código

Ejemplo real de `src/init.js`, cuyo límite y validación deben conservarse:

```js
if (!element.hasAttribute(attribute)) continue
const value = Number(element.getAttribute(attribute))
if (Number.isFinite(value) && value >= 0 && value <= 200) element.style.setProperty(variable, `${value}px`)
```

Reutilizar indentación, nombres y estilo locales (JS sin punto y coma); PHP compatible con 8.1. No reformatear archivos ajenos. Las etiquetas nuevas, si excepcionalmente fueran necesarias y aprobadas, van en inglés con traducción WordPress y dominio `animations-for-blocks`. No rediseñar controles.

## Comandos y entorno

Ejecutar desde la raíz del repositorio. Instalación reproducible solo cuando corresponda; no actualizar el lockfile para obtener un baseline diferente:

```sh
corepack pnpm install --frozen-lockfile
npm run build
npm test
npm run test:unit -- --runTestsByPath tests/catalog.test.js tests/animation-control.test.js
php -l animations-for-blocks.php
```

No existe script `lint` propio: no presentar uno inventado como requisito pasado. Para todo PHP modificado ejecutar `php -l RUTA_DEL_ARCHIVO`. El benchmark futuro debe tener comando exacto documentado en el plan/informe, sin depender de scripts temporales de AOSIO.

Integración existente, solo con instalación desechable identificada y `define('ANFB_TEST_SITE', true)` comprobado en su configuración efectiva. No basta una variable de entorno con ese nombre. Las rutas/ID siguientes son parámetros a reemplazar con los valores de esa instalación:

```sh
wp --path=/sitio/desechable --user=1 eval-file tests/content.php
ANFB_WP_PATH=/sitio/desechable ANFB_WP_CLI=wp python3 tests/cli.py
wp --path=/sitio/desechable --user=1 eval-file tests/fixture.php
ANFB_TEST_URL=http://127.0.0.1:8765 ANFB_TEST_POST=ID_DEVUELTO npm run test:browser
```

No se ha comprobado en esta fase qué sitios desechables siguen disponibles. Descubrirlos antes de declarar pruebas bloqueadas. La matriz mínima de runtime será WordPress 6.6/PHP 8.1 y una instalación reciente disponible; registrar versiones reales y cualquier ausencia.

## Estrategia de pruebas y medición

### Caracterización anterior a los cambios

- Congelar control de master y hashes de los assets. Recompilar control/candidato con la misma instalación y toolchain; distinguir tamaños históricos de los reproducidos.
- Convertir la reproducción de listeners en regresión: tras 100 refresh y 100 refreshHard debe quedar un solo listener AOS de scroll. Verificar también resize, orientación, load tardío y reinicialización; no interferir con listeners de terceros.
- Afirmaciones reales en las pruebas: fallar ante incompatibilidad; separar defectos conocidos del original y resultados esperados de fallos. Un JSON informativo o un fallo declarado esperado no certifica compatibilidad.
- Registrar cada opción pública utilizada/admitida y cubrirla. Para fórmulas usar geometría de layout sin transformaciones; contrastar por separado posición de activación y latencia del callback. No medir offsets de AOS mediante un rectángulo ya desplazado por la propia animación.

### Compatibilidad y apariencia

- Unitarias de fórmulas, once/mirror, precedencia, eventos, refrescos y CSS; catálogo completo contra el esquema. Cubrir límites 0/50/3000 ms según admita cada campo, distancias 0/24/100/200 y valores inválidos.
- Navegador con todos los placements, scroll hacia abajo/arriba y salto grande, carga con scroll restaurado/fragmento, viewport desktop/móvil y elementos altos/fijos/con anclaje externo. Casos de padres transformados y contenedores con overflow como caracterización, sin ampliar soporte implícitamente.
- DOM dinámico: añadir, quitar y reemplazar bloques, actualizar atributos y llamar refresh/refreshHard. Caracterizar qué actualiza hoy el observador antes de ampliar su alcance.
- Comparar estilos computados y fotogramas inicial/intermedio/final de las seis familias. No basta que la clase final o la opacidad final sean correctas.
- Gutenberg real: preview, guardar/reabrir y ausencia de bloques inválidos; Default/Inherit/secuencias, texto y compatibilidad antigua. Si el iframe no abre, usar navegador accesible y declarar el límite.
- Movimiento reducido, sin JS, fallo de red/init, carga tardía, Lenis off/on/animate y motor AOS externo. Si un caso no puede ejecutarse, queda pendiente y no se declara compatibilidad completa.
- Chromium para mediciones; Firefox y Safari/WebKit para compatibilidad cuando estén disponibles. Registrar versiones y diferencias; WebKit automatizado no equivale a Safari real. No afirmar cobertura de todos los navegadores por probar Chrome.

### Rendimiento reproducible

- Fixtures equivalentes con 0, 30, 100 y 500 elementos; 1000 como estrés adicional. Mismos estilos, contenidos, viewport 1280×800/390×844 y recorrido de scroll.
- Separar carga/arranque, scroll continuo, 100 refrescos, ráfaga de mutaciones y reposo. Medir tamaño raw/gzip, solicitudes y bytes transferidos, tiempo de init/refresco, tiempo total/p95 de handlers, scripting/style/layout/paint, tareas largas y número de listeners/observadores. Evitar un bucle RAF nuevo en reposo.
- Una ejecución de calentamiento y al menos cinco medidas por caso/variante, alternando orden; conservar muestras, mediana y p95 con definición de cada métrica. Repetir diferencias cercanas al ruido. Registrar navegador, hardware, caché y throttling (normal y CPU ×4 cuando el arnés lo permita).
- Comprobar ausencia de solicitudes AOS/Lenis en página sin animación con carga condicional/Lenis off; distinguir el pequeño boot inline ya existente. Probar página con texto solamente, plantillas y contenido dinámico sin falsos negativos.
- Analizar memoria retenida como diagnóstico si aparecen acumulaciones; no usar solo el tamaño del heap como prueba concluyente. No introducir telemetría de producción.

## Criterios de éxito

1. Informe trazable con versión/revisión, hallazgos priorizados, metodología, muestras antes/después y decisión por oportunidad. Las hipótesis sin perfilar se identifican como tales.
2. Listener único y ausencia de crecimiento del trabajo por refrescos repetidos; pruebas de regresión y arranque correctas. El coste por scroll no debe aumentar con el número histórico de refresh.
3. Ninguna regresión de contrato sin una decisión explícita; pruebas existentes y casos añadidos correctos. Los defectos heredados se documentan aparte.
4. Objetivos iniciales para orientar experimentos: reducir al menos 25% el CSS AOS gzip o 20% el tiempo mediano de scripting de AOS en el caso de 500 elementos con refrescos. Son objetivos por comprobar, no ganancias prometidas. Informar ambos y mantener una mejora solo si supera el ruido y no traslada un coste mayor a init/HTML/editor.
5. Sin aumento reproducible superior al 10% en tiempo mediano de init/scroll/refresco de las fixtures representativas sin explicación y revisión; para tiempos mínimos informar también diferencia absoluta y dispersión. No compensar una incompatibilidad con ahorro de bytes.
6. Caché coherente con los assets realmente servidos; carga condicional y filtros conservados, sin recursos faltantes ni nuevos errores de consola.
7. Fuentes editables, procedencia/licencia y build reproducibles. Incluir `build/` generado; ninguna modificación del contenido del usuario ni despliegue automático.

Si no se alcanza una meta cuantitativa, entregar el resultado y limitar la recomendación a las correcciones demostradas; no redefinir después el umbral para presentar éxito. La evaluación puede concluir que una modernización concreta no conviene.

## Límites

- **Siempre:** leer `docs/development.md`/`docs/testing.md`, preservar contratos e i18n, registrar baseline antes de cambiar código, mantener control original, probar cada cambio de lógica, compilar desde fuentes y documentar límites reales.
- **Consultar antes:** cambiar datos o API pública, reducir soporte de navegadores/WP/PHP, introducir dependencias, retirar filtros/opciones/animaciones, cambiar deliberadamente tiempos o fórmulas, desplegar o publicar. La aprobación de esta spec no autoriza esos cambios adicionales.
- **Nunca:** usar sitios de clientes para fixtures, modificar páginas originales para medir, eliminar pruebas fallidas o marcar incompatibilidades como éxito, editar bundles a mano, guardar una solución solo en node_modules, incorporar AOSIO, mezclar trabajo ajeno o atribuir mejoras a la mera elección de una API.

## Preguntas abiertas y aprobación

No hay una decisión funcional imprescindible pendiente: se propone mantener el contrato actual y evaluar todas las oportunidades anteriores. El mecanismo mínimo para mantener una corrección de AOS y la disponibilidad de navegadores/sitios se concretarán con evidencia en el plan.

El usuario aprobó alcance y criterios el 2026-10-20 y solicitó continuar con la planificación. El plan requiere revisión antes de implementar; todavía no se ha iniciado implementación.
