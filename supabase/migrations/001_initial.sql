-- ============================================================
-- Portal WANT — Schema inicial
-- ============================================================

create extension if not exists "uuid-ossp";

-- Tabla de perfiles de usuarios WANT
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text not null,
  username    text not null,
  role        text not null default 'admin' check (role in ('admin', 'user')),
  estado      boolean not null default false,
  created_at  timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;

create policy "Usuario puede ver su perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuario puede actualizar su perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger: crea perfil automáticamente al registrar usuario
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username, estado)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    true
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
