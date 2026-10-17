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
7. **The response link comes with the copy.** The small "How did this make you feel?" link at the end of The Unbinding is copied too. In the new page, change its address to the new piece, e.g. `/respond/?piece=/fiction/new-story/&title=New%20Story`.

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
| `about/index.html` | About page, at `kylelechner.io/about/` (linked from the three-dot menu). |
| `fiction/`, `essays/`, `media/` | Catalog pages (`index.html` in each folder). |
| `fiction/unbinding/index.html` | The story, at `kylelechner.io/fiction/unbinding/`. Prose is generated from `chapters/` by `build.py`. |
| `assets/site.css`, `assets/menu.js` | Shared style and three-dot menu for the home and catalog pages. |
| `spotify/index.html` | The page Spotify sends readers back to after they connect (`kylelechner.io/spotify/`). Shared by every scored work. |
| `assets/score.js`, `assets/score.css`, `assets/spotify-auth.js` | The shared soundtrack player and Spotify sign-in. No songs live here. |
| `fiction/unbinding/score.config.js` | The Unbinding's song list. |
| `essays/carriage-and-platform/score.config.js` | The Carriage and the Platform's song list (loops; not generated, edit by hand). |
| `_redirects` | Old addresses that forward to new ones (`/unbinding` → the story). |
| `chapters/` | One markdown file per chapter (see above). |
| `build.py` | Copies chapter text into `fiction/unbinding/index.html`. |
| `feedback.html` | Reader response form (Netlify Forms), also at `/respond/`. |
| `response_form.py`, `assets/response.css`, `assets/response.js` | The "How did this make you feel?" link at the end of every piece, and the response form page (see "Response link"). |
| `book.html` | Scheduling page at `kylelechner.io/book`. |
| `netlify/functions/` | Scheduling backend: availability, booking, and a readiness check. |
| `netlify/functions/_shared/availability-rules.mjs` | Meeting hours, lengths, notice, and daily limits. |
| `media/works.json`, `build_media.py` | The list of video works and the script that builds the Media page and each video page from it (see "Adding a video essay"). |
| `_headers` | Security headers for every page. |

## Response link

Every piece ends with a small "How did this make you feel?" link: The Unbinding (after the last chapter), every essay page, and every video page (before the Next / All links). It opens the response form page, `/respond/` (the same page as `feedback.html`; see `_redirects`), with the piece in the address, e.g. `/respond/?piece=/essays/mobius-censor/2/&title=The%20M%C3%B6bius%20Censor%20%C2%B7%20Paper%20II%3A%20Reflex%20Incarnate`. The form's **The piece** field is filled in with the title (the reader can change it), and a hidden `piece` field keeps the page address.

Responses go to the Netlify form named `feedback`, in the Netlify dashboard under **Forms → feedback** (and by email if form notifications are on), with the fields `piece_title`, `piece`, `message`, `name`, `email`. Someone who opens `/feedback.html` or `/respond/` directly sees an empty "The piece" field.

Nothing needs doing for new pieces:

- **Essays:** `python3 build_essays.py` adds the link to every essay page.
- **Video essays:** `python3 build_media.py` adds it to every video page (it is the `{{RESPONSE}}` line in `media/_template/index.html`).
- **The Unbinding:** `python3 build.py` refreshes the link between the two `response link` marker comments after the last chapter. If those markers are removed it stops and changes nothing.

To change the link's wording, edit `response_form.py` and run all three build scripts. The form itself is in `feedback.html` (Netlify reads its fields from there when the site deploys); its look is in `assets/response.css` and the prefilling and sending without a page reload is `assets/response.js`.

---

## Scheduling

`book.html` talks to three Netlify Functions:

- `GET /api/availability`: open times, read live from Google Calendar
- `POST /api/book`: rechecks the time, creates the calendar event (and a Zoom meeting for video), emails the visitor and the office
- `GET /api/scheduling-status`: returns `{"ready": true|false}`

All credentials live in Netlify environment variables (scoped to Functions), never in this repository. Scheduling stays off until every required variable is set and `SCHEDULING_ENABLED` is `true`; the reasons are written to the function logs.


## Adding a new essay

Essays are written as plain text files in the `essays-src/` folder. A small script turns each file into a finished web page, so you never edit the essay pages in `essays/` by hand.

