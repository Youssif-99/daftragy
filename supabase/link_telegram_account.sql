-- Run this once in the Supabase SQL editor so the bot / n8n can finish account linking.
create or replace function public.link_telegram_account(p_code text, p_chat_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.link_codes%rowtype;
begin
  if p_code is null or length(trim(p_code)) = 0 or p_chat_id is null or length(trim(p_chat_id)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'missing_params');
  end if;

  select * into v_row
  from public.link_codes
  where code = trim(p_code)
    and used is not true
    and expires_at > now()
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  update public.profiles
  set chat_id = null
  where id <> v_row.user_id
    and chat_id::text = trim(p_chat_id);

  update public.profiles
  set chat_id = trim(p_chat_id)
  where id = v_row.user_id;

  update public.link_codes
  set used = true
  where code = v_row.code;

  return jsonb_build_object('ok', true, 'user_id', v_row.user_id);
end;
$$;

revoke all on function public.link_telegram_account(text, text) from public;
grant execute on function public.link_telegram_account(text, text) to anon, authenticated, service_role;
