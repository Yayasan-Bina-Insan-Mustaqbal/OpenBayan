# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/performance.spec.ts >> Homepage performance audit
- Location: tests/performance.spec.ts:4:5

# Error details

```
Error: playwright lighthouse - A threshold is not matching the expectation.

performance record is 35 and is under the 50 threshold
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
    - generic [ref=e37]:
      - generic [ref=e38]:
        - link "OpenBayan vision Unbiased Islamic knowledge search" [ref=e39] [cursor=pointer]:
          - /url: "#features"
          - generic [ref=e40]: OpenBayan vision
          - generic [ref=e41]: Unbiased Islamic knowledge search
          - img [ref=e42]
        - heading "Search Islamic knowledge through sources, not shortcuts." [level=1] [ref=e45]
        - paragraph [ref=e46]: OpenBayan is an unbiased semantic search workspace for multi-source Islamic knowledge. We expose the source, connections, and summaries so you can connect the evidence and summarize it yourself.
        - generic [ref=e47]:
          - link "Explore workspace" [ref=e48] [cursor=pointer]:
            - /url: /dashboard
            - img
            - text: Explore workspace
          - link "View features" [ref=e49] [cursor=pointer]:
            - /url: "#features"
      - generic [ref=e50]:
        - generic [ref=e51]:
          - generic [ref=e52]:
            - img [ref=e54]
            - generic [ref=e57]: OpenBayan Workspace
          - generic [ref=e58]:
            - generic [ref=e59]: Search
            - generic [ref=e61]: Graph
            - generic [ref=e63]: Alamat
            - generic [ref=e65]: Sahifah
        - generic [ref=e66]:
          - complementary [ref=e67]:
            - generic [ref=e68]: Sources
            - generic [ref=e69]:
              - generic [ref=e70]:
                - generic [ref=e71]: Qur'an
                - generic [ref=e72]: "on"
              - generic [ref=e73]:
                - generic [ref=e74]: Hadith
                - generic [ref=e75]: "on"
              - generic [ref=e76]:
                - generic [ref=e77]: Tafsir
                - generic [ref=e78]: "on"
              - generic [ref=e79]:
                - generic [ref=e80]: Aqidah
                - generic [ref=e81]: "on"
              - generic [ref=e82]:
                - generic [ref=e83]: Fiqh
                - generic [ref=e84]: "on"
              - generic [ref=e85]:
                - generic [ref=e86]: Books
                - generic [ref=e87]: "on"
            - generic [ref=e88]: Input modes
            - generic [ref=e89]:
              - generic [ref=e90]: Arabic
              - generic [ref=e91]: ID
              - generic [ref=e92]: EN
              - generic [ref=e93]: RU
              - generic [ref=e94]: Translit
          - generic [ref=e95]:
            - generic [ref=e97]:
              - img [ref=e98]
              - text: mercy in social obligation / رحمة في المعاملة
            - generic [ref=e104]:
              - article [ref=e105]:
                - generic [ref=e106]:
                  - heading "Qur'an result" [level=2] [ref=e107]
                  - generic [ref=e108]: source
                - paragraph [ref=e109]: Ayat, official translation when available, AI warning when generated, related roots, and nearby semantic matches.
                - paragraph [ref=e110]: وَرَحْمَتِي وَسِعَتْ كُلَّ شَيْءٍ
              - article [ref=e111]:
                - generic [ref=e112]:
                  - heading "Hadith and fiqh connection" [level=2] [ref=e113]
                  - generic [ref=e114]: graph
                - paragraph [ref=e115]: Related narrations, legal categories, entities, and strong graph edges remain visible beside the source text.
                - paragraph [ref=e116]: الراحمون يرحمهم الرحمن
              - article [ref=e117]:
                - generic [ref=e118]:
                  - heading "Alamat capture" [level=2] [ref=e119]
                  - generic [ref=e120]: note
                - paragraph [ref=e121]: Save the query, passage, root, entity, or category into majmu' before writing a sahifah.
                - paragraph [ref=e122]: حفظ الدليل ثم تحرير الفهم
          - complementary [ref=e123]:
            - generic [ref=e124]:
              - img [ref=e125]
              - text: Connection panel
            - generic [ref=e131]:
              - generic [ref=e132]:
                - generic [ref=e133]: Semantic
                - generic [ref=e134]: "0.92"
              - generic [ref=e135]:
                - generic [ref=e136]: Entity
                - generic [ref=e137]: rahmah
              - generic [ref=e138]:
                - generic [ref=e139]: Root
                - generic [ref=e140]: ر ح م
              - generic [ref=e141]:
                - generic [ref=e142]: Reference
                - generic [ref=e143]: Wikipedia + web
            - generic [ref=e144]:
              - generic [ref=e145]:
                - img [ref=e146]
                - text: Sahifah draft
              - generic [ref=e149]:
                - generic [ref=e150]: Narration block
                - generic [ref=e151]: Embedded ayat
                - generic [ref=e152]: Majmu' alamat
    - generic [ref=e154]:
      - generic [ref=e155]:
        - generic [ref=e156]:
          - img [ref=e157]
          - text: Search your way + multi-source knowledge
        - heading "One search surface, many languages, many Islamic sources." [level=2] [ref=e162]
        - paragraph [ref=e163]: Search with Arabic, English, Indonesian, Russian, translation, or transliteration across Qur'an, hadith, tafsir, aqidah, fiqh, and available books from ulama. AI-made translation or transliteration is marked when official text is missing.
      - generic [ref=e164]:
        - generic [ref=e167]:
          - img [ref=e168]
          - generic [ref=e174]:
            - text: qolb
            - generic [ref=e175]: _
        - generic [ref=e177]:
          - generic [ref=e178]:
            - generic [ref=e179]: قلبArabic match
            - generic [ref=e180]: qalbstandard transliteration
            - generic [ref=e181]: fu'adrelated heart term
          - article [ref=e182]:
            - heading "Definition of qolb" [level=3] [ref=e184]
            - paragraph [ref=e185]: A literal qolb search is treated as transliteration first, then expanded into Arabic spelling, related forms, and semantic neighbors.
          - generic [ref=e186]:
            - article [ref=e187]:
              - generic [ref=e188]:
                - heading "Al-Hajj 22:46" [level=4] [ref=e189]
                - generic [ref=e190]: ayat
              - paragraph [ref=e191]: وَلَـٰكِن تَعْمَى الْقُلُوبُ الَّتِي فِي الصُّدُورِ
              - paragraph [ref=e192]: mentions hearts in the chests
            - article [ref=e193]:
              - generic [ref=e194]:
                - heading "Qaf 50:37" [level=4] [ref=e195]
                - generic [ref=e196]: ayat
              - paragraph [ref=e197]: لِمَن كَانَ لَهُ قَلْبٌ
              - paragraph [ref=e198]: connects qalb with reflection
    - generic [ref=e200]:
      - generic [ref=e202]:
        - generic [ref=e204]:
          - generic [ref=e205]: Layer 4
          - heading "Arabic root relation" [level=3] [ref=e206]
          - paragraph [ref=e207]: Root words, popular variations, and related forms reveal broader Arabic links.
          - generic [ref=e208]: ق ل ب → قلوب، قلب، تقلب
        - generic [ref=e210]:
          - generic [ref=e211]: Layer 1
          - heading "Exact text match" [level=3] [ref=e212]
          - paragraph [ref=e213]: Character, word, and sentence similarity catch direct wording across source text.
          - generic [ref=e214]: قلب / qolb / heart
        - generic [ref=e216]:
          - generic [ref=e217]: Layer 2
          - heading "Semantic embedding" [level=3] [ref=e218]
          - paragraph [ref=e219]: Meaning-aware vectors surface passages related by concept, not only same words.
          - generic [ref=e220]: heart, intention, insight
        - generic [ref=e222]:
          - generic [ref=e223]: Layer 3
          - heading "Entities + graph" [level=3] [ref=e224]
          - paragraph [ref=e225]: Detected entities connect through strong graph edges, categories, and references.
          - generic [ref=e226]: Wikipedia + web context
      - generic [ref=e227]:
        - generic [ref=e228]:
          - img [ref=e229]
          - text: Rich connections + entity references
        - heading "Results connect through text, meaning, roots, entities, and references." [level=2] [ref=e235]
        - paragraph [ref=e236]: "Search is multi-layered: exact character, word, and sentence similarity; semantic embeddings; entity detection; graph strength; Arabic roots; popular variations; and extra references such as Wikipedia or web search when useful."
    - generic [ref=e238]:
      - generic [ref=e239]:
        - generic [ref=e240]:
          - img [ref=e241]
          - text: Custom processing pipeline
        - heading "Each source are prepared with a pipeline shaped for that text." [level=2] [ref=e248]
        - paragraph [ref=e249]: A Qur'an corpus, hadith collection, tafsir, fiqh book, or modern work may need different cleaning, segmentation, translation, entity extraction, and graph rules.
      - generic [ref=e251]:
        - tablist [ref=e252]:
          - tab "Quran" [ref=e253]
          - tab "Hadith" [ref=e254]
          - tab "Tafsir" [ref=e255]
          - tab "Fiqh" [selected] [ref=e256]
          - tab "Other Book" [ref=e257]
        - tabpanel "Fiqh" [ref=e258]:
          - generic [ref=e260]:
            - generic [ref=e261]:
              - generic [ref=e262]: Fiqh pipeline
              - generic [ref=e263]: Map legal structure, then branch into evidence, school context, and entities.
            - img [ref=e266]:
              - generic [ref=e271]: Fiqh book
              - generic [ref=e274]: Ruling enrich
              - generic [ref=e277]: Evidence
              - generic [ref=e280]: School context
              - generic [ref=e283]: Entities
    - generic [ref=e285]:
      - generic [ref=e286]:
        - generic [ref=e287]:
          - img [ref=e288]
          - text: Save notes + file-based documents
        - heading "Collect alamat into majmu', then write a sahifah from the evidence." [level=2] [ref=e290]
        - paragraph [ref=e291]: Save useful queries, sentences, ayat, hadith, categories, and entities as alamat. Collect them into majmu', add tadabbur notes, and embed them into a BlockNote sahifah with narration.
      - generic [ref=e292]:
        - generic [ref=e293]:
          - generic [ref=e294]:
            - img [ref=e295]
            - text: Alamat shelf
          - generic [ref=e297]:
            - button "Search query" [ref=e298]
            - button "Sentence" [ref=e299]
            - button "Ayat" [ref=e300]
            - button "Hadith" [ref=e301]
            - button "Category" [ref=e302]
            - button "Entity" [ref=e303]
        - generic [ref=e304]:
          - generic [ref=e305]:
            - img [ref=e306]
            - text: Sahifah draft
          - generic [ref=e309]:
            - generic [ref=e310]: Narration
            - generic [ref=e311]: Embedded ayat
            - generic [ref=e312]: Hadith evidence
            - generic [ref=e313]:
              - text: Majmu' alamat
              - generic [ref=e314]: (3 saved)
            - generic [ref=e315]: Category path
            - generic [ref=e316]: Reader exploration
    - generic [ref=e318]:
      - generic [ref=e319]:
        - generic [ref=e320]:
          - img [ref=e321]
          - text: Future direction
        - heading "From research document to presentation and offline work." [level=2] [ref=e323]
      - generic [ref=e324]:
        - article [ref=e325]:
          - img [ref=e326]
          - heading "Present From Sahifah" [level=3] [ref=e329]
          - paragraph [ref=e330]: Use Reveal.js and Chalkboard from selected sahifah text, narration notes, and PDF export.
        - article [ref=e331]:
          - img [ref=e332]
          - heading "Work Offline" [level=3] [ref=e337]
          - paragraph [ref=e338]: Write sahifah, manage alamat, prepare presentations, and download sources for local search.
  - contentinfo [ref=e339]:
    - generic [ref=e340]:
      - generic [ref=e341]:
        - generic [ref=e342]:
          - link "go home" [ref=e343] [cursor=pointer]:
            - /url: /
            - generic [ref=e344]:
              - img [ref=e346]
              - generic [ref=e349]: OpenBayan
          - paragraph [ref=e350]: OpenBayan is an unbiased semantic search workspace for multi-source Islamic knowledge, rich connections, alamat, majmu', and sahifah.
        - generic [ref=e351]:
          - generic [ref=e352]:
            - generic [ref=e353]: Workspace
            - link "Search" [ref=e354] [cursor=pointer]:
              - /url: /#features
            - link "Connections" [ref=e355] [cursor=pointer]:
              - /url: /#connections
            - link "Pipeline" [ref=e356] [cursor=pointer]:
              - /url: /#pipeline
            - link "Sahifah" [ref=e357] [cursor=pointer]:
              - /url: /#sahifah
            - link "Future" [ref=e358] [cursor=pointer]:
              - /url: /#future
          - generic [ref=e359]:
            - generic [ref=e360]: Sources
            - link "Quran" [ref=e361] [cursor=pointer]:
              - /url: /#search
            - link "Hadith" [ref=e362] [cursor=pointer]:
              - /url: /#search
            - link "Tafsir" [ref=e363] [cursor=pointer]:
              - /url: /#search
            - link "Arabic Roots" [ref=e364] [cursor=pointer]:
              - /url: /#search
          - generic [ref=e365]:
            - generic [ref=e366]: Platform
            - link "Semantic Search" [ref=e367] [cursor=pointer]:
              - /url: /#features
            - link "Knowledge Graph" [ref=e368] [cursor=pointer]:
              - /url: /#connections
            - link "Alamat" [ref=e369] [cursor=pointer]:
              - /url: /#sahifah
            - link "Majmu'" [ref=e370] [cursor=pointer]:
              - /url: /#sahifah
          - generic [ref=e371]:
            - generic [ref=e372]: Legal
            - link "Licence" [ref=e373] [cursor=pointer]:
              - /url: "#"
            - link "Privacy" [ref=e374] [cursor=pointer]:
              - /url: /privacy
            - link "Terms" [ref=e375] [cursor=pointer]:
              - /url: /terms
            - link "Security" [ref=e376] [cursor=pointer]:
              - /url: "#"
      - generic [ref=e377]:
        - generic [ref=e378]: © 2026 OpenBayan. Islamic research knowledge workspace.
        - generic [ref=e379]:
          - link "X/Twitter" [ref=e380] [cursor=pointer]:
            - /url: "#"
            - img [ref=e381]
          - link "LinkedIn" [ref=e383] [cursor=pointer]:
            - /url: "#"
            - img [ref=e384]
          - link "Facebook" [ref=e386] [cursor=pointer]:
            - /url: "#"
            - img [ref=e387]
          - link "Threads" [ref=e389] [cursor=pointer]:
            - /url: "#"
            - img [ref=e390]
          - link "Instagram" [ref=e392] [cursor=pointer]:
            - /url: "#"
            - img [ref=e393]
          - link "TikTok" [ref=e395] [cursor=pointer]:
            - /url: "#"
            - img [ref=e396]
  - button "Open Next.js Dev Tools" [ref=e403] [cursor=pointer]:
    - img [ref=e404]
  - alert [ref=e407]
```

