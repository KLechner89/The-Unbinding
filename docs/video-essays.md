# Video essays

## The concept (as given by the owner)

> Video essays explore philosophical, historical, existential questions; original philosophical monologue over footage of ordinary/extraordinary life (snowboarding, longboarding, walking Manhattan, trampoline with daughter); faces obscured; Wittgenstein's said vs shown; narration and footage coexist as independent complementary forms; live in Media section, each video an individual work in the catalog with title, brief description, unobtrusive player on its dedicated page; dark palette, elegant type, generous negative space, restrained navigation; contemplative, no influencer style.

## In summary

- **What they are.** Video essays on philosophical, historical and existential questions. Each one is an original philosophical monologue spoken over footage of ordinary and extraordinary life: snowboarding, longboarding, walking Manhattan, the trampoline with my daughter. Faces are obscured.
- **The idea behind the form.** Wittgenstein's distinction between what can be *said* and what can only be *shown*. The narration says; the footage shows. Neither illustrates the other. They run side by side as two independent, complementary forms.
- **Where they live.** In the Media section of kylelechner.io. Each video is its own work in the catalog, with a title and a brief description, and has its own page with an unobtrusive player.
- **How they look.** The site's dark palette, elegant type, generous negative space and restrained navigation. Contemplative in tone. Nothing in the style of an influencer channel: no autoplay, no thumbnails with faces or captions, no counters, no "subscribe".

## How it is built

| Piece | What it does |
|---|---|
| `media/works.json` | The list of video works. The only file you edit to add, change or hide a work. |
| `media/transcripts/<slug>.md` | Optional transcript (the monologue) for a work. |
| `media/_template/index.html` | The layout of a video page. Not linked anywhere and marked noindex. |
| `build_media.py` | Reads `works.json`, writes `media/<slug>/index.html` for each published work, and rewrites the list on `media/index.html`. Python 3, nothing to install. |
| `assets/media.css`, `assets/media.js` | Styles for video pages, and the lazy player. |
| `assets/essay.css`, `assets/footnotes.js` | Shared with the essays: transcript text, Notes, and footnote pop-ups. |
| `_headers` | The security policy allows the Bunny Stream player (`frame-src https://iframe.mediadelivery.net`) and Bunny poster images (`img-src https://*.b-cdn.net`). |

### Hosting: Bunny Stream

Videos are hosted on [Bunny Stream](https://bunny.net/stream/), not on the site itself. Each video has two IDs:

- the **library ID** (a number, for the video library), and
- the **video ID** (a long code with hyphens).

The page embeds Bunny's player from
`https://iframe.mediadelivery.net/embed/{library}/{video}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`.

### The player

The page first shows only the poster image (or a plain dark frame) and a small round play mark. Nothing from Bunny loads until the viewer presses play; then the player is put in its place and starts. This keeps the page fast and quiet, and nothing ever plays by itself. Without JavaScript, Bunny's player is shown directly (still not autoplaying).

### Fields in `media/works.json`

```json
{
  "slug": "what-cannot-be-said",
  "title": "What Cannot Be Said",
  "date": "2026-10-12",
  "description": "One sentence shown under the title.",
  "form": "Video essay",
  "duration": "12 min",
  "bunny_library_id": "123456",
  "bunny_video_id": "1f2e3d4c-0000-0000-0000-000000000000",
  "poster": "https://vz-xxxxxxxx-xxx.b-cdn.net/1f2e3d4c-0000-0000-0000-000000000000/thumbnail.jpg",
  "transcript": "media/transcripts/what-cannot-be-said.md",
  "status": "published"
}
```

- `slug`: the page address, `kylelechner.io/media/<slug>/`. Lowercase letters, numbers, hyphens.
- `date`: `YYYY-MM-DD`. The catalog is newest first and numbered 01, 02, ….
- `form`, `duration`: shown in the small caption, e.g. `VIDEO ESSAY · 12 MIN · OCT 2026`.
- `poster` (optional): an `https://` image address (Bunny's thumbnail URL works) or a path on this site such as `/media/posters/what-cannot-be-said.jpg`. Choose a still with no faces. Without one, the frame is plain dark with a play mark.
- `transcript` (optional): path to a markdown file.
- `status`: `"published"` puts it on the site; `"forthcoming"` keeps it entirely hidden. With no published works, the Media page shows a single muted *Forthcoming*.

### Transcript format

Plain paragraphs with a blank line between them; `*italics*`; lines starting with `>` for a quotation; `[^1]` for a footnote marker, with the note at the end as `[^1]: The note text. <https://optional-link>` (under a `## Notes` heading). The notes appear as pop-ups and in a Notes list, exactly as on the essays.

### Build and checks

```bash
python3 build_media.py          # writes the pages; stops with a plain message if works.json has a mistake
python3 build_media.py --prune  # also deletes pages of works that are no longer published
```

The script only replaces the part of `media/index.html` between the `<!-- media-entries -->` and `<!-- /media-entries -->` markers; everything else on that page is left as it is.
