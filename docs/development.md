# Desarrollo y extensión del plugin

Lee esta guía antes de modificar el plugin. Está dirigida a desarrolladores y agentes de IA. Para configurar una página sin cambiar el plugin, usa [codex.md](codex.md). Para ejecutar las comprobaciones, consulta [testing.md](testing.md).

El objetivo es incorporar futuras funciones en los patrones existentes, conservando el contenido guardado y la interfaz. Esta guía documenta extensiones dentro del repositorio; no define una API de registro para otros plugins.

## 1. Arquitectura y contratos de datos

### Tres funciones distintas

| Función | Configuración y edición | Persistencia y ejecución |
| --- | --- | --- |
| Entrada de un bloque | `animationsForBlocks`, editado mediante `AnimationControl` | `metadata.anfb.entry`; atributos de ejecución añadidos al renderizar |
| Efecto sobre texto seleccionado | Formato RichText `anfb/text`, editado en “Text animation” | `<span class="anfb-text" data-anfb="…">`; runtime de texto |
| Secuencia de bloques | `metadata.anfb.sequence` y entrada del grupo; hijos con `animation: 'inherit'` | Resolución de herencia y retrasos; utiliza el mismo motor de entradas |

Una dirección es una variante de una entrada, no una función independiente ni un efecto de texto. Una secuencia coordina entradas existentes.

### Valores admitidos y catálogo del editor

`includes/animation-schema.json` es la referencia de identificadores, variantes ordenadas, curvas, anclajes, claves de configuración, operaciones CLI y adaptadores admitidos. PHP lo lee mediante `animation_schema()`; los consumidores JavaScript lo importan directamente.

`src/aos-data.ts` mantiene las etiquetas traducibles y el orden visual del editor. Las llamadas a `__()` llevan textos literales para que WordPress pueda extraer las traducciones. No generar las etiquetas convirtiendo identificadores o pasando textos del JSON a `__()`.

La existencia del catálogo visual no crea otra lista independiente de capacidades: las pruebas de contrato exigen que sus identificadores coincidan con el esquema. Las animaciones pueden tener un orden visual diferente al JSON; las variantes de cada animación deben coincidir también en orden porque la primera se selecciona al cambiar desde una variante incompatible.

Orden visual actual: **Curtain, Fade, Flip, Slide, Zoom, Scale**. Las opciones **Inherit** y **Default** se agregan únicamente cuando el consumidor las permite. `none`, la cadena vacía y la ausencia de animación conservan sus convenciones existentes; no convertirlas en una animación nueva del esquema.

### Recorrido de una entrada

1. `src/AnimationsForBlocks.tsx` registra el atributo `animationsForBlocks` y los filtros de Gutenberg. `src/types.ts` expone los tipos compartidos.
2. `src/InspectorControls.tsx` monta el panel; `src/InspectorControlsLocation.tsx` respeta la ubicación configurada. `src/animation-control/index.tsx` edita la configuración. El modal de preferencias reutiliza ese mismo control para la animación predeterminada.
3. `src/utils.ts`, mediante `getAnimationProps()`, produce atributos de previsualización y de compatibilidad del guardado antiguo. `src/AnimatedBlockListBlock.tsx` aplica la vista del editor. `src/hooks.ts` resuelve Default, Inherit y secuencias en el editor.
4. En PHP, `block_args()` registra los atributos y contextos; `animate_block()` resuelve la configuración efectiva y `get_animation_attributes()` produce los atributos del frontend. `includes/persistence.php` adapta metadatos a los contextos existentes; las escrituras nuevas de CLI limpian atributos de entrada del HTML.
5. Las escrituras nuevas guardan configuración en `metadata.anfb`; solo la compatibilidad antigua conserva atributos HTML. Default, Inherit y las entradas condicionadas por páginas se resuelven en servidor; no incrustar su resultado como si fuera estático. Los proveedores de secuencia no deben animar además su propio wrapper.
6. `src/aos-custom.scss` incorpora Scale, Curtain, distancias responsive y la curva personalizada sobre AOS. `src/init.js` prepara el estado inicial y arranca AOS. El respaldo PHP y el arranque liberan el contenido si el motor falla. `src/editor.scss` adapta los estilos de previsualización.

