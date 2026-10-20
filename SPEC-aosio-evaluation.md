# Spec: evaluación de AOSIO en Animations for Blocks

Estado: aprobada por el usuario («Perfecto ahora usa planning-and-task-breakdown»). Fecha: 2026-10-19.
Rama: `codex/aosio-evaluation`. Referencia inicial: `b59ecb3867c7d1f7bd398bc3d41cfefc52e27a42`.

## Objetivo

Probar AOSIO como sustituto del AOS actual y entregar una recomendación basada en compatibilidad observada y mediciones reproducibles. La evaluación es una sola capacidad: decidir si este motor sirve al plugin existente. Una conclusión negativa también completa la evaluación si identifica los fallos con evidencia.

El usuario autoriza una integración experimental en la rama, la dependencia candidata y las pruebas necesarias. La aprobación de esta especificación habilita la siguiente fase del flujo; no equivale a publicar, fusionar ni instalar la prueba en un sitio de cliente.

## Supuestos y alcance

- El contrato funcional actual es la referencia: interfaz, almacenamiento, bloques, variantes y opciones existentes.
- La comparación utiliza la misma versión del plugin, contenido, navegador, viewport, hardware, recorrido y configuración; cambia el motor y la adaptación imprescindible.
- Se prefiere integrar el fork sin modificar su fuente. Si necesita correcciones, se registrarán como coste de adopción y se distinguirá el fork original del candidato adaptado.
- No se presuponen mejoras por antigüedad, actividad reciente ni por usar IntersectionObserver. Las cifras promocionales no son resultados de esta evaluación.
- El plan previo y su lista estaban completos; su contenido exacto se conserva en `tasks/completed/2026-10-19-wordpress-animation-skill-{plan,todo}.md`. Los archivos activos de planificación se dedican a esta evaluación; `skills/` no forma parte de esta entrega.

## Stack y procedencia

- Plugin 1.5.0; WordPress >= 6.6; PHP >= 8.1; React 18 y herramientas existentes de WordPress.
- Control: `aos` declarado como `^3.0.0-beta.6`; registrar la versión exacta resuelta por `pnpm-lock.yaml` y los hashes de los bundles usados.
- Candidato: <https://github.com/jaredchesebro/aosio>. Su manifiesto consultado declara versión 1.0.0, `private: true`, entrada UMD y entrada ESM sin estilos. Fijar un SHA antes de integrar; registrar fechas reales de commits y releases, sin confundirlas con fechas de indexación.
- Comprobar licencia, atribuciones y posibilidad de redistribución antes de incorporar archivos al plugin. Si falta información, documentar el impedimento sin asumir permiso.
- Paquetes/herramientas actuales: pnpm 10.24.0, `@wordpress/scripts` 30.24.0, Playwright 1.52.0, Node y runners PHP/CLI existentes.
- Referencias de contrato: `docs/development.md`, `docs/testing.md`, `includes/animation-schema.json` y las especificaciones de persistencia/migración existentes.
- Fuente de packaging: <https://github.com/jaredchesebro/aosio/blob/main/package.json> y <https://github.com/jaredchesebro/aosio/blob/main/rollup.config.mjs>. README: <https://github.com/jaredchesebro/aosio>.

## Superficie afectada

| Lugar | Contrato a comprobar |
| --- | --- |
| `package.json`, `pnpm-lock.yaml`, `webpack.config.js` | Dependencia reproducible, imports y separación de bundles; conservar handles registrados en PHP |
| `src/init.js` | Inicialización diferida, doble frame, `window.AOS`, `window.anfbAosSettings`, errores y respaldo |
| `src/editor.scss`, `src/style-compat.scss`, `src/aos-custom.scss` | CSS del motor, duración/retraso/curvas, Scale, Curtain y distancias responsive |
| `src/AnimatedBlockListBlock.tsx`, `src/hooks.ts` | Vista previa por clases/atributos sin ejecutar el motor frontend dentro del editor |
| `src/text-runtime.js` | Espera del estado visible de ancestros antes de los efectos de texto |
| PHP e `includes/` | Lazy loading, filtros públicos, generación de atributos y secuencias, sin migración de datos |
| `build/` | Distribución regenerada desde fuente y carga sin red externa en ejecución |
| `tests/`, fixtures, `docs/` | Regresiones y comparación A/B con evidencia y límites explícitos |

