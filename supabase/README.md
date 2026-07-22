# Backend movido

Migrations e edge functions foram consolidados em:

**https://github.com/santo-encontro/backend**

Clone e trabalhe lá:

```bash
git clone git@github.com:santo-encontro/backend.git
cd backend
npx supabase link --project-ref eiqohrnjpytwrhsokpqc
```

Deploy:

```bash
./scripts/deploy-functions.sh
npx supabase db push
```
