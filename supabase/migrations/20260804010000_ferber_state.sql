-- Ferber-timer: delt tilstand mellom enheter.
--
-- Sikkerhetsmodellen: anon-nøkkelen ligger åpent i den publiserte siden — slik
-- er Supabase ment å brukes. Beskyttelsen ligger i romnøkkelen, som aldri
-- havner i repoet, bare i URL-fragmentet og localStorage på dine egne enheter.
-- Derfor får anon ikke røre tabellen direkte, bare kalle de to funksjonene
-- under, og begge krever eksakt romnøkkel. Ingen kan liste ut hvilke rom som
-- finnes.

create table if not exists public.ferber_state (
  room       text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.ferber_state enable row level security;

-- Ingen RLS-policy i det hele tatt: da er tabellen utilgjengelig for anon
-- uansett, og all tilgang må gå gjennom funksjonene nedenfor.
revoke all on public.ferber_state from anon, authenticated;

-- Romnøkkelen må være lang nok til at gjetting er utelukket.
create or replace function public.ferber_get(p_room text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select data
  from public.ferber_state
  where room = p_room
    and length(p_room) >= 24;
$$;

create or replace function public.ferber_put(p_room text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(p_room) < 24 then
    raise exception 'romnøkkelen er for kort';
  end if;

  insert into public.ferber_state (room, data, updated_at)
  values (p_room, p_data, now())
  on conflict (room) do update
    set data = excluded.data,
        updated_at = now();
end;
$$;

grant execute on function public.ferber_get(text)         to anon;
grant execute on function public.ferber_put(text, jsonb)  to anon;
