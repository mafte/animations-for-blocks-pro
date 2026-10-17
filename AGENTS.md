# Animations for Blocks

Para desarrollar o extender el plugin, lee primero [docs/development.md](docs/development.md). Conserva sus reglas de interfaz, traducción y compatibilidad; ampliar animaciones no implica rediseñar los controles. Los textos fuente de interfaz van en inglés, con traducción de WordPress y dominio `animations-for-blocks`.

Para animar una página desde Codex, lee primero [docs/codex.md](docs/codex.md). Usa los comandos `wp anfb` de la instalación WordPress correcta; esta carpeta contiene el plugin, no el sitio. No hace falta editar el código del plugin para ajustar una página.

- Obtén rutas y hash con `inspect`; no adivines índices ni reemplaces páginas con HTML reconstruido.
- Simula el lote antes de aplicarlo y conserva la copia privada. Revisa Gutenberg y el resultado visual.
- Para desarrollar el plugin, modifica `src/` y recompila con `npm run build`; entrega también `build/`.
- Conserva WordPress 6.6 / PHP 8.1 y los bloques existentes. Los adaptadores de texto admitidos están en `includes/animation-schema.json`.
- Consulta [docs/testing.md](docs/testing.md) para las pruebas. Las que crean contenido requieren un sitio desechable con `ANFB_TEST_SITE` habilitado.
