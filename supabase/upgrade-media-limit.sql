-- Ejecutar una vez en el SQL Editor del proyecto Supabase existente.
-- Permite imágenes de hasta 50 MiB en los carruseles y demás módulos del sitio.
update storage.buckets
set file_size_limit = 52428800
where id = 'site-media';
