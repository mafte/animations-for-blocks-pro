# Plan: evaluación y optimización del AOS original

[Especificación aprobada](../SPEC-aos-optimization.md), 2026-10-20. Rama: `codex/aos-optimization`. Base: master `b59ecb3867c7d1f7bd398bc3d41cfefc52e27a42`.

**Estado:** ejecución en curso; checkpoints A y B revisados por el usuario. Lista única: [todo.md](todo.md). El trabajo anterior estaba completado y se conserva íntegro en [archive/safe-deactivation-2026-10-19](archive/safe-deactivation-2026-10-19/plan.md).

## Enfoque y decisiones

Conservar AOS 3.0.0-beta.6 y sus contratos. Primero obtener control, pruebas y perfiles; después corregir listeners y evaluar mejoras aisladas. Una alternativa evaluada y descartada con evidencia es un resultado válido.

1. **Control independiente:** extraer el commit base e instalar sus dependencias congeladas por separado. No enlazar su node_modules al candidato: los parches del candidato contaminarían el control. Guardar hashes, versiones, muestras y capturas en temporal privada.
2. **Fuentes con parche reproducible:** usar pnpm patch sobre la versión exacta. Importar `aos/src/js/aos.js` desde `src/init.js`, retirando únicamente el import SCSS interno de AOS mediante parche. Mantener inicialmente las importaciones CSS dist actuales. Evita copiar toda la librería y parchear bundles. Registrar el parche en `patches/aos@3.0.0-beta.6.patch` y su configuración en `pnpm-workspace.yaml`; conservar MIT y procedencia. Sin dependencias/toolchain nuevas.
3. **Separar procedencia y corrección:** 04 cambia al módulo fuente sin optimizarlo; 05 corrige listeners. Si compilar fuente altera el comportamiento, resolverlo antes de acumular optimizaciones. Comprobar primero que el cacheGroup AOS actual reconoce el fuente; no modificar webpack por anticipado.
4. **CSS conservador:** evaluar compactar el SCSS original mediante variables de duración/retraso, manteniendo selectores, fases y precedencia global/individual. Aislar variables entre bloques anidados. Evitar nuevos atributos, cambios de PHP/preview y dependencia exclusiva de attr() tipado. Si no compensa o cambia la cascada, conservar CSS original.
5. **Carga y caché:** conservar handles, filtros, condicionales y defer; vincular la versión de `aos.js` a su contenido. No fusionar bundles ni añadir carga por viewport sin evidencia.
6. **Modernización condicionada:** estudiar IO, Scroll/View Timelines, WAAPI, RAF/throttle, arranque y propiedades animadas contra el contrato. Una API reciente no demuestra una mejora. Cambios observables o de soporte se presentan aparte.

