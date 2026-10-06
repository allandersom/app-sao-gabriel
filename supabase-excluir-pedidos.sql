begin;
grant delete on public.pedidos_comercial to anon, authenticated;
drop policy if exists sgc_pedidos_excluir on public.pedidos_comercial;
create policy sgc_pedidos_excluir on public.pedidos_comercial
for delete to anon, authenticated
using (public.sgc_email() = 'kewen.allan.nave@gmail.com');
drop policy if exists sgc_anexos_excluir_admin on storage.objects;
create policy sgc_anexos_excluir_admin on storage.objects
for delete to anon, authenticated
using (bucket_id = 'pedidos-comercial' and public.sgc_email() = 'kewen.allan.nave@gmail.com');
create or replace function public.sgc_pode_excluir_pedido()
returns boolean language sql stable security invoker
as $$ select coalesce(public.sgc_email() = 'kewen.allan.nave@gmail.com', false); $$;
grant execute on function public.sgc_pode_excluir_pedido() to anon, authenticated;
commit;
