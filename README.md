# Writing
# The Unbinding
### By Kyle Lechner

A story told in data and in the distance between people who have forgotten how to reach one another.

---

## Project Structure

```
the-unbinding/
  index.html          — the complete web experience
  build.py            — rebuilds index.html from chapter files
  chapters/           — the prose, one markdown file per chapter
    01-the-house-on-meridian-street.md
    02-margaret-at-the-window.md
    03-james-in-the-parking-lot.md
    04-what-claire-knew.md
    05-lily-does-not-answer.md
    06-what-they-were-taught.md
    07-the-apartment.md
    08-sunday-morning.md
    09-the-date.md
    10-the-floor-gives-way.md
    11-only-in-dreams.md
  audio/              — mp3 files (tracked via Git LFS)
    01-pyramid-song.mp3
    02-acid-rain.mp3
    03-every-day-is-exactly-the-same.mp3
    04-on-melancholy-hill.mp3
    05-gilded-lily.mp3
    06-lovers-rock.mp3
    07-the-apartment.mp3
    08-space-song.mp3
    09-bad-things.mp3
    10-crosses.mp3
    11-only-in-dreams.mp3
```

---

## How to Edit the Story

Open any file in `chapters/` in any text editor or terminal:

```bash
nano chapters/02-margaret-at-the-window.md
# or
vim chapters/09-the-date.md
```

Each file is plain markdown. The heading at the top is the chapter title. Everything below is prose. Write freely — paragraph breaks become HTML paragraph breaks.

When you're done editing, run:

```bash
python3 build.py
```

This rebuilds `index.html` with your updated prose. Then commit and push.

---

## Git Workflow

```bash
# After editing a chapter
python3 build.py
git add chapters/09-the-date.md index.html
git commit -m "revise chapter IX"
git push
```

Netlify will redeploy automatically when you push.

---

## Setup (first time)

```bash
# Install Git LFS (for audio files)
git lfs install
git lfs track "*.mp3"

# Add your mp3s to the audio/ folder, then:
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/the-unbinding.git
git push -u origin main
```

---

## Soundtrack

| Chapter | Track |
|---------|-------|
| I — The House on Meridian Street | Pyramid Song — Radiohead |
| II — Margaret at the Window | Acid Rain — Lorn |
| III — James in the Parking Lot | Every Day Is Exactly the Same — Nine Inch Nails |
| IV — What Claire Knew | On Melancholy Hill — Gorillaz |
| V — Lily Does Not Answer | Gilded Lily — Cults |
| VI — What They Were Taught | Lovers Rock — TV Girl |
| VII — The Apartment | The Apartment — Sidewalks and Skeletons |
| VIII — Sunday Morning | Space Song — Beach House |
| IX — The Date | Bad Things — Cults |
| X — The Floor Gives Way | Crosses — José González |
| XI — Only in Dreams | Only in Dreams — Weezer |
