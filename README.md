# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

# user-account

## Recuperação de senha (reset) – erro 500 no Supabase

Se o fluxo de “Esqueci minha senha” retornar **HTTP 500** (`unexpected_failure`) no endpoint `/auth/v1/recover`, verifique no **Supabase Dashboard**:

1. **Authentication → URL Configuration**
   - Em **Redirect URLs**, adicione a URL usada pelo app (o `redirectTo` enviado na requisição).
   - Desenvolvimento: `http://localhost:5173/**` (ou a porta que você usa).
   - Produção: `https://seu-dominio.com/**`.
   - O valor exato enviado em dev costuma ser `http://localhost:5173/?type=recovery`; com `**` na lista, qualquer path/query nessa origem é aceito.
   - **Produção:** use `https://app.santoencontro.com/**`. O app envia `?type=recovery` (query). Se no log aparecer `#type=recovery` (hash), é deploy antigo — faça redeploy para passar a usar query e evitar 500.

2. **Authentication → Email Templates**
   - Confira se o template de “Reset password” (recovery) está válido: sem variáveis não fechadas (ex.: `{{ .TokenHash }}`) e sem caracteres que quebrem o envio.

3. **SMTP / envio de email**
   - Se usar SMTP customizado (Authentication → Providers → Email), confira se está configurado e funcionando. Falhas de envio podem resultar em 500.
   - [Doc: Resolving 500 Status Authentication Errors](https://supabase.com/docs/guides/troubleshooting/resolving-500-status-authentication-errors-7bU5U8)

4. **Logs no Supabase (causa real do 500)**
   - Abra [Log Explorer](https://supabase.com/dashboard/project/eiqohrnjpytwrhsokpqc/logs/explorer).
   - Selecione a tabela **auth_logs** (ou o tipo "Auth").
   - Cole e execute esta query para ver erros 500 e a mensagem real:

   ```sql
   select
     cast(metadata.timestamp as datetime) as timestamp,
     msg,
     event_message,
     status,
     path,
     level
   from auth_logs
   cross join unnest(metadata) as metadata
   where status::INT = 500
      or regexp_contains(level, 'error|fatal')
   order by timestamp desc
   limit 50;
   ```

   - O campo `msg` ou `event_message` costuma trazer o motivo (ex.: SMTP, template, redirect).
   - Se não houver linhas em `auth_logs`, verifique também **postgres_logs** com a query do [guia de 500](https://supabase.com/docs/guides/troubleshooting/resolving-500-status-authentication-errors-7bU5U8) (erros do `supabase_auth_admin`).
