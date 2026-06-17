import type { Dictionary } from './en';

const he: Dictionary = {
  nav: {
    docs: 'תיעוד',
    gallery: 'גלריה',
    icons: 'אייקונים',
    playground: 'Playground',
    changelog: 'Changelog',
  },
  localeSwitcher: { label: 'שפה' },
  meta: {
    title: 'Schematex — הדיאגרמות שרופאים, מהנדסים ועורכי דין באמת משתמשים בהן',
    description: (count) =>
      `כל ${count} הדיאגרמות שרופא, מהנדס או עורך דין יזדקק להן באמת. חינמי. קוד פתוח לחלוטין. נבנה עבור AI. SVG טהור מ-DSL טקסטואלי. אפס תלויות.`,
  },
  hero: {
    eyebrow: '01 / מציגים את SCHEMATEX · חינמי · קוד פתוח · נבנה עבור AI',
    headlineBefore: 'כל הדיאגרמות שבהן ',
    headlineAccent: 'רופאים, מהנדסים ועורכי דין',
    headlineAfter: ' משתמשים באמת.',
    subhead: (count) =>
      `Schematex מצייר ${count} דיאגרמות שרופאים, מהנדסים ועורכי דין כבר מציירים ביד — גנוגרמות קליניות, לוגיקת סולם IEC 61131-3, פדיגרי NSGC, טבלאות הון. טקסט DSL כקלט, SVG תואם תקנים כפלט.`,
    ctaPlayground: 'פתח Playground',
    docsLink: 'תיעוד ↗',
  },
  standardsRail: { ariaLabel: 'תקנים נתמכים' },
  cases: {
    eyebrow: '02 / דיאגרמות שמקצוענים משתמשים בהן באמת',
    heading: 'הדיאגרמות שהרופא, המהנדס או עורך הדין שלך משתמש בהן באמת.',
    body: 'כל משפחת דיאגרמות נבנתה עבור המתרגל שבקיא בה — ממספר שורות DSL ועד לגרסה שמומחה תחום ישים בתיק, מזכר או היתר. כל פלט עומד בתקן שפורסם.',
    openInPlayground: '→ פתח ב-Playground',
    browseGallery: 'עיין בגלריה המלאה →',
  },
  why: {
    eyebrow: '03 / למה',
    heading: 'חינמי. קוד פתוח לחלוטין. נבנה עבור AI.',
    body: 'כלי דיאגרמות כלליים אינם יכולים לצייר דיאגרמות מקצועיות. Schematex מתייחס לכל תקן כאזרח מן המעלה הראשונה — והכל AGPL-3.0, ללא תלויות, מתוכנן כך שמודלי שפה גדולים יוכלו לפלוט אותו בניסיון הראשון.',
    cards: {
      families: {
        unit: 'משפחות',
        title: 'דיאגרמות שמקצוענים משתמשים בהן באמת',
        body: 'כל סוג דיאגרמה מממש מפרט שפורסם — McGoldrick, IEC 61131-3, IEEE 315, NSGC, Newick. רופאים, מהנדסים ועורכי דין כבר מציירים אותן ביד; עכשיו אפשר לייצר אותן מקוד.',
      },
      free: {
        stat: '100%',
        unit: 'חינמי · קוד פתוח',
        title: 'AGPL-3.0, אפס תלויות ריצה',
        body: 'ללא D3, ללא dagre, ללא מחוללי מנתחים, ללא טלמטריה, ללא תכונות נעולות. חבילה בגודל KB, בטוחה ל-SSR, רישיון מסחרי זמין לשימוש בקוד סגור.',
      },
      ai: {
        stat: 'AI',
        unit: 'מעלה ראשונה',
        title: 'מתוכנן לפליטה על ידי מודלי שפה',
        body: 'דקדוקים מינימליים שנבנו סביב האופן שבו מודלי שפה גדולים כותבים טקסט — מרכאות CJK, עמימות קינון, שגיאות קריאות ל-AI. הדבק פלט מ-ChatGPT או Claude וקבל דיאגרמה מקצועית בניסיון הראשון.',
      },
    },
  },
  positioning: {
    eyebrow: '04 / מיצוב',
    heading: 'לא עוד ספריית תרשימי זרימה.',
    body: 'כיצד Schematex משתווה לכלים שאנשים כבר משתמשים בהם.',
    columns: {
      tool: 'כלי',
      domain: 'דיאגרמות תחום מקצועי',
      price: 'מחיר',
      forDevelopers: 'למפתחים',
      aiFriendly: 'ידידותי ל-AI',
    },
    free: 'חינמי',
    partial: 'חלקי',
    rows: {
      mermaid: { domain: 'תרשימי זרימה בלבד', dev: '✓ (npm)' },
      d2: { domain: 'ארכיטקטורה בלבד', dev: '✗ (Go CLI)' },
      wavedrom: { domain: 'תזמון בלבד', dev: '✓ (npm)' },
      plantuml: { domain: 'UML בלבד', dev: '✗ (Java)' },
    },
    schematex: {
      domain: (count) => `${count} משפחות · עם ציון מפרט`,
      dev: '✓ (0 deps, npm)',
      ai: 'תוכנן לכך',
    },
  },
  quickstart: {
    eyebrow: '05 / התחלה מהירה',
    heading: 'התקנה תוך 10 שניות.',
    body: 'פונקציה אחת, מחרוזת כקלט, SVG כפלט. עובד בכל מקום שבו TypeScript עובד.',
    snippets: {
      vanilla: { title: 'Vanilla TypeScript', hint: 'אוניברסלי' },
      nextjs: { title: 'Next.js (שרת)', hint: 'RSC / SSR' },
      reactClient: { title: 'React (לקוח)', hint: 'אינטראקטיבי' },
    },
    fullDocs: 'תיעוד מלא →',
  },
  finalCta: {
    starNote: "חינמי וקוד פתוח — כוכב אחד עוזר למפתחים אחרים למצוא אותו.",
    heading: 'התחל עם מחרוזת בודדת.',
    body: (count) =>
      `פתח את Playground כדי לרנדר כל אחד מ-${count} סוגי הדיאגרמות בזמן אמת — או עיין בגלריה ל-DSL שאפשר להעתיק, להדביק ולהתאים.`,
    openPlayground: 'פתח את Playground ←',
    browseGallery: 'עיין בגלריה',
  },
  footer: {
    tagline:
      'כל הדיאגרמות שרופא, מהנדס או עורך דין יזדקק להן באמת. חינמי. קוד פתוח לחלוטין. נבנה עבור AI. AGPL-3.0.',
    cols: {
      product: {
        heading: 'מוצר',
        playground: 'Playground',
        gallery: 'גלריה',
        examples: 'דוגמאות',
      },
      docs: {
        heading: 'תיעוד',
        gettingStarted: 'תחילת עבודה',
        diagramTypes: 'סוגי דיאגרמות',
        apiReference: 'עיון ב-API',
      },
      community: {
        heading: 'קהילה',
        github: 'GitHub',
        npm: 'npm',
        contributing: 'תרומה לפרויקט',
      },
    },
    copyright: (year) => `© ${year} Schematex · AGPL-3.0`,
  },
  common: { copy: 'העתק' },
};

export default he;
