import type { Metadata } from "next";
import { LaunchStamp } from "@/components/LaunchStamp";
import "./brand.css";

// The Emerge brand guidelines (Darren, 24 Nov 2026), at /brandguidelines: a page a designer can be
// sent, with every file they need to download. Built from the live site and
// the launch flyer as they stand, so it describes the brand, not a wish for
// it. Unlisted and not indexed, like the rest of the site. The files live in
// public/brand; emerge-brand-kit.zip holds them all plus a README.

export const metadata: Metadata = {
  title: "Emerge · Brand guidelines",
  description: "The Emerge logo, colour, type, photography and layouts, with every file to download.",
};

// Sizes in bytes, from public/brand. Update when a file changes.
const SIZES: Record<string, number> = {
  "emerge-brand-kit.zip": 12862540,
  "emerge-flyer-A4-bleed.pdf": 2764252,
  "emerge-flyer-A4.pdf": 2759933,
  "emerge-icon-512.png": 46157,
  "emerge-instagram-4x5.png": 1831305,
  "emerge-key-visual-4x3.jpg": 915704,
  "emerge-key-visual-square.jpg": 724556,
  "emerge-logo-acid.png": 209171,
  "emerge-logo-ivory.png": 209379,
  "emerge-logo-night.png": 209389,
  "emerge-portrait-photo.jpg": 1912181,
  "emerge-portrait-with-star.jpg": 651661,
  "emerge-thermal-room-warm.jpg": 232947,
  "emerge-thermal-room.jpg": 249369,
  "emerge-thermal-touch.jpg": 217783,
  "emerge-tooth-star.png": 55595,
};

