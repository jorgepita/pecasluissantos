-- Storage foundation for product photos.
--
-- Public bucket: reads happen via Supabase Storage's public-URL path with
-- no auth required, matching product_images_select's intent (anyone can
-- view an available product's images). Writes (upload/replace/delete) are
-- still gated by the RLS policies below, restricted to admins — a public
-- bucket only affects the read path, not storage.objects RLS.
--
-- File type/size limits are enforced at the bucket level. This depends on
-- the Storage version deployed on the target project; verify the bucket's
-- `file_size_limit`/`allowed_mime_types` after applying (see
-- docs/DATABASE.md "Live verification").
--
-- `on conflict (id) do nothing` makes this safe to apply even if the
-- bucket was already created manually (e.g. via the dashboard) before this
-- migration ran.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "product_images_bucket_select_public"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'product-images');

create policy "product_images_bucket_insert_admin"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "product_images_bucket_update_admin"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "product_images_bucket_delete_admin"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
