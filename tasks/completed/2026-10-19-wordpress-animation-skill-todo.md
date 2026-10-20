# Tareas: skill de animación WordPress

## Task 1: Redactar el skill
**Descripción:** Convertir el contrato del plugin en instrucciones breves para animar contenido existente.

**Acceptance criteria:**
- [x] Frontmatter preciso y alcance WordPress/Animations for Blocks, sin compatibilidad universal supuesta.
- [x] Flujo completo de inspección, capacidades, hash, simulación, respaldo, aplicación, revisión y restauración.
- [x] Ejemplo mínimo con entradas, texto y secuencias; límites de selección, contadores y fuentes compartidas explícitos.

**Verification:** Contrastar comandos/campos/rangos contra docs/codex.md, esquema y validadores actuales.
**Dependencies:** Ninguna; revisión del plan antes de iniciar.
**Files likely touched:** skills/animate-wordpress-blocks/SKILL.md.
**Estimated scope:** Small, 1 archivo.

## Task 2: Validar la entrega
**Descripción:** Verificar formato y utilidad sin modificar WordPress.

**Acceptance criteria:**
- [x] quick_validate.py de skill-creator pasa.
- [x] Ejemplo JSON parseable y compatible con esquema/validadores.
- [x] Revisión estática de entrada individual, selección repetida/contador, secuencia y hash desactualizado; límites de verificación registrados.

**Verification:** Validador de skills, parseo JSON y contraste con implementación; no requiere build ni fixtures de contenido.
**Dependencies:** Task 1.
**Files likely touched:** skills/animate-wordpress-blocks/SKILL.md, tasks/todo.md.
**Estimated scope:** Small, 2 archivos.

## Checkpoint: entrega
- [x] Skill validado y enlazado para revisión.
- [x] Ningún código del plugin ni contenido WordPress modificado.

## Verificación realizada
- quick_validate.py: Skill is valid! (PyYAML existente en caché; sin instalar dependencias).
- Ejemplo JSON parseado y contrastado con animation-schema.json; configuraciones entry/text aceptadas por los validadores PHP reales, intervalo/tipo del proveedor comprobados.
- Revisión estática: selección repetida requiere occurrence verificado, contador exige end numérico; proveedor antes de sequence, hijos previos no sobrescritos sin intención; hash obsoleto obliga a reinspección/simulación.
- Entrega de 138 líneas. Sin cambios al plugin ni páginas reales; sin prueba operativa en WordPress o navegador en esta tarea.
