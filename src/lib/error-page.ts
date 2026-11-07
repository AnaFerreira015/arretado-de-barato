export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Não foi possível carregar a página</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #FAF7F2; color: #253744; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #586570; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      a, button { min-height: 44px; box-sizing: border-box; }
      :focus-visible { outline: 3px solid #A24D34; outline-offset: 3px; }
      .primary { background: #234F6B; color: #fff; }
      .secondary { background: #fff; color: #253744; border-color: #7D898F; }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>Não foi possível carregar a página</h1>
      <p>Ocorreu um problema ao carregar a página. Tente novamente ou volte para o início.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Tentar novamente</button>
        <a class="secondary" href="/">Voltar ao início</a>
      </div>
    </main>
  </body>
</html>`;
}