Los ajustes globales tienen un esquema REST en `register_settings()`, cuyos enumerados se obtienen del JSON. Los valores iniciales globales están en `get_default_settings()` y `DEFAULT_SETTINGS` / `DEFAULT_ANIMATION`: mantener ambos lados alineados si una petición cambia esos valores.

### Texto, validación y CLI

- `src/text-formats.js` registra el formato, valida las opciones de la selección y permite aplicar, quitar o previsualizar el efecto. Conserva HTML, enlaces y formatos existentes; no sustituye el bloque entero.
- `src/text-runtime.js` ejecuta Typing, Reveal words, Smooth words y Counter. Restaura el contenido original al terminar o interrumpirse y mantiene una representación accesible. `src/counter-config.js` infiere el número y su formato.
- `includes/text.php` carga los recursos cuando encuentra texto animado. `includes/content.php` inspecciona y transforma los bloques y las selecciones admitidas; `includes/config.php` valida la configuración.
- `includes/sequence.php` resuelve el orden y los retrasos de las secuencias en servidor. Debe conservar su paridad con `useAnimationConfig()` del editor.
- `includes/cli.php` expone `wp anfb`. `inspect` devuelve capacidades desde el esquema. La aplicación exige validación, hash vigente, simulación y copia privada; consultar [codex.md](codex.md) para el contrato completo.

Los validadores de entrada y texto no tienen reglas idénticas: las entradas AOS usan duración positiva y retraso en pasos de 50 ms hasta 3000 ms; texto admite duración de 1–60000 ms y retraso de 0–60000 ms. No imponer el rango de uno al otro. Una opción presente en `textOptions` necesita además validación de su tipo y significado cuando corresponda: incluir la clave no implementa el comportamiento.

### Compatibilidad que se debe conservar

- WordPress 6.6 y PHP 8.1 son los mínimos. No adoptar APIs nuevas sin una alternativa compatible.
- Mantener los identificadores de bloques, formatos, atributos, animaciones, variantes y efectos existentes, el prefijo de portapapeles `anfb:`, los hooks públicos existentes y el formato de planes CLI versión 1.
- No renombrar atributos ni cambiar el HTML guardado por una reorganización interna. Cualquier cambio futuro que lo requiera debe incluir una estrategia de compatibilidad y pruebas con contenido anterior.
- Conservar bloques existentes de WordPress y GenerateBlocks V2. No ampliar indiscriminadamente las listas de adaptadores: los bloques dinámicos, sincronizados o con bindings requieren revisión específica.
- Preservar movimiento reducido, contenido visible sin JavaScript y respaldo ante fallo del motor. Una animación nunca debe dejar contenido o controles inaccesibles.

## 2. Contrato de interfaz

### Dónde incorporar cada ampliación

| Ampliación | Ubicación y patrón obligatorio |
| --- | --- |
| Animación de entrada | Una opción del selector de animaciones existente |
| Dirección o variante | Una opción del selector de variantes de esa animación |
| Duración y retraso de entrada | Los `RangeControl` compartidos actuales |
| Opción específica | Junto a las opciones de la animación correspondiente y visible cuando aplique |
| Opción avanzada | Dentro de “Advanced settings” |
| Efecto sobre texto seleccionado | Selector “Effect” de la herramienta “Text animation” |
| Comportamiento de secuencia | Panel “Sequence” |
| Preferencia global | Modal de ajustes del plugin |

Orden actual del control de entrada: selector de animación; orden de secuencia para Inherit; variantes; duración; retraso; distancias para Fade y Slide; botón “Advanced settings”. Dentro de los ajustes avanzados: páginas, Once, Mirror, Easing, Anchor placement y Offset. Mantener este orden salvo que la petición incluya cambiarlo.

### Componentes y comportamiento

