# Plan: evaluación de AOSIO

Estado: propuesto para revisión humana; implementación sin iniciar.
Spec aprobada: [SPEC-aosio-evaluation.md](../SPEC-aosio-evaluation.md).
Rama: `codex/aosio-evaluation`. Control: `b59ecb3867c7d1f7bd398bc3d41cfefc52e27a42`.
Tareas y checkpoints: [todo.md](todo.md).

## Objetivo
Probar AOSIO como sustituto del AOS actual, contrastar el contrato del plugin y medir mejoras/regresiones con evidencia reproducible. Una recomendación negativa es válida si identifica sus motivos; no equivale a omitir pruebas sin declararlo.

El plan anterior estaba completo. Se conservó byte por byte en [plan anterior](completed/2026-10-19-wordpress-animation-skill-plan.md) y [tareas anteriores](completed/2026-10-19-wordpress-animation-skill-todo.md). No incluir `skills/` en los cambios de AOSIO.

## Decisiones
- Resolver primero SHA, fechas reales, licencia/atribuciones y build del fork. El usuario autorizó usar el ZIP solo para evaluación local privada; antes de publicación/redistribución debe aclararse la licencia. `private: true` no determina por sí solo los permisos. No depender de rama móvil, CDN ni descargas en ejecución.
- Preservar control inmutable con fuente, lockfile, bundles y hashes en `/private/tmp/anfb-aosio-evaluation/control/`. Fork, candidato y resultados en directorios hermanos. Documentar reproducción; no depender únicamente de archivos temporales.
- Reutilizar `src/init.js`, handles `animate-on-scroll`/`animations-for-blocks`, filtros PHP, `window.AOS` y `window.anfbAosSettings`. No añadir selector público de motores, infraestructura de registro ni otro framework.
- La primera prueba JS puede conservar el CSS original para aislar la API. La integración completa debe evaluar expresamente el CSS candidato y contabilizar cualquier CSS original necesario; distinguir las configuraciones en resultados.
- Gutenberg aplica clases/atributos sin ejecutar AOS en el canvas. Verificar duración/retraso/easing porque AOSIO asigna variables desde su JS. Conservar Scale, Curtain, distancias responsive y estados de compatibilidad por atributos.
- Preservar persistencia, HTML guardado, esquema, rangos, CLI v1 y todas las funciones públicas. Cambiar consumidores solo cuando una prueba demuestre necesidad.
- Añadir un único runner Playwright y una fixture compartida para contrato diferencial/medición; reutilizar Jest, Node/PHP y fixtures existentes. Nada de instrumentación en el frontend distribuido.
- Diferenciar fork sin modificar y candidato adaptado. Registrar cada corrección y su coste; no editar `node_modules` ni bundles. Regenerar `build/` tras cambios de fuente y revisar sus diferencias por lotes de hasta cinco artefactos si son numerosos.

## Dependencias y orden
```text
T1 Procedencia y entorno
 └─ T2 Control reproducible y runner
     └─ Checkpoint A
         └─ T3 Primera entrada candidata
             └─ T4 CSS y previsualización
                 └─ Checkpoint B
                     └─ T5 Scroll/API
                         └─ T6 Visibilidad/carga/Lenis
                             └─ Checkpoint C
                                 └─ T7 WordPress completo
                                     └─ T8 Mediciones A/B
                                         └─ Checkpoint D
                                             └─ T9 Informe y entrega
```

T1 puede conducir directamente a T9 si procedencia/licencia/build impiden integrar. T5 y T6 tienen verificaciones independientes pero comparten fixture/bootstrap: ejecutar secuencialmente. T8 espera una integración estable; cualquier corrección posterior invalida las mediciones afectadas. No se necesita delegación.

Checkpoint C también puede producir una recomendación negativa temprana si el contrato central falla de forma reproducible. En esa ruta, T7 y el benchmark formal T8 quedan pendientes explícitos; el informe puede comparar el tamaño de recursos, pero no afirmar mejoras de CPU o fluidez.

## Comandos y evidencia
Comandos existentes: `corepack pnpm install --frozen-lockfile`, `npm test`, `npm run build` y lint PHP; integración conforme a la spec y `docs/testing.md`: `tests/content.php`, `tests/persistence.php`, `tests/migration.php`, `tests/cli.py`, fixture y `npm run test:browser`. Solo sitios desechables con `ANFB_TEST_SITE=true`; nunca instalaciones de clientes.

