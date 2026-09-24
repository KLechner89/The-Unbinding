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
| `index.html` | The story. Prose is generated from `chapters/` by `build.py`. |
| `chapters/` | One markdown file per chapter (see above). |
| `build.py` | Copies chapter text into `index.html`. |
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

