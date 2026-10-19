# Animar páginas desde Codex

Usa esta guía cuando el usuario pida animar o ajustar una página con Animations for Blocks. No hace falta un chat integrado ni un servidor MCP.

## Acceso y flujo

1. Identifica el WordPress local y usa siempre `--path` y `--user` explícitos. En Local, usa el entorno shell del sitio. Esta carpeta del plugin no es una instalación WordPress.
2. Ejecuta `inspect`, lee la jerarquía y decide qué elementos animar. Las rutas incluyen los bloques de texto libre: usa las rutas devueltas, no las deduzcas por posición visual.
3. Prepara un plan JSON con el hash actual. Simula, revisa las diferencias y aplica con una copia privada nueva.
4. Comprueba la página en navegador, haciendo scroll en escritorio y móvil. Abre Gutenberg y confirma que no haya bloques inválidos.
5. Para otro ajuste, vuelve a inspeccionar. Para deshacer una operación, restaura su copia; para deshacer varias, restaura en orden inverso.

```sh
wp --path=/ruta/wordpress --user=manuel anfb inspect 123 --format=json
wp --path=/ruta/wordpress --user=manuel anfb apply 123 --file=/ruta/plan.json --dry-run
wp --path=/ruta/wordpress --user=manuel anfb apply 123 --file=/ruta/plan.json --backup=/ruta/privada/antes.json
wp --path=/ruta/wordpress --user=manuel anfb clear 123 --dry-run
wp --path=/ruta/wordpress --user=manuel anfb clear 123 --paths='[[0,1]]' --backup=/ruta/privada/limpieza.json
wp --path=/ruta/wordpress --user=manuel anfb restore 123 --file=/ruta/privada/antes.json --dry-run
wp --path=/ruta/wordpress --user=manuel anfb restore 123 --file=/ruta/privada/antes.json
```

`clear --paths` afecta solo a los bloques indicados; sin rutas recorre todos los bloques editables de la página. Informa las fuentes dinámicas omitidas. No edita patrones sincronizados, Query Loops, bindings ni otros bloques dinámicos. Text y Container de GenerateBlocks V2 son adaptadores explícitos: sus callbacks añaden estilos sin convertir el contenido estático en una fuente dinámica.

Las operaciones devuelven JSON, con hashes y diferencias. `--dry-run` no guarda ni crea copias. Guardar cambios exige una ruta absoluta nueva, fuera del directorio público de WordPress, con directorio padre existente. Las copias se crean con permisos 0600. No pongas ese directorio bajo otro sitio público. Una restauración solo funciona en el mismo sitio y página, sin cambios posteriores. El estado de publicación no cambia.

## Plan JSON, versión 1

```json
{
  "version": 1,
  "postId": 123,
  "contentHash": "HASH_SHA256_DEVUELTO_POR_INSPECT",
  "operations": [
    {
      "op": "entry",
      "path": [0, 0],
      "block": "core/heading",
      "config": {
        "animation": "fade",
        "variation": "up",
        "duration": 600,
        "delay": 0,
        "once": true
      }
    },
    {
      "op": "text",
      "path": [0, 1],
      "block": "core/paragraph",
      "selection": { "text": "1.250,50", "occurrence": 1 },
      "config": {
        "effect": "count",
        "start": 0,
        "end": 1250.5,
        "duration": 1200,
        "delay": 0,
        "decimals": 2,
        "decimal": ",",
        "thousands": ".",
        "prefix": "",
        "suffix": ""
      }
    }
  ]
}
```

Operaciones: `entry`, `entry-remove`, `text`, `text-remove`, `clear`. Solo `entry` y `text` requieren `config`; `text` y `text-remove` requieren `selection`. Rutas con índices enteros desde cero; `occurrence` desde uno. Si hay varias coincidencias y no se indica aparición, se rechaza la selección. Las operaciones se resuelven secuencialmente dentro del lote validado.

`inspect.capabilities` contiene tipos, variaciones y valores admitidos. Para AOS, duración admite 50–3000 ms y retraso 0–3000 ms, en pasos de 50. Configuración de entrada: `animation`, `variation`, `duration`, `delay`, `once`, `mirror`, `easing`, `offset`, `anchorPlacement`. Usar `default` o `inherit` conserva el funcionamiento original; `inherit` necesita un proveedor existente. Las secuencias también pueden construirse aplicando retrasos a bloques individuales, sin añadir contenedores.

Efectos de texto: `typing`, `words`, `count`. Duración predeterminada 1200 ms; retraso 0; duración 1–60000 y retraso 0–60000 ms. `typing` admite `cursor` booleano, desactivado por defecto. Todos se ejecutan una vez al entrar en pantalla y esperan la entrada AOS del bloque y sus ancestros.

En el editor, el contador solo muestra la duración: toma automáticamente el valor final, decimales, separadores y símbolos del texto seleccionado. Por ejemplo: `98%`, `1.250,50 €` o `20+`. Una selección con varios números se rechaza; un único separador seguido por tres cifras, como `1.250`, se interpreta como miles (salvo `0.125`, que se interpreta como decimal). La vista previa usa la selección y los ajustes actuales antes de aplicar. Los parámetros avanzados de configuraciones existentes y WP-CLI siguen siendo compatibles.

