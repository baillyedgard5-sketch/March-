-- À coller dans Supabase > SQL Editor > Run.
-- Remplace TON_EMAIL@exemple.com par ton email vendeur (partout où il apparaît).

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  prix numeric not null check (prix >= 0),
  old_prix numeric,
  categorie text not null,
  description text not null default '',
  image_url text,
  created_at timestamptz not null default now()
);
create table if not exists orders (
  id uuid primary key,
  client_nom text not null,
  client_tel text not null,
  lat double precision,
  lng double precision,
  adresse text,
  note text,
  items jsonb not null,
  total numeric not null,
  statut text not null default 'nouvelle',
  created_at timestamptz not null default now()
);
create table if not exists settings (key text primary key, value text not null);

alter table products enable row level security;
alter table orders enable row level security;
alter table settings enable row level security;

-- Tout le monde peut voir le catalogue et les réglages publics
create policy "lecture produits" on products for select using (true);
create policy "lecture reglages" on settings for select using (true);
-- Tout le monde peut passer commande, mais personne ne peut les lire sauf le vendeur
create policy "clients passent commande" on orders for insert to anon, authenticated with check (statut = 'nouvelle');
-- Seul le vendeur peut tout modifier
create policy "vendeur produits" on products for all to authenticated
  using ((auth.jwt() ->> 'email') = 'TON_EMAIL@exemple.com') with check ((auth.jwt() ->> 'email') = 'TON_EMAIL@exemple.com');
create policy "vendeur commandes" on orders for all to authenticated
  using ((auth.jwt() ->> 'email') = 'TON_EMAIL@exemple.com') with check ((auth.jwt() ->> 'email') = 'TON_EMAIL@exemple.com');
create policy "vendeur reglages" on settings for all to authenticated
  using ((auth.jwt() ->> 'email') = 'TON_EMAIL@exemple.com') with check ((auth.jwt() ->> 'email') = 'TON_EMAIL@exemple.com');

-- Photos des produits
insert into storage.buckets (id, name, public) values ('produits', 'produits', true) on conflict (id) do nothing;
create policy "photos visibles" on storage.objects for select using (bucket_id = 'produits');
create policy "vendeur photos" on storage.objects for all to authenticated
  using (bucket_id = 'produits' and (auth.jwt() ->> 'email') = 'TON_EMAIL@exemple.com')
  with check (bucket_id = 'produits' and (auth.jwt() ->> 'email') = 'TON_EMAIL@exemple.com');

insert into settings (key, value) values ('devise', 'FCFA'), ('whatsapp', '') on conflict (key) do nothing;
