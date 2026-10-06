# Tunesmith — AI Song Studio

A single-page web app for making songs with the [Suno API](https://docs.sunoapi.org/). It runs on your own API key.

## Features
- **Account login (Supabase Auth)**: sign in or create an account with email and password, and reset a forgotten password by email. You sign in before the key gate appears, and the ⎋ button signs you out.
- **Key gate**: you paste your API key before anything else, and it's checked against your credit balance. It's stored only in your browser. "Remember on this device" is optional.
- **Create (Simple)**: describe the song, add vibe chips, use 🎲 Surprise me, optionally add lyrics, and attach image, audio or video references (by URL or file upload).
- **Create (Custom)**: title, style (with ✨ AI style boost), a lyrics editor with section tags, ✍️ AI lyric writing, instrumental toggle, excluded styles, vocal gender, style/weirdness/audio weights, variety, target length and personas.
- **Models**: V6 (default), V6 Wild and V6 Mini. The legacy models V5.5, V5, V4.5+, V4.5 All, V4.5 and V4 are also available.
- **Studio**: extend, cover/restyle, extend an upload, add instrumental, add vocals, mashup, replace a section, and a sound & loop maker (key, BPM, loop).
- **Lyrics Lab**: generates two lyric options, and either one can be sent to Create with one click.
- **Library**: player, favourites, search, and import by task ID. Each song has these tools: MP3 and WAV downloads, vocal split, all stems, isolating one instrument, MIDI (exported as a `.mid` file), music video, new cover art, making a persona, sing-along timed lyrics, and reusing its settings.
- Live Activity drawer, credits badge, confetti, and light, dark and system themes. Works on mobile.

## Deploy (Netlify)
There's no build step. `netlify.toml` publishes the repo root and deploys two functions:
- `/api/suno/*` and `/api/upload/*`: a pass-through proxy to `api.sunoapi.org` and the file-upload API, so the browser doesn't hit CORS errors. The user's key is forwarded and never stored.
- `/api/callback`: acknowledges the required `callBackUrl`. The app gets results by polling.

For local development, run `netlify dev`. A plain static server also works: the app then calls the API directly.

Supabase setup: in the Supabase dashboard, open **Authentication → URL Configuration** and set the **Site URL** to your Netlify URL (also add it under Redirect URLs). Email confirmation and password-reset links then come back to the app.

Suno deletes generated files after 14 days, so download anything you want to keep.
