Comic folder pattern:
assets/comics/<series-slug>/<chapter-slug>/001.jpg, 002.jpg, 003.jpg...

Example:
assets/comics/starlit-echoes/chapter-01/001.jpg

After adding files, update data/site-data.json:
- comics[].slug
- comics[].chapters[].slug
- comics[].chapters[].pages
