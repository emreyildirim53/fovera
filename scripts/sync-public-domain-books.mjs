import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const booksDir = path.join(repoRoot, 'public', 'books');
const licensesDir = path.join(booksDir, 'licenses');
const coversDir = path.join(repoRoot, 'public', 'covers');
const generatedCatalogPath = path.join(repoRoot, 'src', 'library', 'presetBookCatalog.generated.ts');

const PAGE_BREAK = '\n\n---PAGE---\n\n';
const TODAY = 'July 18, 2026';
const PAGE_PARAGRAPH_LIMIT = 8;
const PAGE_CHAR_LIMIT = 4200;

const BOOKS = [
  {
    id: 'p1',
    gutenbergId: 11,
    fileName: 'alice-adventures-in-wonderland.txt',
    title: "Alice's Adventures in Wonderland",
    localizedTitle: 'Alice Harikalar Diyarında',
    author: 'Lewis Carroll',
    authorYears: '1832-1898',
    coverPath: '/covers/alice-adventures-in-wonderland.jpg',
    startMarker: 'Alice was beginning to get very tired of sitting by her sister',
  },
  {
    id: 'p2',
    gutenbergId: 16865,
    fileName: 'pinocchio-the-tale-of-a-puppet.txt',
    title: 'Pinocchio: The Tale of a Puppet',
    localizedTitle: 'Pinokyo',
    author: 'Carlo Collodi',
    authorYears: '1826-1890',
    coverPath: '/covers/pinocchio-the-tale-of-a-puppet.jpg',
    startMarker: 'There was once upon a time a piece of wood in the shop of an old',
  },
  {
    id: 'p3',
    gutenbergId: 120,
    fileName: 'treasure-island.txt',
    title: 'Treasure Island',
    localizedTitle: 'Define Adası',
    author: 'Robert Louis Stevenson',
    authorYears: '1850-1894',
    coverPath: '/covers/treasure-island.jpg',
    startMarker: 'Squire Trelawney, Dr. Livesey, and the rest of these gentlemen having',
  },
  {
    id: 'p4',
    gutenbergId: 55,
    fileName: 'the-wonderful-wizard-of-oz.txt',
    title: 'The Wonderful Wizard of Oz',
    localizedTitle: 'Oz Büyücüsü',
    author: 'L. Frank Baum',
    authorYears: '1856-1919',
    coverPath: '/covers/the-wonderful-wizard-of-oz.jpg',
    startMarker: 'Dorothy lived in the midst of the great Kansas prairies',
  },
  {
    id: 'p5',
    gutenbergId: 113,
    fileName: 'the-secret-garden.txt',
    title: 'The Secret Garden',
    localizedTitle: 'Gizli Bahçe',
    author: 'Frances Hodgson Burnett',
    authorYears: '1849-1924',
    coverPath: '/covers/the-secret-garden.jpg',
    startMarker: 'When Mary Lennox was sent to Misselthwaite Manor',
  },
  {
    id: 'p6',
    gutenbergId: 146,
    fileName: 'a-little-princess.txt',
    title: 'A Little Princess',
    localizedTitle: 'Küçük Prenses',
    author: 'Frances Hodgson Burnett',
    authorYears: '1849-1924',
    coverPath: '/covers/a-little-princess.jpg',
    startMarker: "Once on a dark winter's day, when the yellow fog hung so thick and",
  },
  {
    id: 'anne-of-green-gables',
    gutenbergId: 45,
    fileName: 'anne-of-green-gables.txt',
    title: 'Anne of Green Gables',
    localizedTitle: 'Yeşilin Kızı Anne',
    author: 'L. M. Montgomery',
    authorYears: '1874-1942',
    coverPath: '/covers/anne-of-green-gables.svg',
    startMarker: 'MRS. Rachel Lynde lived just where the Avonlea main road dipped down',
  },
  {
    id: 'peter-pan',
    gutenbergId: 16,
    fileName: 'peter-pan.txt',
    title: 'Peter Pan',
    localizedTitle: 'Peter Pan',
    author: 'J. M. Barrie',
    authorYears: '1860-1937',
    coverPath: '/covers/peter-pan.svg',
    startMarker: 'All children, except one, grow up.',
  },
  {
    id: 'the-adventures-of-tom-sawyer',
    gutenbergId: 74,
    fileName: 'the-adventures-of-tom-sawyer.txt',
    title: 'The Adventures of Tom Sawyer',
    localizedTitle: "Tom Sawyer'ın Maceraları",
    author: 'Mark Twain',
    authorYears: '1835-1910',
    coverPath: '/covers/the-adventures-of-tom-sawyer.svg',
    startMarker: '“Tom!”',
  },
  {
    id: 'little-women',
    gutenbergId: 514,
    fileName: 'little-women.txt',
    title: 'Little Women',
    localizedTitle: 'Küçük Kadınlar',
    author: 'Louisa May Alcott',
    authorYears: '1832-1888',
    coverPath: '/covers/little-women.svg',
    startMarker: 'CHAPTER ONE PLAYING PILGRIMS',
  },
  {
    id: 'black-beauty',
    gutenbergId: 271,
    fileName: 'black-beauty.txt',
    title: 'Black Beauty',
    localizedTitle: 'Siyah İnci',
    author: 'Anna Sewell',
    authorYears: '1820-1878',
    coverPath: '/covers/black-beauty.svg',
    startMarker: 'The first place that I can well remember was a large pleasant meadow',
  },
  {
    id: 'heidi',
    gutenbergId: 20781,
    fileName: 'heidi.txt',
    title: 'Heidi',
    localizedTitle: 'Heidi',
    author: 'Johanna Spyri',
    authorYears: '1827-1901',
    coverPath: '/covers/heidi.svg',
    startMarker: 'The little old town of Mayenfeld is charmingly situated.',
  },
  {
    id: 'the-wind-in-the-willows',
    gutenbergId: 289,
    fileName: 'the-wind-in-the-willows.txt',
    title: 'The Wind in the Willows',
    localizedTitle: 'Söğütlükte Rüzgar',
    author: 'Kenneth Grahame',
    authorYears: '1859-1932',
    coverPath: '/covers/the-wind-in-the-willows.svg',
    startMarker: 'The Mole had been working very hard all the morning',
  },
  {
    id: 'around-the-world-in-eighty-days',
    gutenbergId: 103,
    fileName: 'around-the-world-in-eighty-days.txt',
    title: 'Around the World in Eighty Days',
    localizedTitle: 'Seksen Günde Devriâlem',
    author: 'Jules Verne',
    authorYears: '1828-1905',
    coverPath: '/covers/around-the-world-in-eighty-days.svg',
    startMarker: 'Mr. Phileas Fogg lived, in 1872, at No. 7, Saville Row',
  },
  {
    id: 'the-adventures-of-sherlock-holmes',
    gutenbergId: 1661,
    fileName: 'the-adventures-of-sherlock-holmes.txt',
    title: 'The Adventures of Sherlock Holmes',
    localizedTitle: "Sherlock Holmes'un Maceraları",
    author: 'Arthur Conan Doyle',
    authorYears: '1859-1930',
    coverPath: '/covers/the-adventures-of-sherlock-holmes.svg',
    startMarker: 'I. A SCANDAL IN BOHEMIA',
  },
  {
    id: 'the-jungle-book',
    gutenbergId: 236,
    fileName: 'the-jungle-book.txt',
    title: 'The Jungle Book',
    localizedTitle: 'Orman Kitabı',
    author: 'Rudyard Kipling',
    authorYears: '1865-1936',
    coverPath: '/covers/the-jungle-book.svg',
    startMarker: 'It was seven o’clock of a very warm evening in the Seeonee hills',
  },
  {
    id: 'the-time-machine',
    gutenbergId: 35,
    fileName: 'the-time-machine.txt',
    title: 'The Time Machine',
    localizedTitle: 'Zaman Makinesi',
    author: 'H. G. Wells',
    authorYears: '1866-1946',
    coverPath: '/covers/the-time-machine.svg',
    startMarker: 'The Time Traveller (for so it will be convenient to speak of him)',
  },
  {
    id: 'the-hound-of-the-baskervilles',
    gutenbergId: 2852,
    fileName: 'the-hound-of-the-baskervilles.txt',
    title: 'The Hound of the Baskervilles',
    localizedTitle: 'Baskerville Tazısı',
    author: 'Arthur Conan Doyle',
    authorYears: '1859-1930',
    coverPath: '/covers/the-hound-of-the-baskervilles.svg',
    startMarker: 'Mr. Sherlock Holmes, who was usually very late in the mornings',
  },
  {
    id: 'kidnapped',
    gutenbergId: 421,
    fileName: 'kidnapped.txt',
    title: 'Kidnapped',
    localizedTitle: 'Kaçırılan',
    author: 'Robert Louis Stevenson',
    authorYears: '1850-1894',
    coverPath: '/covers/kidnapped.svg',
    startMarker: 'I will begin the story of my adventures with a certain morning',
  },
  {
    id: 'the-call-of-the-wild',
    gutenbergId: 215,
    fileName: 'the-call-of-the-wild.txt',
    title: 'The Call of the Wild',
    localizedTitle: 'Vahşetin Çağrısı',
    author: 'Jack London',
    authorYears: '1876-1916',
    coverPath: '/covers/the-call-of-the-wild.svg',
    startMarker: 'Buck did not read the newspapers',
  },
  {
    id: 'the-lost-world',
    gutenbergId: 139,
    fileName: 'the-lost-world.txt',
    title: 'The Lost World',
    localizedTitle: 'Kayıp Dünya',
    author: 'Arthur Conan Doyle',
    authorYears: '1859-1930',
    coverPath: '/covers/the-lost-world.svg',
    startMarker: 'CHAPTER I\n\n"There Are Heroisms All Round Us"',
  },
  {
    id: 'the-island-of-doctor-moreau',
    gutenbergId: 159,
    fileName: 'the-island-of-doctor-moreau.txt',
    title: 'The Island of Doctor Moreau',
    localizedTitle: "Dr. Moreau'nun Adası",
    author: 'H. G. Wells',
    authorYears: '1866-1946',
    coverPath: '/covers/the-island-of-doctor-moreau.svg',
    startMarker: 'I do not propose to add anything to what has already been written',
  },
];

