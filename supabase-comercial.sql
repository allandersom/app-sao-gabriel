-- Execute no SQL Editor do projeto ccevrrdzgbykhsdxupuo.
-- Políticas aceitam somente tokens Firebase do projeto e dos dois e-mails abaixo.
begin;
create or replace function public.sgc_email() returns text language sql stable as $$
  select case when auth.jwt()->>'iss' = 'https://securetoken.google.com/saogabriel-sgc-soli'
    and auth.jwt()->>'aud' = 'saogabriel-sgc-soli'
    and nullif(auth.jwt()->>'sub','') is not null
  then auth.jwt()->>'email' else null end;
$$;
create table if not exists public.pedidos_comercial (
 id uuid primary key,
 owner_uid text not null,
 empresa text not null check(length(empresa) between 1 and 200),
 endereco text not null check(length(endereco) between 1 and 500),
 inicio date not null, fim date not null check(fim>=inicio),
 quantidade integer not null check(quantidade between 1 and 1000),
 observacoes text not null default '' check(length(observacoes)<=3000),
 anexos jsonb not null check(jsonb_typeof(anexos)='array' and jsonb_array_length(anexos) between 1 and 5),
 status text not null default 'pendente' check(status in ('pendente','atendido')),
 created_at timestamptz not null default now()
);
alter table public.pedidos_comercial enable row level security;
revoke all on public.pedidos_comercial from anon,authenticated;
grant select,insert on public.pedidos_comercial to anon,authenticated;
grant update(status) on public.pedidos_comercial to anon,authenticated;
-- Firebase sem custom claim role recebe papel anon; o JWT é validado pela integração,
-- e cada política exige projeto, e-mail e UID. Chave pública sozinha não dá acesso.
create policy sgc_pedidos_ler on public.pedidos_comercial for select to anon,authenticated using (
 public.sgc_email()='kewen.allan.nave@gmail.com' or
 (public.sgc_email()='adm2@saogabrieltransportes.com.br' and owner_uid=auth.jwt()->>'sub'));
create policy sgc_pedidos_criar on public.pedidos_comercial for insert to anon,authenticated with check (
 public.sgc_email()='adm2@saogabrieltransportes.com.br' and owner_uid=auth.jwt()->>'sub' and status='pendente');
create policy sgc_pedidos_atender on public.pedidos_comercial for update to anon,authenticated
 using(public.sgc_email()='kewen.allan.nave@gmail.com') with check(public.sgc_email()='kewen.allan.nave@gmail.com');
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('pedidos-comercial','pedidos-comercial',false,10485760,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
create policy sgc_anexos_ler on storage.objects for select to anon,authenticated using (
 bucket_id='pedidos-comercial' and (public.sgc_email()='kewen.allan.nave@gmail.com' or
 (public.sgc_email()='adm2@saogabrieltransportes.com.br' and (storage.foldername(name))[1]=auth.jwt()->>'sub')));
create policy sgc_anexos_criar on storage.objects for insert to anon,authenticated with check (
 bucket_id='pedidos-comercial' and public.sgc_email()='adm2@saogabrieltransportes.com.br'
 and (storage.foldername(name))[1]=auth.jwt()->>'sub');
create policy sgc_anexos_limpar on storage.objects for delete to anon,authenticated using (
 bucket_id='pedidos-comercial' and public.sgc_email()='adm2@saogabrieltransportes.com.br'
 and (storage.foldername(name))[1]=auth.jwt()->>'sub'
 and not exists(select 1 from public.pedidos_comercial p where p.id::text=(storage.foldername(name))[2]));
commit;
