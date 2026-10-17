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
| `assets/membership.js` | The membership hook on members films' pages. A stub today: nobody is a member yet. See "Access". |
| `membership/index.html` | Placeholder page the invitation links to ("Membership opens soon."). Hidden from search engines. |
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
- `access` (optional): `"public"` (the default when the field is left out) or `"members"`. See "Access" below.
- `status`: `"published"` puts it on the site; `"forthcoming"` keeps it entirely hidden. With no published works, the Media page shows a single muted *Forthcoming*.

### Transcript format

Plain paragraphs with a blank line between them; `*italics*`; lines starting with `>` for a quotation; `[^1]` for a footnote marker, with the note at the end as `[^1]: The note text. <https://optional-link>` (under a `## Notes` heading). The notes appear as pop-ups and in a Notes list, exactly as on the essays.

### Build and checks

```bash
python3 build_media.py          # writes the pages; stops with a plain message if works.json has a mistake
python3 build_media.py --prune  # also deletes pages of works that are no longer published
```

The script only replaces the part of `media/index.html` between the `<!-- media-entries -->` and `<!-- /media-entries -->` markers; everything else on that page is left as it is.

## Access: public films and members films

**The model (from the owner).** The first three video essays are free to watch, with no registration. Selected later films are also public. The rest are for members. Everyone can browse the whole catalog and read every description. Essays and fiction are not affected.

**How it looks.**

- *Catalog.* Public and members films sit together, in the same order, with the same numbering, type and descriptions. A members film has one small muted word beside its number: `01 · MEMBERS`. Nothing else differs: no badges, no graphics.
- *A members film's page.* Title, date and description as usual. In place of the player, the same quiet 16:9 frame holds one line and one link (below). The caption reads `16 MIN · MEMBERS`. The transcript is not published on a members film's page (the monologue is part of the film).
- *Members.* Once a membership service is connected, a signed-in member sees the normal player (poster and play mark) instead of the invitation, straight away, without being asked to sign in again; pressing play starts the film exactly as on a public page.
- No ads, countdowns, pop-ups, prices or urgency anywhere.

**Marking a film.** In `media/works.json` add `"access": "members"` to the work (leave it out, or write `"public"`, for a free film), then run `python3 build_media.py`. Which films are free is decided only by this field, never by their order.

**Keep members films' video IDs out of `works.json`.** This repository is public, so anything in `works.json` can be read by anyone on GitHub, and the site serves the file too. For a members film leave `bunny_library_id` and `bunny_video_id` empty (the build prints a note if they are filled in) and don't use Bunny's thumbnail address as its `poster` (it contains the video ID; the build refuses it). Save the still on the site instead, e.g. `/media/posters/<slug>.jpg`. The generated page never contains a Bunny address or ID.

### Placeholder copy (for the owner to approve)

| Where | Text |
|---|---|
| Members film, in the player frame | *This film is in the members' collection.* |
| Link under it | BECOME A MEMBER (goes to `/membership/`) |
| Shown only once a sign-in exists | ALREADY A MEMBER? SIGN IN |
| Catalog and caption mark | MEMBERS |
| `/membership/` page | **Membership**. *Some films in the Media collection are for members. Membership opens soon.* |

The film-page wording lives in `media/_template/index.html` (the part marked `if members`); the page is `membership/index.html`.

### What is still to decide

- **Price and billing period**, and whether there is a free trial. Nothing on the site mentions a price yet.
- **Membership service.** Candidates: Memberstack or Outseta (sign-in, payments and member accounts in one service, added with a script tag), or Stripe Checkout plus Netlify Identity (more control, more to build). None is installed.
- **Final wording** of the placeholder copy above.

### For whoever connects the service (technical)

Hiding the player on the page is a courtesy, not protection. Real protection needs two things:

1. **Bunny Stream token authentication.** Put members films in a *separate* Bunny video library with "Embed view token authentication" switched on (public films stay in the current library, unchanged). Bunny then plays a members film only from an embed address carrying a valid token, `https://iframe.mediadelivery.net/embed/{library}/{video}?token=...&expires=...`, where the token is the SHA-256 of the library's token key + video ID + expiry time. Knowing the video ID alone is then useless.
2. **A server check**, e.g. a Netlify Function at `/api/media-embed?slug=<slug>`: it verifies the visitor's membership with the provider (session cookie or token), looks up the film's video ID (kept in a Netlify environment variable, not in this repository), and returns a signed embed address that expires after a few hours. The token key also lives only in Netlify's environment variables.

On the page, `assets/membership.js` has one clearly marked `PROVIDER` block with three entries to replace: `isMember()` (today it always answers `false`), `embedUrl(slug)` (calls the function above) and `signIn` (the provider's sign-in address, which makes "Already a member? Sign in" appear). When `isMember()` answers `true`, the script swaps the invitation for the standard player; `assets/media.js` handles play. The provider's own script and domains will need adding to the security policy in `_headers` (`script-src`, `connect-src`, perhaps `frame-src`); `/api/...` is already allowed by `connect-src 'self'`.
