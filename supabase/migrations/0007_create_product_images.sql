-- Product photos. Binary image data lives in Supabase Storage (bucket
-- `product-images`, created in 0009_create_product_images_storage_bucket.sql)
-- — this table only stores pointers (`storage_path`) plus display
-- metadata. See docs/ARCHITECTURE.md ("Storage approach").

create table public.product_images (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint product_images_product_storage_path_key unique (product_id, storage_path)
);

-- At most one primary image per product, enforced with a partial unique
-- index rather than application logic.
create unique index product_images_one_primary_per_product
  on public.product_images (product_id)
  where is_primary;

create index product_images_product_id_idx on public.product_images (product_id);

alter table public.product_images enable row level security;

-- Images are only publicly visible if their product is (mirrors
-- products_select). Admins see every product's images regardless of
-- status, for management purposes.
create policy "product_images_select"
  on public.product_images
  for select
  to anon, authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.products p
      where p.id = product_images.product_id
        and p.status = 'available'
    )
  );

create policy "product_images_insert_admin"
  on public.product_images
  for insert
  to authenticated
  with check (public.is_admin());

create policy "product_images_update_admin"
  on public.product_images
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "product_images_delete_admin"
  on public.product_images
  for delete
  to authenticated
  using (public.is_admin());