- Reutilizar `AnimationControl`, `ButtonGroup.Radio`, `RangeControl` y los componentes de `@wordpress/components`. Las familias y variantes utilizan las píldoras existentes; no crear un botón o un panel independiente por dirección.
- Respetar `InspectorControlsLocation` y la preferencia `location`: default, advanced o styles. No fijar la ubicación de una ampliación al margen de ese componente.
- Mantener tamaño, espaciado, clases y estilos compartidos. No crear CSS específico para insertar una opción del selector. Los estilos que ejecutan un efecto pertenecen al motor, no al diseño de sus controles.
- Al cambiar de familia, conservar una variante compatible; si no existe, utilizar la primera de la nueva familia. La desactivación conserva la variante previa. `required` impide deseleccionar animación o variante.
- Default e Inherit mantienen sus condiciones de disponibilidad. El control de animación global exige selección y no ofrece estas opciones dinámicas. Los proveedores no ofrecen Inherit; los bloques normales sí pueden hacerlo.
- Conservar la exclusión entre Once y Mirror, las condiciones de los controles específicos y las restricciones de bloques y selecciones de texto.
- Mantener nombres accesibles aunque la etiqueta se oculte visualmente, controles alcanzables por teclado y las funciones de previsualización existentes. No sustituir botones por elementos sin semántica ni añadir interacciones que dependan solo del ratón.

### Idioma e instrucciones para agentes

Todo texto fuente de interfaz va en **inglés** y utiliza `__()`, `_x()` o `sprintf()` con dominio `animations-for-blocks`. Ejemplo existente:

```ts
{ label: __('Curtain', 'animations-for-blocks'), value: 'curtain' }
{ label: __('Right', 'animations-for-blocks'), value: 'right' }
```

El idioma de una conversación no cambia el idioma fuente del producto. El usuario puede ver traducciones de WordPress según su locale. Las etiquetas se traducen; `curtain`, `right`, claves de configuración y atributos HTML permanecen estables. El script del editor registra traducciones con el handle `animations-for-blocks-admin`.

Antes de implementar una petición, identificar su fila en la tabla de ubicaciones y revisar el componente existente y sus consumidores. Una petición de ampliar animaciones **no autoriza rediseñar la interfaz**. Si una función necesita realmente otra ubicación o patrón, explicar y resolver esa decisión antes de introducirlo. No añadir infraestructura de registro, dependencias o nuevas preferencias para necesidades hipotéticas.

## 3. Recetas de extensión

### Añadir una animación de entrada: Curtain como referencia

1. Definir el identificador estable y las variantes ordenadas en `variations` del esquema. Curtain utiliza `right`, `left`, `up`, `down`; su variante inicial es `right`.
2. Añadir las etiquetas literales en inglés a `ANIMATIONS` y `VARIATIONS`. Elegir explícitamente el lugar en el catálogo visual; la nueva animación aparece en el control compartido, también en el modal de ajustes.
3. Implementar la entrada en los estilos AOS compartidos si no existe en el motor. Curtain utiliza `clip-path: inset(...)`, liberándolo con `.aos-animate` y con el estado de previsualización del editor. Sus direcciones indican el sentido del revelado, no el desplazamiento del elemento.
4. Revisar el estado inicial, final, la previsualización, movimiento reducido y fallos de inicialización. Incluir una propiedad de transición nueva solo cuando el efecto la necesite. No reescribir el arranque para registrar una animación CSS.
5. Para una entrada que siga el contrato `animation` + `variation`, los serializadores existentes producen `curtain-right` sin una rama PHP o JavaScript por familia. Los enumerados REST se actualizan desde el esquema.
6. Ampliar las pruebas de catálogo, serialización y comportamiento visual. Actualizar la expectativa de orden visual solamente si se añadió o reordenó deliberadamente una opción; no cambiarla para ocultar una discrepancia.

### Añadir una dirección o variante

1. Leer las variantes de la familia en el esquema y el catálogo del editor. No reutilizar una dirección solo porque otra familia la admita.
2. Añadir el identificador en ambos lugares, con la etiqueta inglesa traducible. Mantener la primera variante salvo que se pida cambiar el comportamiento inicial.
3. Implementar los estados del efecto en AOS o en los estilos personalizados. En Curtain, comprobar el inset inicial y el sentido del revelado con contenido real.
4. Verificar que aparece en el selector de variantes existente, que se conserva al cambiar entre familias compatibles y que se utiliza la primera variante cuando no hay compatibilidad.
5. Añadir cobertura de aplicación idempotente, HTML conservado, dirección inválida y visualización. No se necesita otro botón, panel o atributo de bloque para una variante.

