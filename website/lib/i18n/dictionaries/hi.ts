import type { Dictionary } from './en';

const hi: Dictionary = {
  nav: {
    docs: 'दस्तावेज़',
    gallery: 'गैलरी',
    icons: 'आइकन',
    playground: 'Playground',
    changelog: 'Changelog',
  },
  localeSwitcher: { label: 'भाषा' },
  meta: {
    title: 'Schematex — डॉक्टर, इंजीनियर और वकील वास्तव में जो डायग्राम उपयोग करते हैं',
    description: (count) =>
      `वे सभी ${count} डायग्राम जो एक डॉक्टर, इंजीनियर या वकील वास्तव में उपयोग करेगा। मुफ़्त। पूरी तरह ओपन सोर्स। AI के लिए बनाया गया। टेक्स्ट DSL से उद्योग-मानक SVG। शून्य निर्भरता।`,
  },
  hero: {
    eyebrow: '01 / SCHEMATEX से परिचय · मुफ़्त · ओपन सोर्स · AI के लिए बनाया',
    headlineBefore: 'वे सभी डायग्राम जो ',
    headlineAccent: 'डॉक्टर, इंजीनियर और वकील',
    headlineAfter: ' वास्तव में उपयोग करते हैं।',
    subhead: (count) =>
      `Schematex उन ${count} डायग्रामों को बनाता है जो डॉक्टर, इंजीनियर और वकील पहले से हाथ से बना रहे हैं — क्लिनिकल जेनोग्राम, IEC 61131-3 लैडर लॉजिक, NSGC पेडिग्री, कैप टेबल। टेक्स्ट DSL इनपुट, मानक-अनुरूप SVG आउटपुट।`,
    ctaPlayground: 'Playground खोलें',
    docsLink: 'दस्तावेज़ ↗',
  },
  standardsRail: { ariaLabel: 'समर्थित मानक' },
  cases: {
    eyebrow: '02 / पेशेवर वास्तव में जो डायग्राम उपयोग करते हैं',
    heading: 'वे डायग्राम जो आपके डॉक्टर, इंजीनियर या वकील वास्तव में उपयोग करते हैं।',
    body: 'प्रत्येक डायग्राम परिवार उस व्यवसायी के लिए बनाया गया है जो उसका स्वामी है — DSL की कुछ पंक्तियों से लेकर उस संस्करण तक जो एक विशेषज्ञ किसी चार्ट, मेमो या परमिट में डालेगा। प्रत्येक आउटपुट एक प्रकाशित मानक का पालन करता है।',
    openInPlayground: '→ Playground में खोलें',
    browseGallery: 'पूरी गैलरी देखें →',
  },
  why: {
    eyebrow: '03 / क्यों',
    heading: 'मुफ़्त। पूरी तरह ओपन सोर्स। AI के लिए बनाया गया।',
    body: 'सामान्य फ़्लोचार्ट टूल पेशेवर डायग्राम नहीं बना सकते। Schematex प्रत्येक मानक को प्रथम श्रेणी का दर्जा देता है — और पूरा सिस्टम AGPL-3.0, शून्य निर्भरता, और LLM के लिए पहले प्रयास में सही आउटपुट देने के लिए डिज़ाइन किया गया है।',
    cards: {
      families: {
        unit: 'परिवार',
        title: 'पेशेवर वास्तव में जो डायग्राम उपयोग करते हैं',
        body: 'प्रत्येक डायग्राम प्रकार एक प्रकाशित विशिष्टता को लागू करता है — McGoldrick, IEC 61131-3, IEEE 315, NSGC, Newick। डॉक्टर, इंजीनियर और वकील पहले से इन्हें हाथ से बना रहे हैं; अब वे इन्हें कोड से जनरेट कर सकते हैं।',
      },
      free: {
        stat: '100%',
        unit: 'मुफ़्त · ओपन सोर्स',
        title: 'AGPL-3.0, शून्य रनटाइम निर्भरता',
        body: 'D3 नहीं, dagre नहीं, पार्सर जेनरेटर नहीं, टेलीमेट्री नहीं, लॉक्ड फीचर नहीं। KB-स्तरीय बंडल, SSR-सुरक्षित, बंद-स्रोत उपयोग के लिए वाणिज्यिक लाइसेंस उपलब्ध।',
      },
      ai: {
        stat: 'AI',
        unit: 'प्रथम श्रेणी',
        title: 'LLM आउटपुट के लिए डिज़ाइन किया गया',
        body: 'न्यूनतम व्याकरण जो LLM के वास्तविक टेक्स्ट लिखने के तरीके के अनुसार डिज़ाइन की गई है — CJK उद्धरण, नेस्टिंग अस्पष्टता, AI-पठनीय त्रुटियाँ। ChatGPT या Claude का आउटपुट पेस्ट करें और पहले प्रयास में एक पेशेवर डायग्राम पाएं।',
      },
    },
  },
  positioning: {
    eyebrow: '04 / स्थिति',
    heading: 'यह सिर्फ़ एक और फ़्लोचार्ट लाइब्रेरी नहीं है।',
    body: 'Schematex की तुलना उन टूल्स से जो लोग पहले से उपयोग करते हैं।',
    columns: {
      tool: 'टूल',
      domain: 'पेशेवर डोमेन डायग्राम',
      price: 'मूल्य',
      forDevelopers: 'डेवलपर्स के लिए',
      aiFriendly: 'AI-अनुकूल',
    },
    free: 'मुफ़्त',
    partial: 'आंशिक',
    rows: {
      mermaid: { domain: 'केवल फ़्लोचार्ट', dev: '✓ (npm)' },
      d2: { domain: 'केवल आर्किटेक्चर', dev: '✗ (Go CLI)' },
      wavedrom: { domain: 'केवल टाइमिंग', dev: '✓ (npm)' },
      plantuml: { domain: 'केवल UML', dev: '✗ (Java)' },
    },
    schematex: {
      domain: (count) => `${count} परिवार · स्पेक-उद्धृत`,
      dev: '✓ (0 deps, npm)',
      ai: 'इसके लिए डिज़ाइन किया गया',
    },
  },
  quickstart: {
    eyebrow: '05 / त्वरित शुरुआत',
    heading: '10 सेकंड में इंस्टॉल करें।',
    body: 'एक फ़ंक्शन, एक स्ट्रिंग इनपुट, एक SVG आउटपुट। जहाँ भी TypeScript चलता है, वहाँ काम करता है।',
    snippets: {
      vanilla: { title: 'Vanilla TypeScript', hint: 'सार्वभौमिक' },
      nextjs: { title: 'Next.js (सर्वर)', hint: 'RSC / SSR' },
      reactClient: { title: 'React (क्लाइंट)', hint: 'इंटरैक्टिव' },
    },
    fullDocs: 'पूर्ण दस्तावेज़ीकरण →',
  },
  finalCta: {
    heading: 'एक स्ट्रिंग से शुरुआत करें।',
    body: (count) =>
      `Playground खोलें और ${count} डायग्राम प्रकारों में से किसी को भी लाइव रेंडर करें — या गैलरी में DSL देखें जिसे आप कॉपी, पेस्ट और अनुकूलित कर सकते हैं।`,
    openPlayground: 'Playground खोलें →',
    browseGallery: 'गैलरी देखें',
  },
  footer: {
    tagline:
      'वे सभी डायग्राम जो एक डॉक्टर, इंजीनियर या वकील वास्तव में उपयोग करेगा। मुफ़्त। पूरी तरह ओपन सोर्स। AI के लिए बनाया गया। AGPL-3.0।',
    cols: {
      product: {
        heading: 'उत्पाद',
        playground: 'Playground',
        gallery: 'गैलरी',
        examples: 'उदाहरण',
      },
      docs: {
        heading: 'दस्तावेज़',
        gettingStarted: 'शुरुआत करना',
        diagramTypes: 'डायग्राम प्रकार',
        apiReference: 'API संदर्भ',
      },
      community: {
        heading: 'समुदाय',
        github: 'GitHub',
        npm: 'npm',
        contributing: 'योगदान करें',
      },
    },
    copyright: (year) => `© ${year} Schematex · AGPL-3.0`,
  },
  common: { copy: 'कॉपी करें' },
};

export default hi;