Esta tabla define lo que debe revisarse; no obliga a modificar todos esos archivos. Reutilizar consumidores, runners y fixtures existentes.

## Estilo y contratos de código

Conservar el estilo local de JS/TS (tabs, sin punto y coma donde ya se omite), nombres actuales y PHP procedural con validadores existentes. Ejemplo real de contrato que se debe preservar:

```js
const engine = window.AOS || AOS
engine.init(settings)
window.AOS = engine
```

Conservar textos de interfaz en inglés, funciones de traducción WordPress y dominio `animations-for-blocks`. No añadir selector público de motores ni ampliar rangos de controles porque el fork admita valores adicionales.

## Compatibilidad que debe verificarse

1. Todas las animaciones, variantes, curvas y nueve anchor placements del esquema; especialmente Scale/Curtain, `clip-path`, distancias de escritorio/móvil, duración y retraso en sus extremos válidos.
2. `once` y `mirror` en todas sus combinaciones, scroll hacia ambos lados, carga a mitad de página, salto por ancla, elementos más altos que el viewport, cambios de tamaño e imágenes que alteran el layout. Contrastar posición de disparo: diferencia máxima propuesta de 5 CSS px, midiendo la condición geométrica, separada de la latencia de callback.
3. Default, Inherit, secuencias anidadas/ordenadas y condiciones por página; proveedores sin animación propia y retrasos correctos.
4. Gutenberg real: selección, vista previa manual/automática, duración/retraso/curvas, ajustes globales, guardar y reabrir sin bloques inválidos. El CSS de AOSIO usa variables que su JS asigna: verificar el editor que actualmente aplica clases y atributos sin ese JS.
5. Texto Typing, Reveal words, Smooth words y Counter, incluidos dentro de ancestros animados; conservar HTML, enlaces, formato, Unicode y accesibilidad.
6. `init`, `refresh`, `refreshHard`, eventos `aos:in`/`aos:out` y sus variantes por id, `data-aos-anchor`, clases personalizadas y configuración pública existente. Cambios dinámicos del DOM no deben provocar bucles de MutationObserver ni observadores/listeners duplicados.
7. Lazy loading activado/desactivado, filtros de carga existentes, motor externo en `window.AOS` y Lenis desactivado/activado/condicionado. Evaluar desplazamiento suave junto al nuevo motor.
8. Contenido visible y utilizable con movimiento reducido, sin JavaScript, motor bloqueado, excepción de inicialización y ausencia de IntersectionObserver. Respetar las protecciones actuales y declarar cualquier limitación del fork.
9. Contenido actual y legado, metadatos canónicos, desactivación/reactivación, importaciones del portapapeles y CLI versión 1. Ninguna migración nueva ni cambio del HTML guardado por sustituir el motor.

## Comandos

Desde la raíz del proyecto, utilizar los comandos existentes:

```sh
corepack pnpm install --frozen-lockfile
npm test
npm run build
php -l animations-for-blocks.php
wp --path=/private/tmp/anfb-aosio-site --user=1 eval-file tests/content.php
wp --path=/private/tmp/anfb-aosio-site --user=1 eval-file tests/persistence.php
wp --path=/private/tmp/anfb-aosio-site --user=1 eval-file tests/migration.php
ANFB_WP_PATH=/private/tmp/anfb-aosio-site ANFB_WP_CLI=wp python3 tests/cli.py
wp --path=/private/tmp/anfb-aosio-site --user=1 eval-file tests/fixture.php
```

Las rutas indican un sitio desechable que se preparará con `ANFB_TEST_SITE=true`, GenerateBlocks compatible y las credenciales de prueba de `docs/testing.md`. Usar el ID devuelto por la fixture, por ejemplo:

```sh
ANFB_TEST_URL=http://127.0.0.1:8765 ANFB_TEST_POST=4 npm run test:browser
```

El puerto y el ID del ejemplo deben sustituirse por los realmente creados. Lint de cada PHP modificado. Los comandos de comparación adicionales se documentarán con sus argumentos reales cuando se defina el runner en la fase de plan; no se presentan como scripts ya existentes.

## Estrategia de pruebas y medición

