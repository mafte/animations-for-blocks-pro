# Plan: detección de entradas con IntersectionObserver

Fecha: 2026-10-20. Estado: tareas 01 y 02 ejecutadas; checkpoint A pendiente de revisión humana antes de integrar en producción. Rama: `codex/aos-intersection-observer`, creada desde `codex/aos-optimization` en `04b8e2a6e11eb377561170b626d2ad08dd7eb503`.

El motor optimizado y el ZIP entregado siguen siendo la referencia funcional. Su [plan anterior](archive/aos-optimization-2026-10-20/plan.md) y sus [tareas completadas](archive/aos-optimization-2026-10-20/todo.md) están archivados; los resultados permanecen en [aos-evaluation.md](../docs/aos-evaluation.md). No hay cambios de implementación en este plan.

## Objetivo y contrato

Sustituir el recorrido de todos los elementos por cada evento de scroll por notificaciones de IntersectionObserver (IO). Comparar contra **AOS ya optimizado**, no contra sus defectos originales. Adoptar el cambio cuando conserve las entradas actuales y reduzca trabajo medido sin trasladar un coste mayor a layout, memoria o arranque.

Conservar los nueve anclajes, offsets globales/locales, `data-aos-anchor`, `once`, `mirror`, clases, eventos, métodos `init`/`refresh`/`refreshHard` y valores de retorno observados. Mantener los controles, metadatos, HTML guardado, secuencias, formatos de texto, CSS y carga condicional. WordPress 6.6 y PHP 8.1 siguen como mínimos. No hay migración de contenido.

El objetivo de soporte solicitado es una ventana aproximada de tres años: navegadores actuales y versiones representativas de finales de 2023 en adelante, incluyendo escritorio y móvil. La tarea 01 fija versiones mínimas concretas con fechas de fuentes oficiales y distingue soporte previsto de ejecución real. No usar funcionalidades recientes de IO como `trackVisibility` o `scrollMargin` para el detector. No cambiar Browserslist ni actualizar dependencias para favorecer la comparación.

## Hallazgos que determinan el diseño

- El paquete parcheado conserva `prepare`, `offsetCalculator`, `handleScroll` y la API original. El punto de integración es `initializeScroll()` en `aos/src/js/aos.js`, importado por `src/init.js`. El parche reproducible vive en `patches/aos@3.0.0-beta.6.patch`; no editar `node_modules` como entrega ni bundles a mano.
- Para el ancla efectiva, AOS obtiene `T` mediante la cadena de offsets sin transformaciones y `h` con `offsetHeight`. El umbral de entrada es `T + a*h - b*H + Oin`, con `a` y `b` en `0`, `0.5`, `1` según el anclaje y `H = innerHeight`. La salida de `mirror` es `T + h - Oout`. No depende de que un porcentaje del área esté visible.
- Hay una diferencia que hay que conservar: un `data-aos-anchor-placement` explícito sin offset usa `Oin = 0`, mientras que la salida puede seguir usando el offset global. No unificar ambos offsets ni reordenar umbrales cuando entrada y salida se cruzan. La condición de salida de `mirror` tiene prioridad, salvo con `once`.
- IO observa rectángulos afectados por transformaciones y recortes de ancestros. Observar directamente el bloque animado puede desplazar el disparador, generar oscilaciones o depender de visibilidad horizontal que AOS no comprueba. Una banda estrecha de observación también puede perder saltos completos de scroll. El prototipo debe resolver estos casos antes de la integración.
- El runner actual comprueba activación de los nueve placements, pero no sus píxeles exactos. Además, `scrollResponseMs` incluye una espera fija de 130 ms y no mide CPU ni FPS. Se amplía el arnés; esas cifras anteriores no prueban el rendimiento de IO.
- `src/text.js` **ya utiliza IO** para disparar formatos de texto. Este plan cambia las entradas de bloques y comprueba su coordinación con `startWithBlock` y los eventos AOS; no fusiona los dos motores.
- El código actual emite `aos:in:<id>` también al ocultar un elemento con ID. Caracterizar y conservar esa peculiaridad durante esta migración; corregirla sería un cambio aparte. Igual criterio para otras diferencias del control: registrar y discutir, no cambiar silenciosamente.

## Decisiones de arquitectura

