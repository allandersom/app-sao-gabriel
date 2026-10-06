# São Gabriel — solicitações e controle de caixas

Aplicativo web instalável para autorizações, pedidos do comercial e controle simplificado de caçambas.

Aplicação publicada: https://saogabriel-sgc-soli.web.app

## Arquivos principais

- `app-sao-gabriel/index.html`: empresas, autorizações, validade e acesso.
- `app-sao-gabriel/estoque-simples.js`: caixas por cliente, caminhão e usina, última troca e confirmação da conferência.
- `app-sao-gabriel/comercial.js`: pedidos e anexos do comercial.
- `app-sao-gabriel/firestore.rules`: permissões de leitura e edição.
- `app-sao-gabriel/sw.js` e `manifest.webmanifest`: instalação e cache do aplicativo.
- `supabase-*.sql`: configuração do banco de pedidos e anexos. Conferir o estado do banco antes de executar; nem todos os scripts precisam ter sido aplicados.
- `check-*.cjs` e `check-*.mjs`: verificações locais. Alguns testes antigos refletem telas anteriores e usam o caminho local do Playwright.

## Publicação

O site usa Firebase Hosting no projeto `saogabriel-sgc-soli`. Dentro de `app-sao-gabriel`, com Firebase CLI instalado e autenticado:

```sh
firebase deploy --only hosting --project saogabriel-sgc-soli
```

Quando houver alterações nas regras:

```sh
firebase deploy --only firestore:rules,hosting --project saogabriel-sgc-soli
```

O GitHub Pages publica automaticamente alterações em `app-sao-gabriel/` enviadas à branch `main`, pelo workflow `.github/workflows/pages.yml`.

Endereço do Pages: https://allandersom.github.io/app-sao-gabriel/

O Firebase Hosting continua disponível e exige a publicação manual descrita acima. Ambos usam o mesmo banco de dados.

## Acesso e dados

O controle de caixas permite leitura pública pelo link. Apenas o administrador definido no código e nas regras pode editar. Pedidos comerciais e anexos têm permissões próprias.

As configurações Firebase de cliente e a chave publicável do Supabase são usadas pelo navegador. Não adicionar senhas, tokens pessoais, contas de serviço ou chaves privadas ao repositório.

Este repositório guarda o código e as configurações. Os cadastros, quantidades, solicitações e anexos permanecem no Firebase/Supabase; o GitHub não é um backup desses dados.
