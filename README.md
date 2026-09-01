# Art Portfolio + Webcomic Site

This project uses HTML5, Tailwind CSS (Play CDN), and vanilla JavaScript.

## Quick Start

1. Open `index.html` in a browser.
2. Edit `data/site-data.json` to change text, character bios, artworks, comic series, and chapters.
3. Add your image files in `assets/art/` and `assets/comics/<series>/<chapter>/`.

## Content Editing Guide

### 1) Edit hero and site info

In `data/site-data.json`:

- `site.title`
- `site.tagline`
- `site.heroEyebrow`
- `site.featuredArtId`
- `site.latestComic`

### 2) Add artworks

1. Drop image files into category folders under `assets/art/`:
   - `environment` (or `enviornment`, both are supported)
   - `lydia`, `sedna`, `gg` (or `glepglorp`), `bebe`, `fek`
   - `vehicles`, `other`
2. Run the sync command from the project folder:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/sync-artworks.ps1
```

Or double-click this launcher to run it and keep the window open:

```text
scripts/sync-artworks.cmd
```

This command auto-updates `artworks` in `data/site-data.json`.

Rules used by the sync script:

- Category is inferred from the folder name.
- Medium is inferred from file name:
  - Contains `sketch`, `lineart`, or `wip` -> `Sketch`
  - Contains `anim`, `animation`, or `gif` -> `Animation`
  - Otherwise -> `Full Color`
- Existing artwork entries keep their current metadata when the same image path is found.
- New files get generated defaults for title, year, and description.

Artwork item example:

```json
{
  "id": "art-007",
  "title": "Neon Rain",
  "category": "Environment",
  "year": 2026,
  "medium": "Full Color",
  "image": "assets/art/neon-rain.jpg",
  "description": "Street scene study."
}
```

### 3) Add character bios and images

Use the `characters` array in `data/site-data.json`.

Character example:

```json
{
  "name": "Lydia",
  "role": "Planner",
  "bio": "Short character bio here.",
  "image": "assets/art/lydia-main.jpg",
  "gallery": [
    "assets/art/lydia-01.jpg",
    "assets/art/lydia-02.jpg"
  ]
}
```

Put those image files in `assets/art/`.

Auto-discovery option for character galleries:

- If `gallery` is empty (or omitted), the characters page will auto-scan the same folder as `image` for files named:
  - `gallery-01.jpg`, `gallery-02.jpg`, ...
  - `gallery-010.png`, `gallery-011.png`, ...
- Supported extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`
- You can force auto-discovery even when `gallery` exists by adding:

```json
"autoDiscoverGallery": true
```

### 4) Add comic series and chapters

Folder format:

- `assets/comics/<series-slug>/<chapter-slug>/001.jpg`
- `assets/comics/<series-slug>/<chapter-slug>/002.jpg`

Then update `comics` in `data/site-data.json`.

Chapter example:

```json
{
  "slug": "chapter-03",
  "title": "Chapter 03: Wake",
  "year": 2026,
  "cover": "assets/comics/acb-funny-comic/chapter-03/001.jpg",
  "pages": ["001.jpg", "002.jpg", "003.jpg"]
}
```

## Built-in Features

- Responsive layout with mobile nav
- Dark theme only (enforced across all pages)
- Filterable masonry art gallery
- Art lightbox with keyboard arrows
- Webcomic reader:
  - Vertical scrolling mode
  - Slideshow mode with next/prev
  - Keyboard controls
  - Progress bar
  - Last read position saved in localStorage
- Lazy loading images

## Notes

- If an image is missing, a placeholder appears automatically so layout still works.
- Keep image filenames consistent with `data/site-data.json`.