1. **Reutilizar AOS y su estado.** Mantener preparación, clases, eventos y estilos; añadir un controlador IO al fuente parcheado. Aplicar la lógica común solo a los elementos afectados por una notificación, sin recorrer todos los nodos dentro del callback. Los recorridos completos siguen permitidos en init/refresh explícitos.
2. **Resolver geometría antes que integración.** El prototipo compara márgenes/grupos de observadores sobre referencias estables y, si hace falta, marcadores de umbral independientes del elemento transformado. Elegir una sola estrategia tras medir. No presuponer que `threshold: 0` reproduce las nueve reglas. Si ninguna estrategia pasa, revisar el diseño en checkpoint A.
3. **Márgenes y recursos acotados.** Calcular márgenes verticales en píxeles; los porcentajes de `rootMargin` se resuelven respecto al ancho de la raíz. Medir cantidad de observadores y objetivos con configuraciones idénticas y heterogéneas. Reutilizar recursos cuando sea posible. Cualquier marcador debe ser privado, no enfocable, no interactivo, sin efecto en accesibilidad, layout, scrollHeight/scrollWidth, selectores estructurales relevantes o HTML persistido, y eliminarse al retirarlo.
4. **Ciclo de vida único.** Conservar agrupación de mutaciones, reinit sin acumulación y versión de caché correcta. Desconectar recursos y descartar callbacks de generaciones anteriores al refrescar, desactivar o retirar objetivos. Si hay marcadores, ignorar solo sus mutaciones, sin ocultar cambios reales de la misma entrega. No introducir ResizeObserver por elemento sin evidencia; conservar las fuentes de refresh actuales y probar cambios de geometría con ellas.
5. **Tiempo y opciones externas.** IO entrega avisos de forma asíncrona. Comparar el estado en posiciones de scroll estabilizadas y los eventos de transiciones observadas, separando latencia de geometría. No prometer callbacks en el mismo milisegundo. `throttleDelay` conserva su función de limitar la frecuencia de actualización, aplicado a los elementos pendientes; `debounceDelay` sigue controlando refresh. La tarea 02 valida esta política con valores explícitos. Un cambio de semántica adicional requiere revisión antes de integrarlo.
6. **Integración gradual y verificable.** Primero convertir `top-bottom` con once/mirror/eventos completos, conservando temporalmente el detector anterior solo para los otros placements. La siguiente tarea incorpora los ocho restantes y elimina esa ruta temporal. Tras checkpoint B no queda un barrido global por scroll ni un segundo motor oculto de respaldo.
7. **Salida segura.** Sin IO o ante fallo del controlador, liberar el contenido con el respaldo existente; no descargar polyfills ni activar el recorrido antiguo. Mantener `window.AOS` externo y `anfb_aos_handle`: un motor externo conserva su ruta y no recibe un requisito IO añadido por el plugin. Preservar movimiento reducido, arranque antes de la primera transición y contenido visible sin JavaScript.
8. **Procedencia y build.** Seguir usando pnpm patch con versión exacta, licencia MIT y lockfile. Revisar el chunk `aos`, dependencia de `init`, hashes y CSS compartido. Las fuentes PHP/editor solo cambian si la integración exige una corrección concreta. No ampliar el alcance a WAAPI, scroll timelines, Lenis o un rediseño de CSS.

## Dependencias y orden

La lista de ejecución y los checkpoints se mantienen únicamente en [todo.md](todo.md). La evidencia de caracterización y prototipo está en [aos-intersection-evaluation.md](../docs/aos-intersection-evaluation.md); la cobertura fue Chromium-only y está separada de las comparaciones de rendimiento pendientes.

```text
01 Contratos y control → 02 Prototipo geométrico               → revisión A
03 Entrada top-bottom → 04 Nueve placements                   → revisión B
05 Ciclo de vida → 06 Arranque e integración externa          → revisión C
07 Rendimiento sintético → 08 Matriz de navegadores           → revisión D
09 WordPress/Gutenberg → 10 Rendimiento en páginas reales     → revisión E
11 Documentación de mantenimiento → 12 ZIP y revisión final   → entrega
```

Las tareas 01 y 02 son el primer filtro de viabilidad. En los checkpoints se presentan resultados y se revisan con el usuario antes del siguiente bloque, según la skill solicitada. No se trata una tarea marcada como hecha como prueba de aprobación humana. Trabajo secuencial: parche, lockfile, compilación y contrato están conectados; no se necesitan agentes paralelos.

## Aceptación funcional

