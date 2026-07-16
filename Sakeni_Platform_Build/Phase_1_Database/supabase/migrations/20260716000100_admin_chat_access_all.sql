-- Sakeni (سكني) v1.2 - admins can access and moderate all chats

drop policy if exists "Admins manage conversations" on public.conversations;
drop policy if exists "Admins manage messages" on public.messages;

create policy "Admins manage conversations" on public.conversations
  for all using (
    exists (
      select 1
      from public.profiles admin_profile
      where admin_profile.id = auth.uid()
        and admin_profile.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles admin_profile
      where admin_profile.id = auth.uid()
        and admin_profile.role = 'admin'
    )
  );

create policy "Admins manage messages" on public.messages
  for all using (
    exists (
      select 1
      from public.profiles admin_profile
      where admin_profile.id = auth.uid()
        and admin_profile.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles admin_profile
      where admin_profile.id = auth.uid()
        and admin_profile.role = 'admin'
    )
  );
