CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.genres (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.movies (
  id serial PRIMARY KEY,
  title text NOT NULL,
  genre_id integer REFERENCES public.genres(id) ON DELETE SET NULL,
  tags text[] DEFAULT '{}',
  popularity integer DEFAULT 0,
  image_url text
);

ALTER TABLE public.movies
ADD COLUMN IF NOT EXISTS image_url text;

CREATE TABLE IF NOT EXISTS public.users_temp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_genres (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES public.users_temp(id) ON DELETE CASCADE,
  genre_id integer REFERENCES public.genres(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.user_movie_choices (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES public.users_temp(id) ON DELETE CASCADE,
  movie_id integer REFERENCES public.movies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recommendations (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES public.users_temp(id) ON DELETE CASCADE,
  generated_at timestamptz DEFAULT now(),
  version integer NOT NULL,
  items int[] NOT NULL,
  explanation jsonb
);

INSERT INTO public.genres (name) VALUES
('Accion'),
('Ciencia ficcion'),
('Comedia'),
('Terror'),
('Romance'),
('Animacion')
ON CONFLICT DO NOTHING;

INSERT INTO public.movies (title, genre_id, tags, popularity) VALUES
('John Wick', 1, ARRAY['venganza','accion','thriller'], 95),
('Mad Max: Fury Road',1, ARRAY['post-apocaliptico','accion','vehiculos'], 91),
('Mission: Impossible - Fallout',1, ARRAY['accion','espionaje','stunts'], 88),
('The Dark Knight',1, ARRAY['superheroes','accion','thriller'], 99),
('Gladiator',1, ARRAY['historia','accion','drama'], 85),
('Die Hard',1, ARRAY['accion','thriller','clasico'], 84),
('The Raid',1, ARRAY['accion','artes marciales','intenso'], 82),
('Casino Royale',1, ARRAY['espionaje','accion','007'], 83),
('Edge of Tomorrow',1, ARRAY['accion','sci-fi','bucle temporal'], 86),
('Jurassic Park',1, ARRAY['accion','aventura','dinosaurios'], 94),

('Interstellar',2, ARRAY['espacio','drama','viaje temporal'], 97),
('Dune',2, ARRAY['espacio','epico','politica'], 90),
('The Matrix',2, ARRAY['realidad','accion','filosofia'], 98),
('Blade Runner 2049',2, ARRAY['distopia','futuro','visual'], 87),
('Arrival',2, ARRAY['idioma','ciencia','misterio'], 84),
('Ex Machina',2, ARRAY['ai','ethical','psicologico'], 81),
('The Martian',2, ARRAY['supervivencia','espacio','humor'], 80),
('Minority Report',2, ARRAY['futuro','thriller','accion'], 83),
('Avatar',2, ARRAY['fantasia','visual','ecologia'], 92),
('Her',2, ARRAY['ai','drama','romance'], 79),

('Superbad',3, ARRAY['amistad','adolescentes','comedia'], 85),
('The Hangover',3, ARRAY['comedia','amigos','aventura'], 90),
('Mean Girls',3, ARRAY['comedia','adolescentes','drama ligero'], 88),
('Step Brothers',3, ARRAY['absurdo','comedia','familia'], 80),
('The Mask',3, ARRAY['fantasia','comedia','clasico'], 83),
('Groundhog Day',3, ARRAY['comedia','bucle','romantico'], 86),
('Anchorman',3, ARRAY['satira','comedia','periodismo'], 78),
('Zombieland',3, ARRAY['comedia','accion','zombies'], 84),
('Hot Fuzz',3, ARRAY['parodia','accion','comedia'], 81),
('The Big Lebowski',3, ARRAY['culto','comedia','misterio'], 82),

('The Conjuring',4, ARRAY['sobrenatural','casa','sustos'], 91),
('Hereditary',4, ARRAY['psicologico','drama','sobrenatural'], 80),
('A Quiet Place',4, ARRAY['suspense','silencio','familia'], 86),
('Get Out',4, ARRAY['terror','social','thriller'], 93),
('It',4, ARRAY['supernatural','clown','infantilterror'], 82),
('The Babadook',4, ARRAY['psicologico','maternidad','monstruo'], 75),
('The Ring',4, ARRAY['misterio','sobrenatural','clasico'], 77),
('The Exorcist',4, ARRAY['sobrenatural','clero','clasico'], 85),
('Sinister',4, ARRAY['misterio','sobrenatural','documentos'], 74),
('Insidious',4, ARRAY['sobrenatural','casa','psicologico'], 76),

('Titanic',5, ARRAY['historia','romance','drama'], 99),
('The Notebook',5, ARRAY['romance','drama','literatura'], 86),
('La La Land',5, ARRAY['musical','romance','musica'], 90),
('Pride and Prejudice',5, ARRAY['periodo','romance','drama'], 83),
('Before Sunrise',5, ARRAY['romance','dialogo','intimo'], 84),
('Eternal Sunshine of the Spotless Mind',5, ARRAY['romance','surreal','drama'], 88),
('Her (romance sci-fi)',5, ARRAY['ai','romance','drama'], 79),
('500 Days of Summer',5, ARRAY['romcom','drama','relaciones'], 81),
('Notting Hill',5, ARRAY['romcom','comedia','fama'], 82),
('About Time',5, ARRAY['romance','tiempo','familia'], 83),

('Toy Story',6, ARRAY['familia','aventura','infantil'], 98),
('Shrek',6, ARRAY['fantasia','comedia','familia'], 95),
('Spider-Man: Into the Spider-Verse',6, ARRAY['superheroes','animacion','visual'], 97),
('Inside Out',6, ARRAY['emociones','familia','drama ligero'], 96),
('Coco',6, ARRAY['familia','cultura','musical'], 94),
('How to Train Your Dragon',6, ARRAY['aventura','fantasia','amistad'], 90),
('The Incredibles',6, ARRAY['superheroes','familia','accion'], 93),
('Kubo and the Two Strings',6, ARRAY['fantasia','aventura','visual'], 78),
('Wall-E',6, ARRAY['ai','romantico','futuro'], 92),
('Up',6, ARRAY['aventura','emotivo','familia'], 95)
ON CONFLICT DO NOTHING;