- Matriz de nueve placements con offsets ausentes, cero, positivos y negativos de configuración externa; tamaños pequeños, mayores que la ventana y fraccionarios; ancla externa/compartida; carga inicialmente desplazada, restauración de scroll, enlaces hash, ascenso, descenso y saltos que sobrepasan entrada y salida en un frame.
- Verificar debajo/en/encima del umbral en coordenadas de scroll alcanzables. Tolerancia geométrica máxima propuesta: 1 píxel CSS por redondeo, sin activación anticipada mayor. Registrar `scrollY` real y el valor teórico; no afirmar que se ha probado un límite que el documento no permite alcanzar. No rebajar el criterio tras un fallo sin revisión.
- Comparar clases, estado, eventos globales/con ID, `detail`, orden y duplicados tras estabilización. Separar casos de scroll pausado y saltos; no inventar eventos intermedios que el control no llegó a observar. `once`/`mirror`, incluidos ambos true por API externa, mantienen la prioridad original.
- Transformaciones propias y de ancestros, `overflow`, posición horizontal fuera de pantalla, elementos de altura cero u ocultos, fixed/sticky y contenedores desplazables se caracterizan contra el control. No ampliar el soporte de scroll anidado más allá de AOS durante esta sustitución.
- Cien refresh y cien refreshHard, reinit con distintas opciones, cambios de tamaño/orientación, imágenes tardías, inserción/retirada/reemplazo/anidación, disable y observer desactivado no acumulan recursos ni permiten escrituras desde callbacks antiguos. Los eventos repetidos que ya pertenezcan al contrato de refresh se distinguen de duplicados accidentales.
- Gutenberg guarda y reabre bloques actuales/heredados y GenerateBlocks; mismos controles, secuencias y textos. Sin reescribir páginas originales. Verificar recursos, filtros, caché y fallback en navegador, además del harness PHP.

## Medición y criterio de adopción

**Control:** extraer `04b8e2a6e11eb377561170b626d2ad08dd7eb503` en una carpeta privada nueva e instalar dependencias propias con lockfile congelado. No enlazar node_modules con el candidato parcheado. Guardar hashes y versiones reales. Los resultados de la etapa anterior son contexto, no control nuevo.

**Matriz sintética:** 0/30/100/500 elementos y 1000 de estrés; opciones homogéneas y variadas; 1280×800 y 390×844; CPU normal y ×4. Un calentamiento y al menos cinco muestras alternando variantes. Repetir control contra control y medir scroll sostenido normal como caso principal; refrescos repetidos y lotes DOM son escenarios separados.

**Métricas:** scripting atribuible a entradas, coste total de scripting/layout/paint, latencia hasta cambio de clase y hasta primer frame de transición, duración/p95 de frames y long tasks, init, refresh, lotes DOM, recursos activos, nodos auxiliares, memoria retenida cuando el navegador permita medirla y bytes raw/gzip. El coste nativo de IO no se deduce del tiempo del callback: se inspecciona también en el renderizado total. Herramientas y limitaciones se registran.

**Meta propuesta:** al menos 20% menos scripting mediano de entradas durante scroll sostenido con 500 elementos, por encima del ruido control/control; 1000 elementos debe confirmar la tendencia. Investigar y resolver regresiones reproducibles mayores del 10% y 1 ms en init/refresh, p95 de frames o scripting de casos 30/100. Diferencias inferiores se informan con valores absolutos, sin atribuirlas automáticamente a una mejora. Memoria, layout y coste de marcadores/observadores forman parte de la decisión, aunque baje JavaScript. Si la meta no se cumple o el coste total empeora fuera del ruido, no adoptar por el solo hecho de usar una API moderna.

**Páginas reales:** comparar la misma copia local de una página representativa de Akumbele con ambos builds, activos y configuración idénticos. Usar carga fría/caliente y el mismo recorrido de scroll, sin agregar animaciones artificiales para inflar la ventaja. Mostrar la diferencia entre mejora del motor, carga de página y fluidez; no convertir una reducción de scripting en una afirmación de FPS no medidos.

**Compatibilidad demostrada:** ejecutar contratos en Chromium, Firefox y WebKit disponibles, más Safari real cuando exista. WebKit de Playwright no certifica Safari ni una versión histórica. Probar los límites de 2023 con entornos seguros disponibles; si faltan, dejar esa parte de la ventana pendiente y no afirmar compatibilidad completa. Mantener verificaciones en WordPress 6.6/PHP 8.1 y entorno local actual con GenerateBlocks compatible en cada uno.

## Comandos y entorno previstos

Se ejecutarán durante implementación, después de revisar el plan. La tarea 01 registra rutas reales y crea el control con `git archive` del commit indicado. Las dependencias se instalan mediante `corepack pnpm install --frozen-lockfile` en cada variante.

Runner existente, que se amplía sin sustituir sus regresiones:

