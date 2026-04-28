# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/performance.spec.ts >> Performance Audits >> Homepage performance audit
- Location: tests/performance.spec.ts:5:7

# Error details

```
Error: playwright lighthouse - A threshold is not matching the expectation.

performance record is 48 and is under the 50 threshold
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - navigation [ref=e3]:
      - generic [ref=e5]:
        - link "OpenBayan home" [ref=e7] [cursor=pointer]:
          - /url: /
          - generic [ref=e8]:
            - img [ref=e10]
            - generic [ref=e13]: OpenBayan
        - generic [ref=e14]:
          - list [ref=e15]:
            - listitem [ref=e16]:
              - link "Search" [ref=e17] [cursor=pointer]:
                - /url: /#features
            - listitem [ref=e18]:
              - link "Connections" [ref=e19] [cursor=pointer]:
                - /url: /#connections
            - listitem [ref=e20]:
              - link "Pipeline" [ref=e21] [cursor=pointer]:
                - /url: /#pipeline
            - listitem [ref=e22]:
              - link "Sahifah" [ref=e23] [cursor=pointer]:
                - /url: /#sahifah
            - listitem [ref=e24]:
              - link "Future" [ref=e25] [cursor=pointer]:
                - /url: /#future
          - generic [ref=e26]:
            - 'button "Theme: System" [ref=e28]':
              - img
              - generic [ref=e29]: "Theme: System"
            - link "Sign in" [ref=e30] [cursor=pointer]:
              - /url: /login
            - link "Open workspace" [ref=e31] [cursor=pointer]:
              - /url: /dashboard
              - text: Open workspace
              - img
  - main [ref=e32]:
    - generic [ref=e35]:
      - generic [ref=e36]:
        - link "OpenBayan vision Unbiased Islamic knowledge search" [ref=e37] [cursor=pointer]:
          - /url: "#features"
          - generic [ref=e38]: OpenBayan vision
          - generic [ref=e39]: Unbiased Islamic knowledge search
          - img [ref=e40]
        - heading "Search Islamic knowledge through sources, not shortcuts." [level=1] [ref=e43]
        - paragraph [ref=e44]: OpenBayan is an unbiased semantic search workspace for multi-source Islamic knowledge. We expose the source, connections, and summaries so you can connect the evidence and summarize it yourself.
        - generic [ref=e45]:
          - link "Explore workspace" [ref=e46] [cursor=pointer]:
            - /url: /dashboard
            - img
            - text: Explore workspace
          - link "View features" [ref=e47] [cursor=pointer]:
            - /url: "#features"
      - generic [ref=e48]:
        - generic [ref=e49]:
          - generic [ref=e55]:
            - img [ref=e57]
            - generic [ref=e60]: OpenBayan Workspace
          - generic [ref=e62]:
            - img [ref=e63]
            - generic [ref=e66]: Search workspace...
        - generic [ref=e67]:
          - complementary [ref=e68]:
            - generic [ref=e69]: Explorer
            - generic [ref=e70]:
              - generic [ref=e71]:
                - img [ref=e72]
                - generic [ref=e78]: sources
              - generic [ref=e79]:
                - img [ref=e80]
                - generic [ref=e83]: sahifah
              - generic [ref=e84]:
                - img [ref=e85]
                - generic [ref=e87]: alamat
              - generic [ref=e88]:
                - img [ref=e89]
                - generic [ref=e95]: graph
          - generic [ref=e96]:
            - generic [ref=e97]:
              - generic [ref=e98]: workspace
              - img [ref=e99]
              - generic [ref=e101]: documents
              - img [ref=e102]
              - generic [ref=e104]: qolb-research.sahifah
            - generic [ref=e105]:
              - generic [ref=e106]:
                - generic [ref=e107]:
                  - generic [ref=e108]:
                    - img [ref=e109]
                    - generic [ref=e112]: qolb-research.sahifah
                  - generic [ref=e113]:
                    - img [ref=e114]
                    - generic [ref=e120]: Al-Baqarah 2:10
                - generic [ref=e122]:
                  - generic [ref=e123]:
                    - img [ref=e124]
                    - text: Research Document
                  - heading "The concept of Qolb" [level=3] [ref=e127]
                  - generic [ref=e128]:
                    - paragraph [ref=e129]: "# Understanding Heart (Qolb)"
                    - paragraph [ref=e130]: Qolb refers to the heart as an inner center of understanding, intention, turning, and faith.
                    - generic [ref=e131]:
                      - paragraph [ref=e132]: فِي قُلُوبِهِم مَّرَضٌ
                      - paragraph [ref=e133]: Al-Baqarah 2:10 - "In their hearts is a disease..."
                    - paragraph [ref=e134]: The connection between qolb and reflection is central to Islamic epistemology.
              - complementary [ref=e135]:
                - generic [ref=e137]:
                  - img [ref=e138]
                  - generic [ref=e144]: Connections
                - generic [ref=e145]:
                  - generic [ref=e146]:
                    - generic [ref=e147]:
                      - generic [ref=e148]: Semantic
                      - generic [ref=e149]: 0.92 correlation
                    - generic [ref=e150]:
                      - generic [ref=e151]: Entity
                      - generic [ref=e152]: Qolb (Heart)
                    - generic [ref=e153]:
                      - generic [ref=e154]: Root
                      - generic [ref=e155]: q-l-b (ق ل ب)
                  - generic [ref=e156]:
                    - generic [ref=e157]:
                      - img [ref=e158]
                      - text: Saved Alamat
                    - generic [ref=e160]:
                      - generic [ref=e161]: Al-Hajj 22:46
                      - generic [ref=e162]: Qaf 50:37
    - generic [ref=e164]:
      - generic [ref=e165]:
        - generic [ref=e166]:
          - img [ref=e167]
          - text: Search your way + multi-source knowledge
        - heading "One search surface, many languages, many Islamic sources." [level=2] [ref=e172]
        - paragraph [ref=e173]: Search with Arabic, English, Indonesian, Russian, translation, or transliteration across Qur'an, hadith, tafsir, aqidah, fiqh, and available books from ulama. AI-made translation or transliteration is marked when official text is missing.
      - generic [ref=e174]:
        - generic [ref=e177]:
          - img [ref=e178]
          - generic [ref=e184]:
            - text: q
            - generic [ref=e185]: _
        - generic [ref=e187]:
          - generic [ref=e188]:
            - generic [ref=e189]: قلبArabic match
            - generic [ref=e190]: qalbstandard transliteration
            - generic [ref=e191]: fu'adrelated heart term
          - article [ref=e192]:
            - heading "Definition of qolb" [level=3] [ref=e194]
            - paragraph [ref=e195]: A literal qolb search is treated as transliteration first, then expanded into Arabic spelling, related forms, and semantic neighbors.
          - generic [ref=e196]:
            - article [ref=e197]:
              - generic [ref=e198]:
                - heading "Al-Hajj 22:46" [level=4] [ref=e199]
                - generic [ref=e200]: ayat
              - paragraph [ref=e201]: وَلَـٰكِن تَعْمَى الْقُلُوبُ الَّتِي فِي الصُّدُورِ
              - paragraph [ref=e202]: mentions hearts in the chests
            - article [ref=e203]:
              - generic [ref=e204]:
                - heading "Qaf 50:37" [level=4] [ref=e205]
                - generic [ref=e206]: ayat
              - paragraph [ref=e207]: لِمَن كَانَ لَهُ قَلْبٌ
              - paragraph [ref=e208]: connects qalb with reflection
    - generic [ref=e210]:
      - generic [ref=e212]:
        - tablist [ref=e213]:
          - tab "Quran" [ref=e214]
          - tab "Hadith" [ref=e215]
          - tab "Tafsir" [selected] [ref=e216]
          - tab "Fiqh" [ref=e217]
          - tab "Other Book" [ref=e218]
        - tabpanel "Tafsir" [ref=e219]:
          - generic [ref=e221]:
            - generic [ref=e222]:
              - generic [ref=e223]: Tafsir pipeline
              - generic [ref=e224]: Link explanations to ayat, then branch into ayah links, language notes, and themes.
            - img [ref=e227]:
              - generic [ref=e232]: Tafsir text
              - generic [ref=e235]: Explanation enrich
              - generic [ref=e238]: Linked ayah
              - generic [ref=e241]: Language notes
              - generic [ref=e244]: Themes
      - generic [ref=e245]:
        - generic [ref=e246]:
          - img [ref=e247]
          - text: Custom processing pipeline
        - heading "Each source are prepared with a pipeline shaped for that text." [level=2] [ref=e254]
        - paragraph [ref=e255]: A Qur'an corpus, hadith collection, tafsir, fiqh book, or modern work may need different cleaning, segmentation, translation, entity extraction, and graph rules.
    - generic [ref=e257]:
      - generic [ref=e258]:
        - generic [ref=e259]:
          - img [ref=e260]
          - text: Future direction
        - heading "From research document to presentation and offline work." [level=2] [ref=e262]
      - generic [ref=e263]:
        - article [ref=e264]:
          - img [ref=e265]
          - heading "Present From Sahifah" [level=3] [ref=e268]
          - paragraph [ref=e269]: Use Reveal.js and Chalkboard from selected sahifah text, narration notes, and PDF export.
        - article [ref=e270]:
          - img [ref=e271]
          - heading "Work Offline" [level=3] [ref=e276]
          - paragraph [ref=e277]: Write sahifah, manage alamat, prepare presentations, and download sources for local search.
  - contentinfo [ref=e278]:
    - generic [ref=e279]:
      - generic [ref=e280]:
        - generic [ref=e281]:
          - link "go home" [ref=e282] [cursor=pointer]:
            - /url: /
            - generic [ref=e283]:
              - img [ref=e285]
              - generic [ref=e288]: OpenBayan
          - paragraph [ref=e289]: OpenBayan is an unbiased semantic search workspace for multi-source Islamic knowledge, rich connections, alamat, majmu', and sahifah.
        - generic [ref=e290]:
          - generic [ref=e291]:
            - generic [ref=e292]: Workspace
            - link "Search" [ref=e293] [cursor=pointer]:
              - /url: /#features
            - link "Connections" [ref=e294] [cursor=pointer]:
              - /url: /#connections
            - link "Pipeline" [ref=e295] [cursor=pointer]:
              - /url: /#pipeline
            - link "Sahifah" [ref=e296] [cursor=pointer]:
              - /url: /#sahifah
            - link "Future" [ref=e297] [cursor=pointer]:
              - /url: /#future
          - generic [ref=e298]:
            - generic [ref=e299]: Sources
            - link "Quran" [ref=e300] [cursor=pointer]:
              - /url: /#search
            - link "Hadith" [ref=e301] [cursor=pointer]:
              - /url: /#search
            - link "Tafsir" [ref=e302] [cursor=pointer]:
              - /url: /#search
            - link "Arabic Roots" [ref=e303] [cursor=pointer]:
              - /url: /#search
          - generic [ref=e304]:
            - generic [ref=e305]: Platform
            - link "Semantic Search" [ref=e306] [cursor=pointer]:
              - /url: /#features
            - link "Knowledge Graph" [ref=e307] [cursor=pointer]:
              - /url: /#connections
            - link "Alamat" [ref=e308] [cursor=pointer]:
              - /url: /#sahifah
            - link "Majmu'" [ref=e309] [cursor=pointer]:
              - /url: /#sahifah
          - generic [ref=e310]:
            - generic [ref=e311]: Legal
            - link "Licence" [ref=e312] [cursor=pointer]:
              - /url: "#"
            - link "Privacy" [ref=e313] [cursor=pointer]:
              - /url: /privacy
            - link "Terms" [ref=e314] [cursor=pointer]:
              - /url: /terms
            - link "Security" [ref=e315] [cursor=pointer]:
              - /url: "#"
      - generic [ref=e316]:
        - generic [ref=e317]: © 2026 OpenBayan. Islamic research knowledge workspace.
        - generic [ref=e318]:
          - link "X/Twitter" [ref=e319] [cursor=pointer]:
            - /url: "#"
            - img [ref=e320]
          - link "LinkedIn" [ref=e322] [cursor=pointer]:
            - /url: "#"
            - img [ref=e323]
          - link "Facebook" [ref=e325] [cursor=pointer]:
            - /url: "#"
            - img [ref=e326]
          - link "Threads" [ref=e328] [cursor=pointer]:
            - /url: "#"
            - img [ref=e329]
          - link "Instagram" [ref=e331] [cursor=pointer]:
            - /url: "#"
            - img [ref=e332]
          - link "TikTok" [ref=e334] [cursor=pointer]:
            - /url: "#"
            - img [ref=e335]
  - button "Open Next.js Dev Tools" [ref=e342] [cursor=pointer]:
    - img [ref=e343]
  - alert [ref=e346]
```

