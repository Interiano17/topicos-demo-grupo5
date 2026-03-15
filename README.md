# simulador-recs

Web app didactica para simular algoritmos de recomendacion en tiempo real con Next.js + Supabase + Vercel.

## Stack

- Next.js 14 (App Router) + TypeScript estricto
- Supabase (Postgres + Realtime)
- Vercel Serverless Functions (`pages/api`)
- Motor hibrido: filtrado colaborativo + fallback content-based
- Cytoscape.js para grafo de similitud en `/admin`
- Jest para unit/integration tests
- ESLint + Prettier + Husky + lint-staged
- GitHub Actions para CI

## Estructura

```text
/simulador-recs
├─ .github/workflows/ci.yml
├─ README.md
├─ package.json
├─ tsconfig.json
├─ next.config.js
├─ .eslintrc.js
├─ .prettierrc
├─ .env.example
├─ scripts/
│  └─ seed_movies.sql
├─ src/
│  ├─ app/
│  │  ├─ page.tsx
│  │  ├─ select/page.tsx
│  │  ├─ results/page.tsx
│  │  └─ admin/page.tsx
│  ├─ components/
│  │  ├─ JoinForm.tsx
│  │  ├─ GenreSelector.tsx
│  │  ├─ MovieGrid.tsx
│  │  ├─ RecommendationsCard.tsx
│  │  ├─ AdminGraph.tsx
│  │  ├─ Header.tsx
│  │  └─ Footer.tsx
│  ├─ lib/
│  │  ├─ supabaseClient.ts
│  │  └─ recommendationEngine.ts
│  ├─ pages/
│  │  └─ api/
│  │     ├─ generate-recommendations.ts
│  │     ├─ admin-clear.ts
│  │     └─ admin-load-demo.ts
│  ├─ styles/
│  │  └─ globals.css
│  └─ tests/
│     ├─ engine.test.ts
│     └─ api.test.ts
```

## Variables de entorno

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Completa:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE=
NEXT_PUBLIC_VERCEL_URL=
ADMIN_KEY=
MIN_USERS_FOR_CF=5
CF_WEIGHT=0.7
CB_WEIGHT=0.25
POPULARITY_WEIGHT=0.05
SIMILARITY_THRESHOLD=0.3
TOP_K_RECOMMEND=5
```

Importante:

- `SUPABASE_SERVICE_ROLE` solo debe existir en entorno serverless (Vercel o backend local), nunca en cliente.
- Para demo academica puedes iniciar sin RLS, pero en produccion debes habilitar RLS y politicas por tabla.

## Setup local

1. Instala dependencias:

```bash
npm install
```

2. Ejecuta SQL base y seed en Supabase SQL Editor con `scripts/seed_movies.sql`.

3. Inicia desarrollo:

```bash
npm run dev
```

4. Abre:

- `http://localhost:3000/` (participantes)
- `http://localhost:3000/admin` (panel admin)

## Flujo de demo

1. Participante entra en `/`, ingresa nombre y obtiene usuario temporal (`users_temp`).
2. En `/select`, elige generos y peliculas; se guardan en `user_genres` y `user_movie_choices`.
3. En `/results`, ve estado en vivo y espera recomendaciones; puede calcular una provisional local.
4. Admin en `/admin` observa usuarios y grafo de similitud en tiempo real.
5. Admin pulsa `Generar recomendaciones` para ejecutar `POST /api/generate-recommendations` protegido por `x-admin-key`.
6. Se insertan resultados en `recommendations` con `version` incremental y explicaciones en espanol.

## Endpoint principal

`POST /api/generate-recommendations`

- Header requerido: `x-admin-key: <ADMIN_KEY>`
- Lee `users_temp`, `user_genres`, `user_movie_choices`, `movies`
- Ejecuta motor en `src/lib/recommendationEngine.ts`
- Inserta en `recommendations` con `version + 1`
- Respuesta: `{ ok: true, processed, version }`

## Motor de recomendaciones

Archivo: `src/lib/recommendationEngine.ts`

Funciones exportadas:

- `buildUserVectors`
- `cosineSimilarity`
- `computeCFScore`
- `computeCBScore`
- `normalize`
- `generateRecommendationsForAll`

Reglas principales:

- Si hay pocos usuarios (`MIN_USERS_FOR_CF`) usa fallback CB + popularidad.
- Combina score final: `w_cf * CF + w_cb * CB + w_pop * popularidad`.
- Excluye peliculas ya elegidas por el usuario.
- Devuelve explicaciones legibles con razones `genre_match`, `similar_users`, `tag_overlap`, `popularity`, `fallback_content_based`.

## Calidad y pruebas

Comandos:

```bash
npm run lint
npm run test
npm run build
```

Husky + lint-staged:

- Pre-commit ejecuta `lint-staged`.

CI GitHub Actions (`.github/workflows/ci.yml`):

- `npm ci`
- `npm run lint`
- `npm run test`
- `npm run build`

## Deploy en Vercel + Supabase

1. Crea proyecto en Supabase y ejecuta `scripts/seed_movies.sql`.
2. Crea proyecto en Vercel y conecta el repositorio GitHub.
3. Define env vars en Vercel (incluyendo `SUPABASE_SERVICE_ROLE` y `ADMIN_KEY`).
4. Push a GitHub para disparar CI y deploy automatico.
5. Valida con `/admin` y genera recomendaciones.

## Checklist QA

- [ ] Crear usuario temporal y persistir `sim_user_id` en localStorage.
- [ ] Guardar generos/peliculas en Supabase.
- [ ] Ver actualizaciones realtime en contador y admin.
- [ ] Generar recomendaciones con endpoint protegido.
- [ ] Insertar `recommendations` con `version` y `explanation`.
- [ ] Mostrar recomendaciones en espanol en `/results`.
- [ ] `npm run lint`, `npm run test`, `npm run build` correctos.