- Ejecutar primero el control y después el candidato con las mismas pruebas. Registrar fallos previos para distinguir regresiones.
- Reutilizar Jest, asserts Node, PHP y Playwright. Añadir únicamente cobertura que detecte diferencias de motor o proteja una adaptación necesaria.
- Integración con WordPress 6.6 y PHP 8.1 como mínimo; añadir una instalación de WordPress reciente y registrar versiones exactas. GenerateBlocks V2 debe ser compatible con cada instalación.
- Pruebas automatizadas y revisión visual en Chromium de escritorio y viewport móvil. Intentar Firefox/WebKit disponibles; declarar cualquier navegador no ejecutado. Emulación móvil no equivale a dispositivo real.
- Comparación aislada y luego integración WordPress con 20, 100 y 500 elementos equivalentes; incluir mezcla de familias, secuencias y elementos fuera de pantalla. Probar Lenis por separado para no mezclar costes.
- Un calentamiento y al menos cinco ejecuciones alternadas por motor/escenario. Misma velocidad de scroll, duración, pausas y throttling de CPU; registrar hardware, versiones y configuración. Usar medianas y dispersión, conservar datos brutos y trazas.
- Medir JS/CSS efectivo del plugin (bytes y gzip), inicialización, tiempo de scripting/layout durante scroll, tareas largas (>50 ms), intervalos entre frames (p95 y proporción >1,5 veces el intervalo de refresco medido) y carga repetida/refresh para detectar acumulación de recursos. Registrar reposo por separado.
- Separar rendimiento del motor de renderizado CSS y del tema. No inferir consumo de batería ni ejecución de callbacks fuera del hilo principal a partir de IntersectionObserver.
- Considerar mejora relevante propuesta una reducción >=20% en scripting durante scroll con 100 y 500 elementos, repetible y superior a la dispersión entre ejecuciones. Es un criterio de recomendación, no una promesa de resultado. Registrar también cambios inferiores o negativos.
- Investigar aumentos >10% en tiempo de inicio, scripting/layout o p95 entre frames cuando superen la variación entre ejecuciones. Una regresión funcional impide recomendar sustitución directa aunque mejore el rendimiento.

## Límites

- Siempre: fijar procedencia y revisión, preservar contratos, ejecutar controles relevantes, regenerar `build/`, entregar resultados positivos/negativos y checks pendientes con evidencia.
- Consultar antes: cambiar interfaz/almacenamiento/compatibilidad mínima, extender el alcance a otros motores, instalar en sitios existentes, publicar, fusionar o redistribuir código cuya licencia siga sin aclararse.
- Nunca: alterar contenido de clientes, ejecutar fixtures destructivas fuera del sitio desechable, editar bundles o `node_modules` a mano, debilitar pruebas, afirmar compatibilidad completa con comprobaciones pendientes o presentar previsiones del README como mediciones.

## Criterios de finalización

- Rama experimental con integración reproducible y bundles o, si existe un bloqueo real de procedencia/licencia/build, informe preciso del impedimento y lo comprobable sin distribuir el candidato.
- Matriz de compatibilidad con resultado por criterio: pasa, falla o pendiente, evidencias y adaptaciones necesarias. Una sustitución se considera plenamente compatible dentro de la matriz solo si todos los criterios aplicables pasan; los pendientes impiden esa afirmación.
- Comparación A/B reproducible con valores absolutos, porcentajes, dispersión y datos brutos; cero mejoras inventadas. Sin resultados comparables, el beneficio queda sin demostrar.
- Informe en `docs/aosio-evaluation.md` con SHA/versiones, licencia, comandos reales, entorno, matriz, mediciones, límites y recomendación: adoptar, adaptar o descartar. Explicar coste de mantenimiento y cómo volver al control.
- Evidencia de Gutenberg y frontend, escritorio/móvil y accesibilidad; contenido guardado y contrato CLI conservados.
- Cambios previos del usuario preservados. Ninguna fusión, publicación o modificación de instalaciones existentes forma parte de esta prueba.

## Preguntas abiertas

No hay decisiones de producto imprescindibles pendientes. Se proponen para revisión las tolerancias de 5 px y los umbrales de rendimiento del 20%/10%. SHA candidato, licencia, fuente de instalación, runtimes y navegadores disponibles son comprobaciones técnicas pendientes; se resolverán y registrarán sin pedir al usuario que adivine esos datos.
