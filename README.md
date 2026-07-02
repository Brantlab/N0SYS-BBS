# N0SYS BBS

A complete Hugo starter site and reusable theme inspired by amateur-radio packet
bulletin boards, glowing CRT terminals, and late-night connections over AX.25.

## Run it

```sh
hugo server
```

Open <http://localhost:1313/>.

## Customize the station

Edit `hugo.toml` to change the callsign, frequency, grid square, operator, and
accent color. Set `accent = "green"` for a green phosphor display; amber is the
default.

Create a new bulletin with:

```sh
hugo new content posts/my-bulletin.md
```

The theme reads these optional front matter fields:

- `callsign`: sender shown in the message list
- `board`: message area such as `TECH`, `LOCAL`, or `SYSOP`
- `subject`: short packet-style subject code
- `summary`: description used by Hugo
- `tags`: normal Hugo taxonomy tags

The reusable theme lives in `themes/n0sys-bbs`; the root content and
configuration form the example site.

## Production build

```sh
hugo --minify
```

The generated site is written to `public/`.

## Deploy

Pushes to `main` are built and deployed to GitHub Pages by
`.github/workflows/hugo.yaml`. The production site uses
<https://n0sys.net/>.

In the GitHub repository, set **Settings → Pages → Source** to **GitHub
Actions**, then enter `n0sys.net` as the custom domain and enable HTTPS after
GitHub has issued the certificate. The generated `public/` directory should not
be committed.