Se propone crear `tests/aos-engine.cjs` y `tests/aos-engine.html` en T2. Estos comandos describen el runner futuro, todavía inexistente:
```sh
ANFB_CONTROL_BUILD=/private/tmp/anfb-aosio-evaluation/control/build ANFB_CANDIDATE_BUILD=/private/tmp/anfb-aosio-evaluation/candidate/build ANFB_RESULTS_DIR=/private/tmp/anfb-aosio-evaluation/results node tests/aos-engine.cjs --mode=compatibility
ANFB_CONTROL_BUILD=/private/tmp/anfb-aosio-evaluation/control/build ANFB_CANDIDATE_BUILD=/private/tmp/anfb-aosio-evaluation/candidate/build ANFB_RESULTS_DIR=/private/tmp/anfb-aosio-evaluation/results node tests/aos-engine.cjs --mode=benchmark
```
El runner sirve su fixture en loopback y verifica visibilidad final, timeouts y errores. Primero ejecutar control contra control para validar instrumento y determinismo. Documentar los comandos efectivamente implementados; no añadir dependencias para métricas accesibles mediante Playwright/CDP o Node.

Compatibilidad: WordPress 6.6/PHP 8.1 y un WordPress reciente, GenerateBlocks compatible; Chromium escritorio/viewport móvil. Intentar Firefox/WebKit disponibles; entorno no ejecutado queda pendiente y emulación móvil no representa hardware real. Revisar Gutenberg real y frontend con capturas/estilos/fotogramas; los mocks de controles no certifican comportamiento visual.

Rendimiento: 20/100/500 elementos; un calentamiento por motor/escenario y >=5 corridas medidas por motor, alternadas. Mismo contenido, viewport, hardware, caché, scroll, duración, pausas y throttling. Medir reposo/inicio/scroll por separado, primero aislado y luego en WordPress; Lenis activo se compara en escenario separado.

Medir scripting/layout por deltas/trazas, tareas largas >50 ms, p95 de intervalos entre frames, porcentaje >1,5 veces el intervalo de refresco medido y bytes/gzip efectivos de JS/CSS. Registrar instrumentación y su coste por igual en ambos motores; conservar JSON/trazas con versiones, hashes y configuración. Informar mediana y dispersión, valores absolutos y porcentajes; no calcular porcentajes con denominadores no útiles.

Umbrales de la spec: diferencia geométrica <=5 CSS px, separada de latencia del callback; mejora relevante >=20% de scripting con 100 y 500 elementos, mayor que dispersión; investigar regresiones >10% en inicio/scripting/layout/p95 también mayores que variación. Registrar resultados negativos/inconclusos; no inferir ahorro de batería ni callbacks fuera del hilo principal por usar IntersectionObserver.

## Riesgos y mitigaciones
| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Licencia/build incompletos | Candidato no distribuible/reproducible | Resolver en T1; informe de bloqueo sin incorporar dependencia si no se aclara |
| Diferencias de offset/mirror/anclajes/elementos altos | Entradas distintas o contenido oculto | Línea base T2 y matriz geométrica T5 antes de rendimiento |
| CSS candidato depende de variables JS | Previsualización con tiempos/curvas incorrectos | T4 verifica estilos computados y movimiento real sin motor en editor |
| Mutaciones propias causan refresh continuo | CPU/acumulación de observadores | T5 prueba inserción/eliminación, refresh repetido y estabilización en reposo |
| Fallo silencioso del motor | Bootstrap deja contenido oculto | T6 verifica visibilidad, recurso bloqueado e IntersectionObserver ausente |
| Adaptación extensa | Mantener un fork propio | Registrar coste y detener rediseño no autorizado; compatibilidad puede fallar |
| Runtimes/iframe inaccesibles | Verificación parcial | Sitio desechable y navegador adecuado; declarar pendientes sin certificarlos |
| Ruido o condiciones distintas | Mejoras aparentes | Control inmutable, corridas alternadas, mismos instrumentos y dispersión |

## Checkpoints y límites
Plan y tareas requieren revisión humana antes de implementación, según la skill solicitada. Los checkpoints registran resultados y detienen el avance si aparecen bloqueos, regresiones de contenido o decisiones fuera de alcance; no requieren permisos repetidos para trabajo ya aprobado. Revisar con el usuario los resultados antes de decidir adopción; merge/publicación siguen fuera de alcance.

Comprobar retorno al control en copia independiente; nunca `reset --hard` ni revertir cambios ajenos. No actualizar dependencias ajenas, Lenis, tema, interfaz o contenido real. Aplicar la Definition of Done de la skill ajustada a estas pruebas: evidencia real, error paths, compatibilidad, documentación y rollback; ninguna prueba pendiente cuenta como aprobada.

## Preguntas abiertas
No hay preguntas de producto que impidan planificar. T1 resuelve SHA/licencia/instalación y disponibilidad de runtimes; T2 valida instrumentación. Si esos datos cambian el alcance, actualizar spec y presentar la decisión concreta antes de implementarla.