1. **Make a copy** of an existing file in `essays-src/` (for example `carriage-and-platform.md`) and rename it, e.g. `my-new-essay.md`.
2. **Edit the top block** (between the two `---` lines):
   - `title:` the essay's title.
   - `subtitle:` optional; delete the line if there isn't one.
   - `url:` where the page will live, e.g. `/essays/my-new-essay/` (lowercase, hyphens, ending in `/`).
   - `date:` written the way it should appear, e.g. `March 2, 2026`.
   - `next:` optional; the `url:` of the piece the "Next" link at the bottom should point to.
   - `score:` optional; gives the essay a soundtrack using the same player as The Unbinding (bottom-right corner, needs Spotify Premium). Its value is the address of a song list, e.g. `/essays/carriage-and-platform/score.config.js`. Copy that file next to the new essay's page, keep `loop: true`, and list the songs (see "Adding a new scored work" for how to find a track id). The page then works like The Unbinding ("Connect Spotify to begin" or "read without audio", then "Begin reading"); the music starts when the reader reaches the text, plays the songs in order and starts again after the last one. Delete the line if there isn't one.
   - For a paper in a series, also give `series:`, `series_url:` and `part:` (1, 2, 3…), as in the `mobius-censor-*.md` files. Previous/Next links inside a series are worked out from `part:`. A new series also needs a one-line entry in `SERIES` at the top of `build_essays.py`.
3. **Paste the text** below the top block. Leave a blank line between paragraphs.
   - Italics: wrap words in single asterisks, `*Mrs. Dalloway*`.
   - A footnote marker in the text: `[^1]`, `[^2]`, …
4. **Notes and bibliography** go at the end, under the headings `## Notes` and `## Bibliography` (or `## Works Cited`). One note per line:
   `[^1]: Virginia Woolf, *Mrs. Dalloway* (New York: Vintage Books, 2021), P. 7. <https://link-to-the-source>`
   The link in `< >` is optional. Only add one you've opened and checked is the right book or article. It shows up as "Source ↗" in the note's pop-up and in the Notes list.
5. **Build the pages.** In a terminal in this folder, run `python3 build_essays.py`. It rewrites every essay page and the series pages.
6. **Add it to the Essays page.** Open `essays/index.html` and copy one of the `<li class="work">…</li>` entries. Change the link, number, title, one-sentence description and caption. Newest goes first, and the numbers count up from 01.
7. Commit and push. Netlify builds a preview for the pull request, and the site updates when it's merged into `main`.

Footnote pop-ups come from `assets/footnotes.js` and the page styles from `assets/essay.css`. Both are shared by every essay.


## Adding a video essay

Videos are stored on Bunny Stream, and the site shows them with a small player. You never edit the video pages by hand; a script makes them from one list, `media/works.json`. The thinking behind the series is in `docs/video-essays.md`.

1. **Upload the video to Bunny Stream.** In the bunny.net dashboard, open Stream, choose your video library, and upload the file. Wait until it says it has finished processing.
2. **Copy the two IDs.** Open the video in Bunny. You need the **library ID** (a number, shown in the library's settings or in the video's embed link) and the **video ID** (a long code with hyphens). In the embed link `https://iframe.mediadelivery.net/embed/123456/1f2e3d4c-...`, `123456` is the library ID and the part after it is the video ID. If you want a poster image, copy the video's thumbnail address too (it starts with `https://vz-` and ends in `/thumbnail.jpg`), or pick a still in Bunny first. Use a still with no faces.
3. **Add an entry to `media/works.json`.** Copy the example entry already in the file and change it: `slug` (the web address, e.g. `what-cannot-be-said`), `title`, `date` (written `2026-10-12`), a one-sentence `description`, `form` (e.g. `Video essay`), `duration` (e.g. `12 min`), `bunny_library_id`, `bunny_video_id`, and optionally `poster` and `transcript`. Set `status` to `"published"`. Anything left as `"forthcoming"` stays hidden.
4. **Add the transcript (optional).** Save the monologue as `media/transcripts/<slug>.md`: paragraphs separated by a blank line, `*italics*`, `>` at the start of a line for a quotation, and footnotes written the same way as in the essays (`[^1]` in the text, `[^1]: the note <https://link>` at the end under `## Notes`). Put its path in the entry's `transcript` field.
5. **Build.** In a terminal in this folder, run `python3 build_media.py`. It makes `media/<slug>/index.html` and updates the list on the Media page (newest first, numbered 01, 02, …). If something in `works.json` is wrong it says what and changes nothing.
6. **Preview.** Commit and push to a branch and open a pull request. Netlify builds a preview link where you can watch the video and check the page. (Or run `python3 -m http.server` here and open `http://localhost:8000/media/`.)
7. **Merge.** When it looks right, merge the pull request into `main`. The site updates within a minute.

To take a video down, set its `status` back to `"forthcoming"` and run `python3 build_media.py --prune`.

The layout of every video page lives in `media/_template/index.html` (not linked from anywhere, and hidden from search engines), with its styles in `assets/media.css` and the player in `assets/media.js`. Transcript notes reuse the essays' `assets/essay.css` and `assets/footnotes.js`.
