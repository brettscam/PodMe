-- Create private storage bucket for cached TTS audio
insert into storage.buckets (id, name, public)
values ('audio-cache', 'audio-cache', false)
on conflict (id) do nothing;

-- Allow service role full access (server-side API routes only)
create policy "Service role can manage audio cache"
  on storage.objects for all
  to service_role
  using (bucket_id = 'audio-cache')
  with check (bucket_id = 'audio-cache');