### Añadir un efecto de texto

1. Añadir el identificador a `effects` del esquema y una opción traducible al selector de `src/text-formats.js`. Conservar el orden de las opciones actuales: Typing, Reveal words, Smooth words, Counter.
2. Implementar la validación y ejecución en el runtime de texto, incluyendo su lista de efectos reconocidos. No basta con permitirlo en el JSON.
3. Si requiere claves nuevas, añadirlas a `textOptions`, validarlas en PHP y en la herramienta del editor, y conservarlas al aplicar/previsualizar. Revisar los valores iniciales y las condiciones de visibilidad.
4. Mantener el formato `anfb/text`, el span y su `data-anfb`, los adaptadores de texto admitidos y la restauración del HTML original. No ampliar la selección a otros bloques de forma implícita.
5. Probar selección, actualización, eliminación, HTML y Unicode, accesibilidad, finalización/interrupción y movimiento reducido. Si procesa números, probar formatos, separadores y valores inválidos con los helpers existentes.

### Añadir una opción

1. Determinar si pertenece a una entrada, texto, secuencia o preferencia global. Usar su ubicación de interfaz y su configuración existentes.
2. Para entradas, actualizar el tipo `AnimationsForBlocks`, `entryOptions` y la validación de PHP. Para texto, actualizar `textOptions` y los validadores. Para secuencias, revisar sus opciones, ambos resolvedores y contextos. Para preferencias globales, revisar tipos, valores iniciales JavaScript/PHP y esquema REST.
3. Elegir un valor por omisión que conserve el comportamiento del contenido anterior. Distinguir ausencia, cero y falso cuando tengan significados diferentes.
4. Recorrer todos los consumidores: edición, copia/pegado cuando aplique, previsualización, guardado, sincronización de HTML, renderizado PHP, runtime y CLI. Si produce un atributo HTML, mantener alineados `getAnimationProps()`, `get_animation_attributes()` y `entry_attribute_names()` para poder actualizarlo y quitarlo sin residuos.
5. Añadir los controles usando componentes existentes y probar límites, valores inválidos, contenido anterior, persistencia e idempotencia. Actualizar la guía CLI si cambia una configuración que acepte.

### Lista de entrega para cualquier ampliación

- [ ] **Definición:** identificadores y claves en el esquema correcto; etiquetas y orden coherentes con el catálogo.
- [ ] **Traducción:** textos fuente literales en inglés, dominio correcto e identificadores independientes del locale.
- [ ] **Ubicación:** reutiliza el control y la ubicación existentes, con visibilidad y accesibilidad conservadas.
- [ ] **Ejecución:** estados inicial/final, previsualización, runtime y limpieza completos; validación en las entradas correspondientes.
- [ ] **Compatibilidad:** contenido anterior, Default/Inherit, secuencias y adaptadores conservados; sin migraciones accidentales.
- [ ] **Pruebas:** contratos y regresiones pertinentes, guardado/reapertura en Gutenberg, escritorio/móvil, movimiento reducido, ausencia de JavaScript y fallo del motor cuando aplique.
- [ ] **Entrega:** `npm test`, `npm run build`, sintaxis PHP y comprobaciones WordPress según [testing.md](testing.md); incluir `build/`, sin editar bundles a mano.
- [ ] **Documentación:** actualizar capacidades, recetas y guía CLI afectadas; registrar lo comprobado y lo pendiente con sus versiones reales.

Las pruebas de contrato detectan discrepancias de valores, orden y selección, pero no certifican el idioma inglés ni la calidad del diseño. Revisar los textos fuente y la interfaz como parte de la entrega. No declarar verificación visual si el iframe de Gutenberg no pudo abrirse ni usar un sitio de cliente para ejecutar fixtures.

## Desactivación segura 1.5

Contrato, migración explícita y límites: [safe-deactivation.md](safe-deactivation.md). Los metadatos son canónicos; los aliases antiguos se materializan solo para runtime y compatibilidad. No eliminar la vía antigua sin una estrategia para páginas aún sin migrar.