function size(file: string) {
  const b = SIZES[file] ?? 0;
  return b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`;
}

function Download({ file, label }: { file: string; label: string }) {
  const type = file.split(".").pop()!.toUpperCase();
  return (
    <a className="bk-dl" href={`/brand/${file}`} download>
      <span className="bk-dl-name">{label}</span>
      <span className="bk-dl-meta">
        {type} · {size(file)} <span aria-hidden="true">↓</span>
      </span>
    </a>
  );
}

const COLOURS = [
  { name: "Night", hex: "#171713", rgb: "23 23 19", role: "The ground. Almost every piece starts on Night.", on: "ivory" },
  { name: "Ivory", hex: "#F5F1E8", rgb: "245 241 232", role: "Text on dark. Use it wherever you would reach for white.", on: "night" },
  { name: "Acid", hex: "#EFFF00", rgb: "239 255 0", role: "The logo, and the thing to act on: Get me in!", on: "night" },
  { name: "Pink", hex: "#FF70BC", rgb: "255 112 188", role: "The programme, the DJ, the ticket and the full stop.", on: "night" },
  { name: "Electric", hex: "#354BFF", rgb: "53 75 255", role: "The second headline line, the thermal pictures, the stamp.", on: "ivory" },
];

const PAIRS = [
  { fg: "ivory", bg: "night", ratio: "15.9", use: "Any size" },
  { fg: "acid", bg: "night", ratio: "16.2", use: "Any size" },
  { fg: "night", bg: "acid", ratio: "16.2", use: "Any size" },
  { fg: "night", bg: "pink", ratio: "7.1", use: "Any size" },
  { fg: "pink", bg: "night", ratio: "7.1", use: "Any size" },
  { fg: "ivory", bg: "electric", ratio: "5.2", use: "Any size" },
  { fg: "acid", bg: "electric", ratio: "5.3", use: "Any size" },
  { fg: "electric", bg: "night", ratio: "3.1", use: "Headlines only" },
];

const NEVER = [
  ["acid", "ivory", "1.0"],
  ["ivory", "pink", "2.3"],
  ["acid", "pink", "2.3"],
  ["electric", "pink", "2.3"],
];

const SECTIONS = [
  ["idea", "The idea"],
  ["logo", "Logo"],
  ["colour", "Colour"],
  ["type", "Type"],
  ["details", "Details"],
  ["photography", "Photography"],
  ["layouts", "Layouts"],
  ["words", "Words"],
  ["downloads", "Downloads"],
];

function Head({ n, id, title, children }: { n: number; id: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="bk-head">
      <p className="bk-num">
        {String(n).padStart(2, "0")} / {SECTIONS.find((s) => s[0] === id)![1].toUpperCase()}
      </p>
      <h2>{title}</h2>
      {children && <div className="bk-lede">{children}</div>}
    </header>
  );
}

export default function BrandPage() {
  return (
    <main className="bk">
      <section className="bk-cover">
        <div className="bk-wrap">
          <p className="bk-kicker">
            Brand guidelines<b>/</b>November 2026
          </p>
          <div className="bk-cover-lockup">
            <img src="/brand/emerge-logo-acid.png" alt="Emerge" width={1916} height={787} />
            <p>A night that stays with you.</p>
          </div>
          <p className="bk-cover-line">
            Everything you need to make Emerge look like Emerge. Taken from the live site and the launch flyer,
            so it shows the brand as it is now.
          </p>
          <a className="bk-kit" href="/brand/emerge-brand-kit.zip" download>
            <span>Download the full kit</span>
            <span>
              ZIP · {size("emerge-brand-kit.zip")} <span aria-hidden="true">↓</span>
            </span>
          </a>
          <nav className="bk-toc" aria-label="Contents">
            {SECTIONS.map(([id, label], i) => (
              <a key={id} href={`#${id}`}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                {label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section id="idea" className="bk-section">
        <div className="bk-wrap">
          <Head n={1} id="idea" title={<>A night that stays with you<i>.</i></>}>
            <p>
              Emerge is a night of music, culture and meaningful connection for creative people in their own town.
              The first one is in Maidenhead, on Friday 27 November 2026, at Ben&amp;Jack Studio.
            </p>
          </Head>
          <div className="bk-three">
            <div>
              <h3>Intimate</h3>
              <p>Close up, not crowd shots. A face laughing, a room of people talking. It should feel like you were there.</p>
            </div>
            <div>
              <h3>Irreverent</h3>
              <p>Loud colour, big type, a star on a tooth. It does not take itself too seriously.</p>
            </div>
            <div>
              <h3>Open-hearted</h3>
              <p>Come on your own or bring your people. Every piece should feel like an invitation.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="logo" className="bk-section">
        <div className="bk-wrap">
          <Head n={2} id="logo" title={<>The logo is drawn, not typed<i>.</i></>}>
            <p>
              The Emerge wordmark is hand-drawn lettering. There is no font for it, so always use the files below and
              never retype it.
            </p>
          </Head>
          <div className="bk-logos">
            <figure className="bk-logo-tile t-night">
              <img src="/brand/emerge-logo-acid.png" alt="Acid logo on Night" />
              <figcaption>Acid on Night. The main version.</figcaption>
            </figure>
            <figure className="bk-logo-tile t-acid">
              <img src="/brand/emerge-logo-night.png" alt="Night logo on Acid" />
              <figcaption>Night on Acid</figcaption>
            </figure>
            <figure className="bk-logo-tile t-pink">
              <img src="/brand/emerge-logo-night.png" alt="Night logo on Pink" />
              <figcaption>Night on Pink</figcaption>
            </figure>
            <figure className="bk-logo-tile t-electric">
              <img src="/brand/emerge-logo-ivory.png" alt="Ivory logo on Electric" />
              <figcaption>Ivory on Electric</figcaption>
            </figure>
          </div>

          <div className="bk-rules">
            <div className="bk-space">
              <div className="bk-space-box">
                <img src="/brand/emerge-logo-acid.png" alt="" />
              </div>
              <div>
                <h3>Clear space</h3>
                <p>
                  Keep a margin of at least a quarter of the logo’s height clear on every side. Nothing else sits in
                  it, not even the tagline.
                </p>
                <h3>Smallest size</h3>
                <p>120 px wide on screen. 30 mm wide in print.</p>
                <h3>Largest size</h3>
                <p>The PNGs are 1916 px wide, enough for about 160 mm in print. For anything bigger, ask for the vector master.</p>
              </div>
            </div>
            <div className="bk-lockup">
              <div className="bk-lockup-demo">
                <img src="/brand/emerge-logo-acid.png" alt="" />
                <p>A night that stays with you.</p>
              </div>
              <div>
                <h3>With the tagline</h3>
                <p>
                  The tagline sits under the logo, set right, in Work Sans Bold Italic, Ivory. Its type size is about a
                  twentieth of the logo’s width. It can also stand alone, as on the website footer.
                </p>
              </div>
            </div>
          </div>

          <ul className="bk-donts">
            <li>Don’t stretch, squash, tilt or outline it.</li>
            <li>Don’t use colours other than the four above.</li>
            <li>Don’t add shadows, glows or gradients.</li>
            <li>Don’t put it on a busy photo. Darken the picture behind it first.</li>
            <li>Don’t retype “Emerge” in a font to stand in for the logo.</li>
          </ul>

          <div className="bk-dls">
            <Download file="emerge-logo-acid.png" label="Logo, Acid" />
            <Download file="emerge-logo-night.png" label="Logo, Night" />
            <Download file="emerge-logo-ivory.png" label="Logo, Ivory" />
            <Download file="emerge-icon-512.png" label="Icon, 512 px" />
          </div>
        </div>
      </section>

      <section id="colour" className="bk-section">
        <div className="bk-wrap">
          <Head n={3} id="colour" title={<>Five colours, and Night does most of the work<i>.</i></>}>
            <p>
              Start on Night. Use Acid for the logo and the one thing to act on, Pink for the programme and Electric for
              the second line. A piece rarely needs all five at once.
            </p>
          </Head>
          <div className="bk-swatches">
            {COLOURS.map((c) => (
              <div key={c.name} className={`bk-swatch s-${c.name.toLowerCase()}`}>
                <p className="bk-swatch-name">{c.name}</p>
                <dl>
                  <div>
                    <dt>HEX</dt>
                    <dd>{c.hex}</dd>
                  </div>
                  <div>
                    <dt>RGB</dt>
                    <dd>{c.rgb}</dd>
                  </div>
                </dl>
                <p className="bk-swatch-role">{c.role}</p>
              </div>
            ))}
          </div>
          <p className="bk-note">
            Acid, Pink and Electric are brighter than four-colour print can reach. For print, ask the printer for a
            proof and judge it against the screen.
          </p>

          <h3 className="bk-sub">Pairs that read</h3>
          <div className="bk-pairs">
            {PAIRS.map((p) => (
              <div key={p.fg + p.bg} className={`bk-pair bg-${p.bg} fg-${p.fg}`}>
                <span className="bk-pair-aa">Aa</span>
                <span className="bk-pair-txt">
                  {cap(p.fg)} on {cap(p.bg)}
                  <br />
                  {p.ratio}:1 · {p.use}
                </span>
              </div>
            ))}
          </div>
          <h3 className="bk-sub">Pairs to avoid for text</h3>
          <div className="bk-pairs bk-pairs-no">
            {NEVER.map(([fg, bg, r]) => (
              <div key={fg + bg} className={`bk-pair bg-${bg} fg-${fg}`}>
                <span className="bk-pair-aa">Aa</span>
                <span className="bk-pair-txt bk-pair-label">
                  {cap(fg)} on {cap(bg)}
                  <br />
                  {r}:1 · Too faint
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="type" className="bk-section">
        <div className="bk-wrap">
          <Head n={4} id="type" title={<>Two typefaces, both free<i>.</i></>}>
            <p>Unbounded shouts the headlines. Work Sans says everything else. Use no other fonts.</p>
          </Head>
          <div className="bk-faces">
            <div className="bk-face">
              <p className="bk-face-big u">Aa</p>
              <h3>Unbounded</h3>
              <p>Headlines, the DJ, the programme lines, buttons and bands. Bold 700, ExtraBold 800, Black 900.</p>
              <p className="bk-face-set u">BE THERE FOR THE BEGINNING</p>
              <a href="https://fonts.google.com/specimen/Unbounded" target="_blank" rel="noreferrer">
                Get Unbounded from Google Fonts <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="bk-face">
              <p className="bk-face-big w">Aa</p>
              <h3>Work Sans</h3>
              <p>Body copy, dates, labels and the tagline. Regular 400 and Bold 700, with Bold Italic for the tagline.</p>
              <p className="bk-face-set w">Make meaningful connections with creative people in your town.</p>
              <a href="https://fonts.google.com/specimen/Work+Sans" target="_blank" rel="noreferrer">
                Get Work Sans from Google Fonts <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <h3 className="bk-sub">The hierarchy, from the flyer</h3>
          <div className="bk-scale">
            <div className="bk-scale-row">
              <p className="sc-date">27 Nov 2026 / Maidenhead</p>
              <span>Date line · Work Sans ExtraBold, capitals, tracking +3.5%</span>
            </div>
            <div className="bk-scale-row">
              <p className="sc-h1">
                Be there for
                <br />
                <em>the beginning</em>
              </p>
              <span>Headline · Unbounded Black, capitals, tracking −7.5%, line height 1.02. Second line in Electric</span>
            </div>
            <div className="bk-scale-row">
              <p className="sc-dj">DJ Ti Balo</p>
              <span>Headliner · Unbounded Black, capitals, Pink, tracking −6%</span>
            </div>
            <div className="bk-scale-row">
              <p className="sc-genres">
                House<b>·</b>Disco<b>·</b>Afro beats
              </p>
              <span>Genres · Work Sans Bold, Pink dots</span>
            </div>
            <div className="bk-scale-row">
              <p className="sc-extras">
                <span className="nw">--Y</span> Magazine launch<b>·</b>Interactive experiences
                <br />
                House party vibes<i>:</i> chill<b>·</b>dance<b>·</b>game
                <br />
                <span className="iv">With a fully stocked bar</span>
              </p>
              <span>Programme · Unbounded Bold, capitals, Pink with Ivory dots, Acid colon, tracking +2%</span>
            </div>
            <div className="bk-scale-row">
              <p className="sc-welcome">Make meaningful connections with creative people in your town.</p>
              <span>Statement · Work Sans Bold Italic</span>
            </div>
            <div className="bk-scale-row">
              <p className="sc-meta">
                Friday 27 Nov<b>/</b>8:30 pm
                <br />
                Ben&amp;Jack Studio, Maidenhead
              </p>
              <span>Details · Work Sans Bold, capitals, tracking +5%, Acid slash</span>
            </div>
          </div>
          <ul className="bk-donts">
            <li>Write headlines in normal sentence case and set them in capitals with styling, so the words stay correct if the style changes.</li>
            <li>Keep Unbounded tight. Its default spacing is too loose for headlines.</li>
            <li>Never set body copy in Unbounded or in capitals.</li>
          </ul>
        </div>
      </section>

      <section id="details" className="bk-section">
        <div className="bk-wrap">
          <Head n={5} id="details" title={<>The small things that make it Emerge<i>.</i></>}>
            <p>Use these the same way every time, and only these.</p>
          </Head>
          <div className="bk-details">
            <div className="bk-detail">
              <p className="bk-demo d-point">
                <span>
                  Make room for what’s been missing<i>.</i>
                </span>
              </p>
              <h3>The Pink full stop</h3>
              <p>Statement headlines end with a full stop in Pink. Not on the headline that runs over two colours.</p>
            </div>
            <div className="bk-detail">
              <p className="bk-demo d-seps">
                <span>
                  House<b>·</b>Disco<b>·</b>Afro beats
                  <br />
                  Friday 27 Nov<i>/</i>8:30 pm
                </span>
              </p>
              <h3>Dots and slashes</h3>
              <p>A middle dot separates items in a list. A slash separates date from time or place. Both take a colour, never the text colour.</p>
            </div>
            <div className="bk-detail">
              <p className="bk-demo d-num">01 / MUSIC</p>
              <h3>Numbered parts</h3>
              <p>Parts of the night are numbered, with a slash: 01 / MUSIC, 02 / CULTURE, 03 / COMPANY.</p>
            </div>
            <div className="bk-detail">
              <p className="bk-demo d-arrow">
                <span>Get me in!</span>
                <span>Tickets from £10 ↗</span>
              </p>
              <h3>The Acid band and the arrow</h3>
              <p>The call to act is an Acid band with Night type. Links that take you somewhere end with ↗.</p>
            </div>
            <div className="bk-detail">
              <div className="bk-demo d-tilt">
                <p>Get in before the list closes.</p>
              </div>
              <h3>A slight tilt</h3>
              <p>A date card or a band can sit two or three degrees off straight, as if stuck on. One per page at most. Never the logo.</p>
            </div>
            <div className="bk-detail">
              <div className="bk-demo d-ticket">
                <img src="/brand/emerge-logo-night.png" alt="" />
                <span className="d-no">№ 01</span>
                <LaunchStamp className="d-stamp" />
              </div>
              <h3>The ticket and the stamp</h3>
              <p>The ticket is a Pink card with the logo in Night, numbered № 01 for the launch. The Launch Night stamp is Electric, with rough ink.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="photography" className="bk-section">
        <div className="bk-wrap">
          <Head n={6} id="photography" title={<>Two kinds of picture<i>.</i></>}>
            <p>A close portrait in black and white, and the room seen as heat. Nothing in between.</p>
          </Head>
          <div className="bk-photos">
            <figure>
              <img src="/brand/emerge-portrait-with-star.jpg" alt="Black and white close-up of a woman laughing, a yellow star on her tooth" loading="lazy" />
              <figcaption>
                <h3>The portrait</h3>
                <p>
                  Black and white, grainy, high contrast, cropped tight on a laugh. The only colour is the Acid star on
                  her tooth. Type sits where the picture fades down to Night.
                </p>
              </figcaption>
            </figure>
            <figure>
              <img src="/brand/emerge-thermal-room.jpg" alt="A room of people talking, shown as a thermal image in electric blue and yellow" loading="lazy" />
              <figcaption>
                <h3>The thermal room</h3>
                <p>
                  People connecting, seen through a thermal camera: Electric blue with their warmth in yellow. It shows
                  the feeling of the night without showing who was there.
                </p>
              </figcaption>
            </figure>
          </div>
          <ul className="bk-donts">
            <li>No stock party photos, no colour photography, no light-show clichés.</li>
            <li>Keep the star on the portrait. It is the one spot of colour and it carries the brand.</li>
            <li>Don’t use pictures of real guests without asking them first.</li>
          </ul>
          <div className="bk-dls">
            <Download file="emerge-portrait-photo.jpg" label="Portrait, full size, no star" />
            <Download file="emerge-tooth-star.png" label="Star, to place on the portrait" />
            <Download file="emerge-portrait-with-star.jpg" label="Portrait with star, web size" />
            <Download file="emerge-thermal-room.jpg" label="Thermal room" />
            <Download file="emerge-thermal-room-warm.jpg" label="Thermal room, warmer" />
            <Download file="emerge-thermal-touch.jpg" label="Thermal room, touch" />
          </div>
          <p className="bk-note">
            The star file is the same size as the full portrait, so laid exactly over it, the star lands on her tooth.
          </p>
        </div>
      </section>

      <section id="layouts" className="bk-section">
        <div className="bk-wrap">
          <Head n={7} id="layouts" title={<>How it comes together<i>.</i></>}>
            <p>The approved pieces from the launch. Start new work from these.</p>
          </Head>
          <div className="bk-layouts">
            <figure>
              <img src="/brand/emerge-key-visual-square.jpg" alt="Square key visual" loading="lazy" />
              <figcaption>Key visual, square</figcaption>
            </figure>
            <figure>
              <img src="/brand/emerge-instagram-4x5.png" alt="Instagram post, 4 by 5" loading="lazy" />
              <figcaption>Instagram post, 4:5</figcaption>
            </figure>
            <figure className="wide">
              <img src="/brand/emerge-key-visual-4x3.jpg" alt="Key visual, 4 by 3" loading="lazy" />
              <figcaption>Key visual, 4:3</figcaption>
            </figure>
          </div>
          <div className="bk-dls">
            <Download file="emerge-flyer-A4.pdf" label="Flyer, A4" />
            <Download file="emerge-flyer-A4-bleed.pdf" label="Flyer, A4 with 3 mm bleed" />
            <Download file="emerge-key-visual-square.jpg" label="Key visual, square" />
            <Download file="emerge-key-visual-4x3.jpg" label="Key visual, 4:3" />
            <Download file="emerge-instagram-4x5.png" label="Instagram post, 4:5" />
          </div>
        </div>
      </section>

      <section id="words" className="bk-section">
        <div className="bk-wrap">
          <Head n={8} id="words" title={<>Write like an invitation<i>.</i></>}>
            <p>Warm, short and direct. Talk to one person. Tell them what the night is and how to get in.</p>
          </Head>
          <div className="bk-quotes">
            <p>Be there for the beginning.</p>
            <p>Make room for what’s been missing.</p>
            <p>Come on your own. Or bring your people.</p>
            <p>Arrive with curiosity. Notice where it takes you.</p>
            <p>Get me in!</p>
          </div>
          <dl className="bk-style">
            <div>
              <dt>Emerge</dt>
              <dd>Capital E, the rest lower case in text. Never EMERGE in a sentence.</dd>
            </div>
            <div>
              <dt>--Y</dt>
              <dd>The magazine. Two hyphens, then Y, always kept on one line.</dd>
            </div>
            <div>
              <dt>Ben&amp;Jack Studio</dt>
              <dd>No spaces around the ampersand.</dd>
            </div>
            <div>
              <dt>Dates and times</dt>
              <dd>Friday 27 Nov / 8:30 pm. Day before date, lower case pm with a space.</dd>
            </div>
            <div>
              <dt>Prices</dt>
              <dd>Tickets from £10.</dd>
            </div>
            <div>
              <dt>Spelling</dt>
              <dd>British English.</dd>
            </div>
          </dl>
        </div>
      </section>

      <section id="downloads" className="bk-section bk-last">
        <div className="bk-wrap">
          <Head n={9} id="downloads" title={<>Everything in one place<i>.</i></>} />
          <a className="bk-kit" href="/brand/emerge-brand-kit.zip" download>
            <span>Download the full kit</span>
            <span>
              ZIP · {size("emerge-brand-kit.zip")} <span aria-hidden="true">↓</span>
            </span>
          </a>
          <div className="bk-dls">
            <Download file="emerge-logo-acid.png" label="Logo, Acid" />
            <Download file="emerge-logo-night.png" label="Logo, Night" />
            <Download file="emerge-logo-ivory.png" label="Logo, Ivory" />
            <Download file="emerge-icon-512.png" label="Icon, 512 px" />
            <Download file="emerge-portrait-photo.jpg" label="Portrait, full size, no star" />
            <Download file="emerge-tooth-star.png" label="Star, to place on the portrait" />
            <Download file="emerge-portrait-with-star.jpg" label="Portrait with star, web size" />
            <Download file="emerge-thermal-room.jpg" label="Thermal room" />
            <Download file="emerge-thermal-room-warm.jpg" label="Thermal room, warmer" />
            <Download file="emerge-thermal-touch.jpg" label="Thermal room, touch" />
            <Download file="emerge-flyer-A4.pdf" label="Flyer, A4" />
            <Download file="emerge-flyer-A4-bleed.pdf" label="Flyer, A4 with 3 mm bleed" />
            <Download file="emerge-key-visual-square.jpg" label="Key visual, square" />
            <Download file="emerge-key-visual-4x3.jpg" label="Key visual, 4:3" />
            <Download file="emerge-instagram-4x5.png" label="Instagram post, 4:5" />
          </div>
          <p className="bk-note">Fonts: Unbounded and Work Sans, free from Google Fonts. Links are in part 04.</p>
          <a className="bk-top" href="#">
            Back to the top <span aria-hidden="true">↑</span>
          </a>
        </div>
      </section>
    </main>
  );
}

function cap(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}