```sh
node tests/aos-browser.cjs --mode contract --control "$ANFB_IO_CONTROL" --candidate "$PWD" --output "$ANFB_IO_RESULTS/contracts"
node tests/aos-browser.cjs --mode contract --browser firefox --control "$ANFB_IO_CONTROL" --candidate "$PWD" --output "$ANFB_IO_RESULTS/contracts"
node tests/aos-browser.cjs --mode contract --browser webkit --control "$ANFB_IO_CONTROL" --candidate "$PWD" --output "$ANFB_IO_RESULTS/contracts"
```

La tarea 07 añadirá un modo `profile` al runner para el scroll sostenido; **todavía no existe**. El modo `benchmark` actual se conserva como regresión y no se usa como sustituto de perfiles CPU. El prototipo de 02 será una fixture de prueba, no una nueva opción pública.

Por incremento de motor: regresión pertinente, contratos reales, `npm test`, `npm run build` y revisión de build/patch/lock. Para cambios PHP: `php -l` de archivos afectados y escenarios `tests/aos-assets.php`. Integración completa: comandos y limpieza de [docs/testing.md](../docs/testing.md), incluyendo `tests/content.php`, `tests/cli.py`, `tests/fixture.php` y `npm run test:browser`.

Las fixtures que crean contenido se ejecutan en un sitio desechable/clon local con `ANFB_TEST_SITE` efectivo. Puede prepararse un clon de Akumbele, aprovechando la autorización local existente. En la comparación real usar copias privadas y restaurar activación/ajustes/instalación; conservar hashes de páginas originales y backups privados. No tocar producción ni enviar formularios. No modificar `skills/`.

## Riesgos y salidas

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Transform, recorte o ancho alteran el umbral | Alto | Prototipo con referencias estables; pruebas a ambos lados del límite. |
| Saltos no cruzan una banda observada | Alto | Exigir estado final correcto incluso al saltar sobre todos los límites; no aceptar bandas que solo funcionan con scroll lento. |
| Muchos observadores/marcadores cuestan más que AOS | Alto | Matrices heterogéneas, coste total y memoria; descartar o rediseñar en A/D. |
| Marcadores afectan DOM, altura o MutationObserver | Alto | Sin efecto estructural observable, sin persistencia, ignorado estrecho y limpieza probada. |
| Callback antiguo o reinit cambia once/mirror | Alto | Generaciones, desconexión y regresiones de lifecycle; misma lógica de estado. |
| IO cambia cadencia o retorno de API | Medio | Caracterizar valores y eventos; conservar limitación de frecuencia y separar latencia de posición. |
| Falta IO/falla el arranque | Alto | Contenido visible, respaldo existente y caso de motor externo independiente. |
| No hay navegador histórico/entorno mínimo | Medio | Registrar cobertura parcial; no cerrar aceptación completa por inferencia. |
| Mejora sintética no aparece en Akumbele | Medio | Informar ambas mediciones y mantener el control optimizado como alternativa válida. |

## Entrega y revisión

El resultado incluye controlador adoptado o rechazo documentado, pruebas significativas, fuentes/parche/lock y build coherentes, informe con versiones/muestras y ZIP identificable por commit. Cada incremento verificable tiene su commit; no hay merge ni publicación automática. La rama y el ZIP optimizados existentes permiten volver al control sin migración de datos.

Decisiones que debe resolver la evidencia en A: geometría observada, recursos por configuración y cadencia compatible. En D/E: coste total y cobertura suficiente para recomendar la adopción. Si hace falta relajar anclajes, eventos o umbrales, presentar la diferencia concreta al usuario antes de cambiar el contrato.

## Fuentes consultadas el 2026-10-20

- [MDN: Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API): entrega asíncrona, área de intersección y recorte. La API básica está ampliamente disponible; eso no demuestra equivalencia con AOS.
- [MDN: rootMargin](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/rootMargin), [thresholds](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/thresholds) y [disconnect](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/disconnect): configuración y liberación.
- [Especificación Intersection Observer](https://w3c.github.io/IntersectionObserver/): cálculo geométrico y porcentajes de margen relativos al ancho. El algoritmo de compatibilidad propuesto es una hipótesis a verificar, no una garantía de la especificación.
- [Política de navegadores de WordPress](https://make.wordpress.org/core/handbook/best-practices/browser-support/): contexto del build de editor. La ventana de tres años para frontend procede del usuario y debe concretarse por versión.
- Fuente AOS instalada y parcheada: `aos/src/js/aos.js`, `helpers/offsetCalculator.js`, `helpers/prepare.js`, `helpers/handleScroll.js`, `libs/offset.js`; procedencia y licencia conservadas en la [evaluación anterior](../docs/aos-evaluation.md).
