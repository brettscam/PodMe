-- Create private storage bucket for voice reference audio clips
-- Upload 5-15 second WAV clips here named {voice-id}.wav (e.g. anchor.wav, host.wav)
-- These clips are passed to Chatterbox as audio_prompt for voice cloning
insert into storage.buckets (id, name, public)
values ('voice-references', 'voice-references', false)
on conflict (id) do nothing;

-- Allow service role full access (server-side API routes only)
create policy "Service role can manage voice references"
  on storage.objects for all
  to service_role
  using (bucket_id = 'voice-references')
  with check (bucket_id = 'voice-references');