Se verificaron las opciones de pnpm 10.24.0 con su ayuda local y documentación oficial: [patch](https://pnpm.io/10.x/cli/patch), [patch-commit](https://pnpm.io/10.x/cli/patch-commit), [configuración](https://pnpm.io/10.x/settings). No cambiar las dependencias internas de AOS mediante el parche ni permitir ignorar fallos de aplicación.

## Dependencias y checkpoints

```text
01 Control/entorno → 02 Contratos → 03 Baseline medido → revisión A
04 Fuentes originales → 05 Listener único            → revisión B
06 Mutaciones → 07 Recorrido de scroll               → revisión C
08 CSS compacto → 09 Carga/caché                     → revisión D
10 Alternativas modernas → 11 Aceptación integrada   → revisión E
12 Informe/build/entrega                             → revisión final
```

06–08 deben evaluarse, pero solo conservan un diff de producción si los perfiles de 03 y la compatibilidad lo justifican. Registrar descartes razonados. 10 no implica introducir un segundo motor de producción.

CSS y carga podrían investigarse independientemente tras 03. Aplicación de parches, lockfile, builds y mediciones serán secuenciales para aislar efectos. No se requieren agentes ni sesiones paralelas.

## Comandos previstos

Estos comandos son para ejecución posterior a la revisión del plan. No se ha creado todavía el runner de 02/03.

### Control (01)

Desde la raíz del candidato, crear una carpeta nueva y registrar su ruta:

```sh
export ANFB_AOS_AUDIT="$(mktemp -d /private/tmp/anfb-aos-optimization.XXXXXX)"
mkdir -p "$ANFB_AOS_AUDIT/control" "$ANFB_AOS_AUDIT/results"
git archive b59ecb3867c7d1f7bd398bc3d41cfefc52e27a42 | tar -x -C "$ANFB_AOS_AUDIT/control"
corepack pnpm --dir "$ANFB_AOS_AUDIT/control" install --frozen-lockfile
npm --prefix "$ANFB_AOS_AUDIT/control" run build
npm --prefix "$ANFB_AOS_AUDIT/control" test
```

Guardar hashes antes/después del build, versiones de Node/pnpm/navegador/hardware y límites. Identificar sitios desechables y comprobar `ANFB_TEST_SITE` efectivo antes de fixtures. No basta una variable de entorno. Si cambia el entorno, repetir ambas variantes.

### Contratos y benchmark (02/03)

Un runner con Playwright instalado y HTTP local sirve los bundles reales de ambas carpetas. Reutilizar CHROME_PATH del proyecto:

```sh
node tests/aos-browser.cjs --mode contract --control "$ANFB_AOS_AUDIT/control" --candidate "$PWD" --output "$ANFB_AOS_AUDIT/results/contracts"
node tests/aos-browser.cjs --mode benchmark --control "$ANFB_AOS_AUDIT/control" --candidate "$PWD" --output "$ANFB_AOS_AUDIT/results/benchmark"
```

`--browser firefox` y `--browser webkit` permiten contratos adicionales si sus binarios existen. Chromium por omisión; Safari real se identifica aparte. Fotogramas y estilos computados pertenecen al modo contract.

Benchmark base: 0/30/100/500 elementos, 1000 de estrés; 1280×800/390×844; CPU normal/×4; calentamiento y cinco muestras por caso/variante alternando orden. Medir ready de AOS, duración de descarga JS, refresh y respuesta a scroll; tamaños raw/gzip del bundle. Conservar muestras, mediana/p95 y definiciones. Primero control contra control para cuantificar ruido. Medición de mutaciones concentrada en tarea 06; waterfall/HTTP real, reposo y perfiles de scripting/layout/paint requieren instrumentación focalizada y se completan cuando exista sitio desechable.

Las aserciones del candidato son criterios absolutos y comparaciones justificadas. Enumerar defectos conocidos del control: no considerarlos aceptación ni usar una condición genérica que tolere cualquier fallo. Un JSON informativo no certifica compatibilidad.

### Parche de fuentes (04 y siguientes)

```sh
corepack pnpm patch aos@3.0.0-beta.6 --edit-dir "$ANFB_AOS_AUDIT/aos-edit"
```

Editar solo los fuentes de esa copia temporal y conservar MIT. Después:

```sh
corepack pnpm patch-commit "$ANFB_AOS_AUDIT/aos-edit" --patches-dir patches
corepack pnpm install --frozen-lockfile
npm run build
npm test
```

Para otra edición usar una carpeta nueva, conservando el parche existente; no usar ignore-existing. Revisar diff acumulado y hash del lockfile. Verificar también instalación congelada limpia. El original de control conserva su propia instalación sin parches.

### WordPress (09/11)

Usar comandos de integración de la spec con rutas/URL/ID reales registrados por 01. Requiere sitios desechables con `ANFB_TEST_SITE` efectivo y GenerateBlocks compatible. Ejecutar tests/content.php, nuevo tests/aos-assets.php, CLI, tests/fixture.php y npm run test:browser. En tests/aos-assets.php usar procesos separados para escenarios afectados por variables estáticas PHP. Restaurar opciones y eliminar fixtures/copias tras medir.

### Cierre local

```sh
npm test
npm run build
php -l animations-for-blocks.php
php -l tests/aos-assets.php
git diff --check
```

Añadir php -l por cualquier otro PHP modificado. No hay script lint propio. No actualizar dependencias/Browserslist para alterar el baseline; comparar diagnósticos TypeScript heredados si se usa esa comprobación.

## Riesgos y mitigación

| Riesgo | Mitigación / salida |
| --- | --- |
| Control contaminado por el candidato | Instalación independiente, manifest y hashes. |
| Fuente cambia bundle o duplica CSS | Introducción separada en 04, contratos reales y análisis de chunks; CSS dist hasta 08. |
| Reinit acumula eventos o cambia throttle/startEvent | Listener/observador únicos, cancelar trabajo pendiente y cubrir load/resize/reinit. |
| Agrupación DOM pierde o retrasa elementos | Añadidos/retirados/reemplazos/nodos anidados; mantener alcance del observador original. |
| Variables heredan tiempos de padres | Probar global/local/anidado/ausencia/cero/motor externo; descartar si difiere. |
| Ahorro CSS con más coste de init/HTML/editor | Medir coste total y gzip, sin mover el objetivo después del resultado. |
| Arranque oculta contenido o elimina transición | Fotogramas y fallo/reducido/sin JS con plazo de liberación. |
| IO/rectángulos cambian umbral | Layout sin transform y latencia aparte; no adoptar semántica distinta. |
| Matriz mínima no disponible | Descubrir/provisionar desechables cuando sea posible; registrar ausencias sin afirmar cobertura completa. |

Metas aprobadas: listener único; objetivo experimental de 25% menos CSS AOS gzip o 20% menos scripting mediano AOS en 500 elementos/refrescos. Informar ambos y sus costes. Investigar regresiones reproducibles superiores al 10%, con tiempos absolutos/dispersión. No convertir una corrección en una afirmación de FPS no medidos.

## Revisión, Definition of Done y reversión

- Checkpoints cada 2–3 tareas: pruebas/build pertinentes, resultados y revisión humana de decisiones antes del siguiente bloque. Un fallo se corrige o descarta antes de avanzar.
- Por corrección: regresión que falla sin ella, ejecución real pertinente, pruebas existentes, build generado y diff revisado. Por estudio: evidencia o rechazo razonado; no inventar implementación para cerrar la tarea.
- Aplicar Definition of Done del entorno: corrección, calidad, integración, documentación y reversión. Sin telemetría de producción para un estudio local.
- Tareas de aproximadamente cinco archivos fuente/config/prueba como máximo; build generado y actualización mecánica de hashes del lockfile se revisan aparte. Subdividir antes de ampliar lógica.
- Commit por incremento. Revertir solo el incremento propio que falle tras revisar el árbol; no resetear trabajo ajeno. `skills/` y AOSIO quedan fuera del diff.
- Entrega con informe, muestras, decisiones, límites y procedencia MIT. Sin merge/publicación/despliegue automático.

## Preguntas pendientes

01–03 establecen el entorno y la línea base sintética. El usuario aprobó continuar; checkpoint A se considera satisfecho para correcciones de bajo riesgo como listeners. Métricas que requieren un sitio desechable, navegadores adicionales o traza de CPU siguen pendientes y se completan antes de las decisiones pertinentes en 06/09/11.
