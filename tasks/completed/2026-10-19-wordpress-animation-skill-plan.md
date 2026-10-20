# Plan: skill para animar contenido WordPress

## Objetivo
Crear `skills/animate-wordpress-blocks/SKILL.md`: un skill breve en español para configurar contenido existente mediante Animations for Blocks y `wp anfb`, especialmente GenerateBlocks V2. No cambiar el plugin.

## Investigación completada
Revisados docs/codex.md, docs/development.md, docs/testing.md, docs/safe-deactivation.md, includes/animation-schema.json y los comandos/validadores/inspección de includes/cli.php, includes/config.php e includes/content.php.
El plan anterior tenía todas sus tareas completas; sus resultados se conservan en docs/testing.md.

## Decisiones
- Un único SKILL.md autocontenido, frontmatter preciso y ejemplos mínimos; sin scripts ni copia exhaustiva del catálogo.
- Entrega dentro del repositorio para revisión; instalación personal solo si se solicita.
- Identificar WordPress, usuario y plugin activo; usar --path/--user explícitos y el entorno del sitio si usa Local. No fijar rutas personales.
- Consultar inspect.capabilities, editable, textEditable, textNodes, source y children; nunca adivinar rutas/hash ni prometer compatibilidad con cualquier bloque.
- Flujo: inspect → plan versión 1 → dry-run y diferencias → apply con respaldo privado nuevo → reinspección, navegador y Gutenberg.
- Explicar entrada, selección de texto/occurrence, contador con end numérico explícito y secuencia con entrada del proveedor primero e hijos inherit. Incorporar rangos diferentes de entradas y texto.
- Conservar contenido, HTML, diseño, estado de publicación y ajustes globales. No editar SQL/atributos directamente ni añadir CSS/JS o contenedores innecesarios.
- Tratar fuentes compartidas por separado dentro del alcance autorizado; explicar pageIds y fuentes dinámicas omitidas.
- Restaurar con simulación, mismo sitio/página y sin cambios posteriores; varias copias en orden inverso. Ante hash/bloqueo/conflicto, reinspeccionar sin forzar.
- Mencionar migrate frente a clear solo si se pide desactivación; no migrar automáticamente.

## Secuencia
1. Redactar skill con el flujo y un ejemplo mínimo coherente.
2. Validar formato y contrastar ejemplos/escenarios con el contrato actual.
Detalle y criterios en tasks/todo.md. Sin trabajo paralelo necesario.

## Riesgos y mitigaciones
- Versiones distintas: capacidades de la instalación como autoridad.
- Sitio equivocado/cambios concurrentes: identidad, hash, bloqueo y respaldo privado fuera de cualquier raíz pública.
- Pérdida de contenido: no reconstruir bloques ni atravesar fuentes no editables.
- Falsa certificación: declarar límites del navegador y no ejecutar fixtures sobre sitios de clientes.

## Checkpoint
Plan aprobado por el usuario: «Perfecto crea el skill». Se incorporaron catálogo práctico y criterios de coherencia visual. Implementación y validación completadas; resultados en tasks/todo.md.

## Fuera de alcance
Cambios src/build, nuevas animaciones, instalación personal, publicación y operaciones sobre páginas reales para probar el skill. No requiere build del plugin.