# Test source

```ts
  1  | import { test, chromium } from '@playwright/test';
  2  | import { playAudit } from 'playwright-lighthouse';
  3  | 
  4  | test('Homepage performance audit', async () => {
  5  |   test.setTimeout(180000); // 180 seconds
  6  |   // 1. Launch Chrome and open the debugging port
  7  |   const browser = await chromium.launch({
  8  |     args: ['--remote-debugging-port=9222'],
  9  |   });
  10 |   
  11 |   const page = await browser.newPage();
  12 |   
  13 |   // Navigate to the local dev server
  14 |   // We assume the server is running on localhost:3000
  15 |   await page.goto('http://localhost:3000');
  16 | 
  17 |   // 2. Hand the page over to Lighthouse
> 18 |   await playAudit({
     |   ^ Error: playwright lighthouse - A threshold is not matching the expectation.
  19 |     page: page,
  20 |     port: 9222,
  21 |     thresholds: {
  22 |       performance: 50, // Setting low initially to ensure it passes for reporting
  23 |       accessibility: 80,
  24 |       'best-practices': 80,
  25 |       seo: 80,
  26 |     },
  27 |     reports: {
  28 |       formats: { html: true, json: true },
  29 |       name: `homepage-audit-${new Date().toISOString().split('T')[0]}`,
  30 |       directory: `./lighthouse-reports`
  31 |     }
  32 |   });
  33 | 
  34 |   await browser.close();
  35 | });
  36 | 
```