async function main() {
  await fs.mkdir(booksDir, { recursive: true });
  await fs.mkdir(licensesDir, { recursive: true });
  await fs.mkdir(coversDir, { recursive: true });

  const generatedCatalog = [];
  for (let index = 0; index < BOOKS.length; index++) {
    const book = BOOKS[index];
    console.log(`[${index + 1}/${BOOKS.length}] ${book.title}`);

    const catalogHtml = await fetchText(`https://www.gutenberg.org/ebooks/${book.gutenbergId}`);
    assertPublicDomainNotice(book, catalogHtml);

    const rawText = await fetchText(`https://www.gutenberg.org/ebooks/${book.gutenbergId}.txt.utf-8`);
    const cleanedText = cleanBookText(book, rawText);
    const pages = paginateText(cleanedText);

    await fs.writeFile(path.join(booksDir, book.fileName), `${pages.join(PAGE_BREAK)}\n`, 'utf8');
    await fs.writeFile(path.join(licensesDir, `${book.fileName.replace(/\.txt$/u, '')}-source.md`), buildSourceNote(book), 'utf8');

    if (book.coverPath.endsWith('.svg')) {
      await fs.writeFile(path.join(coversDir, path.basename(book.coverPath)), buildPosterCover(book), 'utf8');
    }

    generatedCatalog.push({
      id: book.id,
      title: book.title,
      localizedTitle: book.localizedTitle,
      author: book.author,
      coverPath: book.coverPath,
      textPath: `/books/${book.fileName}`,
      pageCount: pages.length,
      sourceLocale: 'en',
    });

    await sleep(250);
  }

  await fs.writeFile(generatedCatalogPath, renderCatalogModule(generatedCatalog), 'utf8');
  console.log(`Wrote ${path.relative(repoRoot, generatedCatalogPath)}`);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Fovera/1.0 (+https://local.project)',
      'accept-language': 'en-US,en;q=0.9',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

function assertPublicDomainNotice(book, catalogHtml) {
  if (!catalogHtml.includes('Public domain in the USA.')) {
    throw new Error(`${book.title} is missing the expected Project Gutenberg public-domain notice.`);
  }
}

function cleanBookText(book, rawText) {
  const withoutBoilerplate = stripProjectGutenbergBoilerplate(rawText);
  const withoutFrontMatter = trimToStartMarker(book.startMarker, withoutBoilerplate);
  return withoutFrontMatter
    .replace(/^\[Illustration[^\n]*\]\s*/gmu, '')
    .replace(/^\s*cover\s*$/gimu, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripProjectGutenbergBoilerplate(rawText) {
  const normalized = rawText.replace(/\r/g, '');
  const withoutHeader = normalized.replace(/^[\s\S]*?\*\*\* START OF THE PROJECT GUTENBERG EBOOK[^\n]*\n/u, '');
  return withoutHeader.replace(/\*\*\* END OF THE PROJECT GUTENBERG EBOOK[\s\S]*$/u, '').trim();
}

function trimToStartMarker(startMarker, text) {
  if (!startMarker) return text;

  const candidates = [
    startMarker,
    startMarker.replaceAll('“', '"').replaceAll('”', '"').replaceAll('’', "'").replaceAll('—', '-'),
  ];
  for (const candidate of candidates) {
    const index = text.indexOf(candidate);
    if (index >= 0) {
      return text.slice(index).trim();
    }
  }

  const normalizedText = softNormalize(text);
  for (const candidate of candidates) {
    const normalizedCandidate = softNormalize(candidate);
    const index = normalizedText.indexOf(normalizedCandidate);
    if (index >= 0) {
      return text.slice(index).trim();
    }
  }

  console.warn(`Start marker not found: ${startMarker}`);
  return text;
}

function paginateText(text) {
  const paragraphs = text
    .split(/\n\s*\n/u)
    .map((part) => part.replace(/\n+/g, ' ').trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return [''];

  const pages = [];
  let currentPage = [];
  let currentLength = 0;

  for (const paragraph of paragraphs) {
    const nextLength = currentLength + paragraph.length;
    if (currentPage.length >= PAGE_PARAGRAPH_LIMIT || nextLength > PAGE_CHAR_LIMIT) {
      pages.push(currentPage.join('\n\n'));
      currentPage = [];
      currentLength = 0;
    }

    currentPage.push(paragraph);
    currentLength += paragraph.length;
  }

  if (currentPage.length > 0) {
    pages.push(currentPage.join('\n\n'));
  }

  return pages;
}

function buildSourceNote(book) {
  return [
    `# ${book.title}`,
    '',
    `- Source: https://www.gutenberg.org/ebooks/${book.gutenbergId}`,
    `- Plain text: https://www.gutenberg.org/ebooks/${book.gutenbergId}.txt.utf-8`,
    `- Author: ${book.author} (${book.authorYears})`,
    `- Checked on: ${TODAY}`,
    '- Project Gutenberg catalog status: "Public domain in the USA."',
    '- Fovera note: the author died before July 18, 1956, so the original work is also outside a standard life-plus-70 term as of July 18, 2026.',
    '',
    'This local note was generated to keep the provenance beside the downloaded text asset.',
    '',
  ].join('\n');
}

function buildPosterCover(book) {
  const palette = selectPalette(book.id);
  const lines = wrapTitle(book.localizedTitle || book.title, 16, 3);
  const titleY = 290 - (lines.length - 1) * 54;
  const accent = palette.accent;
  const shadow = hexToRgba(accent, 0.38);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.start}"/>
      <stop offset="55%" stop-color="${palette.middle}"/>
      <stop offset="100%" stop-color="${palette.end}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0" cy="0" r="1" gradientTransform="translate(960 240) rotate(120) scale(620 540)">
      <stop offset="0%" stop-color="${hexToRgba(palette.accent, 0.58)}"/>
      <stop offset="100%" stop-color="${hexToRgba(palette.accent, 0)}"/>
    </radialGradient>
    <linearGradient id="stripe" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${hexToRgba('#ffffff', 0.08)}"/>
      <stop offset="100%" stop-color="${hexToRgba('#ffffff', 0)}"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="40"/>
    </filter>
  </defs>

  <rect width="1200" height="1600" fill="url(#bg)"/>
  <rect width="1200" height="1600" fill="url(#glow)"/>
  <circle cx="980" cy="270" r="210" fill="${hexToRgba('#ffffff', 0.08)}" filter="url(#soft)"/>
  <path d="M0 1110C175 980 335 920 480 930C655 940 822 1135 1200 1060V1600H0V1110Z" fill="${hexToRgba('#05070c', 0.38)}"/>
  <path d="M118 1188C300 1048 470 1002 628 1020C796 1040 938 1156 1108 1116" stroke="${hexToRgba('#ffffff', 0.13)}" stroke-width="4"/>
  <path d="M126 1236C320 1102 488 1064 630 1082C778 1100 934 1212 1074 1182" stroke="${hexToRgba('#ffffff', 0.06)}" stroke-width="2"/>
  <rect x="82" y="82" width="1036" height="1436" rx="56" stroke="${hexToRgba('#ffffff', 0.18)}" stroke-width="2"/>
  <rect x="120" y="120" width="960" height="1360" rx="36" stroke="${hexToRgba('#ffffff', 0.08)}" stroke-width="2"/>
  <rect x="140" y="144" width="920" height="10" rx="5" fill="url(#stripe)"/>
  <text x="140" y="196" fill="${hexToRgba('#ffffff', 0.72)}" font-size="30" font-weight="700" letter-spacing="0.24em" font-family="Avenir Next, Helvetica Neue, Arial, sans-serif">FOVERA CLASSICS</text>
  <text x="140" y="258" fill="${accent}" font-size="22" font-weight="700" letter-spacing="0.36em" font-family="Avenir Next, Helvetica Neue, Arial, sans-serif">PUBLIC DOMAIN EDITION</text>
  ${lines
    .map(
      (line, index) =>
        `<text x="140" y="${titleY + index * 98}" fill="#F8FBFF" font-size="92" font-weight="600" letter-spacing="-0.04em" font-family="Iowan Old Style, Baskerville, Times New Roman, serif">${escapeXml(
          line
        )}</text>`
    )
    .join('\n  ')}
  <text x="140" y="470" fill="${hexToRgba('#ffffff', 0.82)}" font-size="38" font-weight="600" letter-spacing="0.14em" font-family="Avenir Next, Helvetica Neue, Arial, sans-serif">${escapeXml(
    book.author.toUpperCase()
  )}</text>
  <path d="M140 520H434" stroke="${hexToRgba('#ffffff', 0.22)}" stroke-width="3"/>
  <path d="M140 910C258 780 390 700 534 704C688 708 828 796 940 928" stroke="${shadow}" stroke-width="20" stroke-linecap="round" opacity="0.9"/>
  <path d="M162 910C284 794 404 734 532 738C668 742 802 820 916 928" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>
  <text x="140" y="1432" fill="${hexToRgba('#ffffff', 0.76)}" font-size="28" font-weight="600" letter-spacing="0.22em" font-family="Avenir Next, Helvetica Neue, Arial, sans-serif">FOCUSED READING • CURATED FOR FOVERA</text>
</svg>
`;
}

function selectPalette(id) {
  const palettes = [
    { start: '#1B3158', middle: '#2F5AA7', end: '#0C1423', accent: '#EFCB68' },
    { start: '#283B2E', middle: '#52785E', end: '#0F1712', accent: '#F4D9A4' },
    { start: '#4E2131', middle: '#8C4E6A', end: '#180B11', accent: '#FFD8A8' },
    { start: '#1D3040', middle: '#3E6B82', end: '#0B1218', accent: '#DCEFFF' },
    { start: '#3D2A1F', middle: '#8B5A39', end: '#160F0B', accent: '#F7D6A0' },
    { start: '#2F2644', middle: '#675C99', end: '#110D19', accent: '#D8D0FF' },
    { start: '#3A1E17', middle: '#9A4A2A', end: '#170D0A', accent: '#FFD4A8' },
    { start: '#1C3641', middle: '#356979', end: '#0A1317', accent: '#BDECF7' },
  ];

  let hash = 0;
  for (const char of id) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return palettes[hash % palettes.length];
}

function wrapTitle(title, maxLineLength, maxLines) {
  const words = title.split(/\s+/u).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLineLength || current.length === 0) {
      current = candidate;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  if (lines.length <= maxLines) return lines;

  const compact = lines.slice(0, maxLines - 1);
  compact.push(lines.slice(maxLines - 1).join(' '));
  return compact;
}

function renderCatalogModule(entries) {
  const body = entries
    .map(
      (entry) => `  {
    id: ${JSON.stringify(entry.id)},
    title: ${JSON.stringify(entry.title)},
    localizedTitles: { tr: ${JSON.stringify(entry.localizedTitle)} },
    author: ${JSON.stringify(entry.author)},
    cover: ${JSON.stringify(entry.coverPath)},
    textPath: ${JSON.stringify(entry.textPath)},
    pageCount: ${entry.pageCount},
    sourceLocale: 'en',
  }`
    )
    .join(',\n');

  return `import type { BookLocale } from '../core/types';

export interface PresetBookDefinition {
  id: string;
  title: string;
  localizedTitles?: Partial<Record<BookLocale, string>>;
  author: string;
  cover: string;
  textPath: string;
  pageCount: number;
  sourceLocale: BookLocale;
}

export const presetBookCatalog = [
${body}
] satisfies readonly PresetBookDefinition[];

export const presetLocalizedTitles = Object.fromEntries(
  presetBookCatalog
    .filter((book) => book.localizedTitles)
    .map((book) => [book.id, book.localizedTitles ?? {}])
) as Record<string, Partial<Record<BookLocale, string>>>;
`;
}

function hexToRgba(hex, alpha) {
  const value = hex.replace('#', '');
  const channels = value.length === 3 ? value.split('').map((part) => part + part) : value.match(/.{1,2}/g);
  if (!channels || channels.length !== 3) return `rgba(255,255,255,${alpha})`;
  const [r, g, b] = channels.map((part) => Number.parseInt(part, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function softNormalize(value) {
  return value
    .replaceAll('“', '"')
    .replaceAll('”', '"')
    .replaceAll('’', "'")
    .replaceAll('—', '-')
    .replaceAll('–', '-')
    .toLocaleLowerCase('en');
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
