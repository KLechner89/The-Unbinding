# The Unbinding
### By Kyle Lechner

*A story told in data and in the distance between people who have forgotten how to reach one another.*

---

## Editing the Writing

All prose lives in the `chapters/` folder as plain markdown files. One file per chapter. To edit, open the file, write, rebuild, push.

### Open a chapter

```bash
# In the Codespaces terminal
nano chapters/09-the-date.md
```

Or just click the file in the left sidebar and edit directly.

### Paragraph rules

- One blank line between paragraphs
- No indentation — every paragraph starts at the left edge
- Section breaks use `· · ·` on their own line with blank lines above and below
- Don't touch the `# Chapter X:` heading at the top of each file

### After editing, rebuild and push

```bash
python3 build.py
git add .
git commit -m "edit chapter IX"
git push
```

Netlify redeploys automatically within ~30 seconds.

### Edit multiple chapters at once

```bash
# Edit as many files as you want, then rebuild once
python3 build.py
git add .
git commit -m "edits across chapters"
git push
```

### Check what changed before committing

```bash
git diff chapters/09-the-date.md
```

### Undo your last edit (before pushing)

```bash
git checkout chapters/09-the-date.md
```

### Undo after pushing

```bash
git revert HEAD
git push
```

---

## Adding a new scored work

A "scored work" is a story with a soundtrack that changes as the reader scrolls. The player is shared, but every work has its own song list.

1. **Make a folder for it**, for example `fiction/new-story/`, and copy `fiction/unbinding/index.html` into it as a starting point. Replace the story text with your own.
2. **Mark where each song starts.** Put `data-music="0"` on the first chapter's container, `data-music="1"` on the second, and so on. Songs are counted from 0.
3. **Write the song list.** Copy `fiction/unbinding/score.config.js` into the new folder and change `playerName` and the `tracks` list. Each track needs:
   - `id`: the part of the song's Spotify link after `/track/`. For `https://open.spotify.com/track/55q3Ro66yXWi9rsEddeEN4` the id is `55q3Ro66yXWi9rsEddeEN4`.
   - `name`: what the player shows, e.g. `'Radiohead — Pyramid Song'`.
   The first track plays at `data-music="0"`, the second at `data-music="1"`, and so on.
4. **Point the page at its own song list.** Near the bottom of the new `index.html`, change the line
   `<script src="/fiction/unbinding/score.config.js"></script>` to your folder, e.g. `/fiction/new-story/score.config.js`. Leave the two lines after it (`/assets/spotify-auth.js` and `/assets/score.js`) as they are.
5. **Add it to the catalog.** Add an entry for it in `fiction/index.html` (or the essays/media page).
6. **If the new page has chapters in `chapters/`,** `build.py` currently only fills in The Unbinding. Ask for it to be extended to the new page.

Nothing has to change in Spotify. Every work uses the same Redirect URI, `https://kylelechner.io/spotify/`, which is already registered. After connecting, readers are sent back to the page they started on.

Spotify sign-in only works on `kylelechner.io`. Netlify deploy previews have a different address that isn't registered with Spotify, so test the soundtrack on the live site, or use "read without audio" on a preview.

---

## Chapter Files

| File | Chapter |
|------|---------|
| `01-the-house-on-meridian-street.md` | I — The House on Meridian Street |
| `02-margaret-at-the-window.md` | II — Margaret at the Window |
| `03-james-in-the-parking-lot.md` | III — James in the Parking Lot |
| `04-what-claire-knew.md` | IV — What Claire Knew |
| `05-lily-does-not-answer.md` | V — Lily Does Not Answer |
| `06-what-they-were-taught.md` | VI — What They Were Taught |
| `07-the-apartment.md` | VII — The Apartment |
| `08-sunday-morning.md` | VIII — Sunday Morning |
| `09-the-date.md` | IX — The Date |
| `10-the-floor-gives-way.md` | X — The Floor Gives Way |
| `11-only-in-dreams.md` | XI — Only in Dreams |

## Deployment

- **Repo:** github.com/KLechner89/The-Unbinding
- **Live:** kylelechner.io
- **Host:** Netlify — auto-deploys on every push to `main`

---

## Site Structure

| Path | What it is |
|------|------------|
| `index.html` | Home page: Fiction, Essays, Media. |
| `fiction/`, `essays/`, `media/` | Catalog pages (`index.html` in each folder). |
| `fiction/unbinding/index.html` | The story, at `kylelechner.io/fiction/unbinding/`. Prose is generated from `chapters/` by `build.py`. |
| `assets/site.css`, `assets/menu.js` | Shared style and three-dot menu for the home and catalog pages. |
| `spotify/index.html` | The page Spotify sends readers back to after they connect (`kylelechner.io/spotify/`). Shared by every scored work. |
| `assets/score.js`, `assets/score.css`, `assets/spotify-auth.js` | The shared soundtrack player and Spotify sign-in. No songs live here. |
| `fiction/unbinding/score.config.js` | The Unbinding's song list. |
| `_redirects` | Old addresses that forward to new ones (`/unbinding` → the story). |
| `chapters/` | One markdown file per chapter (see above). |
| `build.py` | Copies chapter text into `fiction/unbinding/index.html`. |
| `feedback.html` | Reader feedback form (Netlify Forms). |
| `book.html` | Scheduling page at `kylelechner.io/book`. |
| `netlify/functions/` | Scheduling backend: availability, booking, and a readiness check. |
| `netlify/functions/_shared/availability-rules.mjs` | Meeting hours, lengths, notice, and daily limits. |
| `_headers` | Security headers for every page. |

## Scheduling

`book.html` talks to three Netlify Functions:

- `GET /api/availability`: open times, read live from Google Calendar
- `POST /api/book`: rechecks the time, creates the calendar event (and a Zoom meeting for video), emails the visitor and the office
- `GET /api/scheduling-status`: returns `{"ready": true|false}`

All credentials live in Netlify environment variables (scoped to Functions), never in this repository. Scheduling stays off until every required variable is set and `SCHEDULING_ENABLED` is `true`; the reasons are written to the function logs.