# Test source

```ts
  1  | import { test, chromium } from '@playwright/test';
  2  | import { playAudit } from 'playwright-lighthouse';
  3  | 
  4  | test.describe('Performance Audits', () => {
  5  |   test('Homepage performance audit', async () => {
  6  |     test.setTimeout(180000); // 180 seconds
  7  |     // 1. Launch Chrome and open the debugging port
  8  |     const browser = await chromium.launch({
  9  |       args: ['--remote-debugging-port=9222'],
  10 |     });
  11 |     
  12 |     const page = await browser.newPage();
  13 |     
  14 |     // Navigate to the local dev server
  15 |     await page.goto('http://localhost:3000');
  16 | 
  17 |     // 2. Hand the page over to Lighthouse
> 18 |     await playAudit({
     |     ^ Error: playwright lighthouse - A threshold is not matching the expectation.
  19 |       page: page,
  20 |       port: 9222,
  21 |       thresholds: {
  22 |         performance: 50,
  23 |         accessibility: 80,
  24 |         'best-practices': 80,
  25 |         seo: 80,
  26 |       },
  27 |       reports: {
  28 |         formats: { html: true, json: true },
  29 |         name: `homepage-audit-${new Date().toISOString().split('T')[0]}`,
  30 |         directory: `./lighthouse-reports`
  31 |       }
  32 |     });
  33 | 
  34 |     await browser.close();
  35 |   });
  36 | 
  37 |   test('Workspace performance audit', async () => {
  38 |     test.setTimeout(300000); // 300 seconds for workspace
  39 |     const browser = await chromium.launch({
  40 |       args: ['--remote-debugging-port=9222'],
  41 |     });
  42 |     
  43 |     const page = await browser.newPage();
  44 |     
  45 |     // 1. Login
  46 |     await page.goto('http://localhost:3000/login');
  47 |     await page.fill('#login-email', 'user@openbayan.org');
  48 |     await page.fill('#login-password', 'password123');
  49 |     await page.click('button[type="submit"]');
  50 |     
  51 |     // Wait for navigation to dashboard
  52 |     await page.waitForURL('**/dashboard**');
  53 |     
  54 |     // Navigate to workspace
  55 |     await page.goto('http://localhost:3000/workspace');
  56 |     await page.waitForLoadState('networkidle');
  57 | 
  58 |     // 2. Hand the page over to Lighthouse
  59 |     await playAudit({
  60 |       page: page,
  61 |       port: 9222,
  62 |       thresholds: {
  63 |         performance: 30, // Workspace is heavy CSR, set lower threshold for initial check
  64 |         accessibility: 70,
  65 |         'best-practices': 70,
  66 |         seo: 70,
  67 |       },
  68 |       reports: {
  69 |         formats: { html: true, json: true },
  70 |         name: `workspace-audit-${new Date().toISOString().split('T')[0]}`,
  71 |         directory: `./lighthouse-reports`
  72 |       }
  73 |     });
  74 | 
  75 |     await browser.close();
  76 |   });
  77 | });
  78 | 
```