En WP-CLI, el contador exige `end` numérico explícito; nunca pasar `"1.250"` como número. Inicio predeterminado 0, decimales 0 (máximo 10), separador decimal `.`, separador de miles `,`, prefijo/sufijo vacíos. Se permite separador de miles vacío, negativos y conteo descendente. El texto seleccionado es el contenido final que se conserva, incluso si su formato difiere de la configuración numérica: el agente debe elegir valores coherentes.

Texto compatible: párrafo y título de Gutenberg y `generateblocks/text`. La selección CLI debe caber en un nodo de texto; `inspect.textNodes` ayuda a identificarlo. Las selecciones que atraviesen negritas o enlaces se aplican desde la barra de formatos del editor. No superponer efectos: reemplazar el fragmento completo o quitar su formato primero.

## Límites de esta versión

- No modificar páginas mientras otro editor esté trabajando en ellas; se comprueban hash y bloqueo antes de guardar.
- No publicar, cambiar diseños ni modificar ajustes globales al animar una página.
- El HTML guarda el texto final completo. El navegador crea y elimina las estructuras visuales temporales; sin JavaScript o con movimiento reducido se lee el original.
- `clear` limpia animaciones en la página elegida. Antes de desactivar el plugin, repetir para las otras páginas y fuentes que contengan animaciones: no hay limpieza global automática.
- No importa configuraciones del plugin Blocks Animation adjunto.

## Entradas suaves y secuencias (1.4)

`entry` admite `distance` y `mobileDistance` (enteros 0–200 px; móvil hasta 767 px), `easing: "ease-out-soft"` (curva `cubic-bezier(.22,.61,.36,1)`), `pageIds` (lista de IDs; vacía significa todas) y `order` (0–1000, solo para hijos con `inherit`). Sin distancia se conserva el recorrido original de AOS. La condición de página se aplica en el servidor: los atributos AOS condicionales no se guardan en el HTML estático.

Container/Element y Text de GenerateBlocks V2, Media y los wrappers compatibles de cabecera/navegación admiten entradas. No se abren bindings, patrones sincronizados ni fuentes dinámicas para modificar su texto. Para una cabecera compartida, inspeccionar su página Element por separado y establecer `pageIds` con la copia de prueba antes de aplicar.

`sequence` habilita el proveedor existente en `core/group`, `generateblocks/element` o `anfb/animation-container`. Configurar primero la entrada del grupo y después:

```json
{"op":"sequence","path":[0],"block":"generateblocks/element","config":{"enabled":true,"interval":100}}
```

El intervalo admite 0–1000 ms en pasos de 50. Los hijos directos editables sin configuración reciben `inherit`. El retraso inicial es el `delay` del proveedor; cada hijo recibe ese retraso más su posición por el intervalo, sin acumular retrasos entre grupos. `order` ordena ascendentemente y los empates conservan el orden de bloques. Un proveedor anidado inicia su propia secuencia; un descendiente heredado dentro de otro hijo ya animado no recibe una segunda entrada. `clear` también quita el proveedor y el intervalo.

`words-up` añade revelado suave por palabras con opacidad y desplazamiento; admite `distance` (12 px predeterminado), `mobileDistance` (8 px predeterminado) y `startWithBlock` (false predeterminado). Si `startWithBlock` es true, espera solo el retraso de la entrada del bloque y después el retraso propio; permite un segundo tiempo dentro del hero. Si es false, espera también la duración de esa entrada. No cambia el efecto `words` existente. Conserva HTML de enlaces, negritas y saltos; el texto original permanece disponible para tecnologías de asistencia.

En Gutenberg: panel **Animation** para entradas/distancias y **Advanced settings → Only on pages (IDs)** para condiciones; panel **Sequence** para proveedor, intervalo, reproducción y lista compacta de hijos animados; **Inherit → Sequence order** para ordenar un hijo. En la barra de formatos del texto, **Text animation → Smooth words** controla el revelado y su previsualización. Las etiquetas siguen el idioma disponible del plugin.

## Cortina

En el panel **Animation → Curtain**, elegir **Right** (descubre desde el borde izquierdo), **Left** (desde el derecho), **Up** (desde abajo) o **Down** (desde arriba). Usa los controles existentes de duración, retraso, curva y reproducción; funciona con herencia y secuencias. La máscara recorta también sombras durante la entrada: preferir imágenes o contenedores sin controles flotantes.

CLI: `{"op":"entry","path":[0],"block":"core/image","config":{"animation":"curtain","variation":"right","duration":1000,"once":true,"easing":"ease-out-soft"}}`. Las capacidades de inspect incluyen las cuatro direcciones. Sin JavaScript, ante fallo del motor o con movimiento reducido el contenido queda descubierto. No necesita bloques HTML ni código por página.

## Migración para desactivación segura

Desde 1.5, entradas y secuencias nuevas usan metadatos nativos. Antes de desactivar sobre páginas antiguas, seguir [safe-deactivation.md](safe-deactivation.md): `anfb migrate POST_ID --content-hash=HASH --dry-run`, después aplicar con respaldo privado. No usar `clear` como sustituto: clear elimina la configuración; migrate la conserva.
