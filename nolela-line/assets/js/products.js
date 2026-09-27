/*
 * Nolela LINE — catalog.
 *
 * Prices, availability and specs below are starting values for the site build.
 * Update them to match the real stock before going live (see README.md).
 *
 * effect:  1 natural · 2 noticeable · 3 dramatic (lens design preset)
 * effD/effL: how strong the change looks on dark / light eyes (1–3), used by the shade finder
 * warmth:  warm | neutral | cool, matched against skin tone in the shade finder
 * colors:  printed lens colors from the pupil outwards, used by the iris renderer
 */
window.NOLELA_CATALOG = {
  specs: {
    dia: '14.2',
    bc: '8.6',
    water: '38%',
    material: 'HEMA',
    months: 12,
    powerMin: -0.5,
    powerMax: -8
  },

  families: ['honey', 'brown', 'grey', 'green', 'blue'],

  lenses: [
    {
      id: 'honey',
      family: 'honey',
      name: { he: 'דבש', ar: 'عسلي', en: 'Honey' },
      desc: {
        he: 'גוון זהוב וחם שמאיר את המבט. על עיניים כהות הוא נותן דבש רך וטבעי, כאילו נולדתם איתו.',
        ar: 'لون ذهبي دافئ يضيء النظرة. على العيون الداكنة يمنح لمسة عسلية ناعمة وطبيعية وكأنه لونكم الأصلي.'
      },
      effect: 1, effD: 1.6, effL: 1.4, warmth: 'warm',
      price: 179, power: true, gdia: '13.6',
      colors: { inner: '#e0ad4f', mid: '#c08133', outer: '#9a6124', ring: '#3d2513' },
      seed: 0.11
    },
    {
      id: 'green-honey',
      family: 'honey',
      name: { he: 'ירוק דבש', ar: 'أخضر عسلي', en: 'Green Honey' },
      desc: {
        he: 'ירוק זית בשוליים ודבש זהוב סביב האישון. משתנה עם האור: ירוק ביום, דבש בערב.',
        ar: 'أخضر زيتي في الأطراف وعسلي ذهبي حول البؤبؤ. يتغيّر مع الضوء: أخضر في النهار وعسلي في المساء.'
      },
      effect: 1, effD: 1.8, effL: 1.5, warmth: 'warm',
      price: 179, power: true, gdia: '13.8',
      colors: { inner: '#d4a443', mid: '#93963f', outer: '#66773a', ring: '#2a2f1c' },
      seed: 0.37
    },
    {
      id: 'caramel',
      family: 'brown',
      name: { he: 'חום קרמל', ar: 'بني كراميل', en: 'Caramel' },
      desc: {
        he: 'חום בהיר ועדין עם נגיעה של קרמל. השדרוג הכי שקט: ישימו לב שמשהו השתנה ולא יבינו מה.',
        ar: 'بني فاتح وناعم بلمسة كراميل. أهدأ تغيير ممكن: سيلاحظون أن شيئًا تغيّر من دون أن يعرفوا ما هو.'
      },
      effect: 1, effD: 1.1, effL: 2.0, warmth: 'warm',
      price: 179, power: true, gdia: '13.5',
      colors: { inner: '#c98f4f', mid: '#a36c3a', outer: '#7d4f2b', ring: '#301d12' },
      seed: 0.63
    },
    {
      id: 'chocolate',
      family: 'brown',
      name: { he: 'חום שוקולד', ar: 'بني شوكولا', en: 'Chocolate' },
      desc: {
        he: 'חום עמוק ומלא. לעיניים בהירות שרוצות מראה כהה, או לעיניים כהות שרוצות מבט מוגדר יותר.',
        ar: 'بني عميق وغني. للعيون الفاتحة التي تريد مظهرًا داكنًا، أو للعيون الداكنة التي تريد نظرة أكثر تحديدًا.'
      },
      effect: 1, effD: 1.0, effL: 2.6, warmth: 'neutral',
      price: 179, power: true, gdia: '13.8',
      colors: { inner: '#8a5a34', mid: '#6a4228', outer: '#4e301e', ring: '#1e130c' },
      seed: 0.82
    },
    {
      id: 'pearl-grey',
      family: 'grey',
      name: { he: 'אפור פנינה', ar: 'رمادي لؤلؤي', en: 'Pearl Grey' },
      desc: {
        he: 'אפור קריר עם ברק עדין של פנינה. בולט על עיניים כהות, עם טבעת כהה שמגדירה את המבט.',
        ar: 'رمادي بارد بلمعة لؤلؤية ناعمة. واضح على العيون الداكنة، مع حلقة داكنة تحدد النظرة.'
      },
      effect: 2, effD: 2.4, effL: 1.3, warmth: 'cool',
      price: 179, power: true, gdia: '13.8',
      colors: { inner: '#c2c3bb', mid: '#9ea5aa', outer: '#7e878e', ring: '#30363b' },
      seed: 0.24
    },
    {
      id: 'grey-green',
      family: 'grey',
      name: { he: 'אפור ירוק', ar: 'رمادي مخضرّ', en: 'Grey Green' },
      desc: {
        he: 'אפור עם תת-גוון ירקרק שמתחלף לפי התאורה. בולט, ועדיין נראה אמיתי.',
        ar: 'رمادي بلمسة خضراء تتبدّل حسب الإضاءة. لافت، ومع ذلك يبدو حقيقيًا.'
      },
      effect: 2, effD: 2.2, effL: 1.4, warmth: 'neutral',
      price: 179, power: true, gdia: '13.8',
      colors: { inner: '#bdb482', mid: '#98a28c', outer: '#778676', ring: '#2c3530' },
      seed: 0.49
    },
    {
      id: 'silver',
      family: 'grey',
      name: { he: 'אפור כסוף', ar: 'فضي', en: 'Silver' },
      desc: {
        he: 'אפור בהיר, כמעט כסוף, למראה קפוא ומהפנט. לאירועים, לצילומים ולרגעים שבהם רוצים לבלוט.',
        ar: 'رمادي فاتح يكاد يكون فضيًا، لمظهر جليدي آسر. للمناسبات والتصوير واللحظات التي تريدون فيها التميّز.'
      },
      effect: 3, effD: 3.0, effL: 2.0, warmth: 'cool',
      price: 179, power: true, gdia: '14.0',
      colors: { inner: '#dfe2e2', mid: '#c0c7cb', outer: '#9aa5ac', ring: '#394148' },
      seed: 0.71
    },
    {
      id: 'olive',
      family: 'green',
      name: { he: 'ירוק זית', ar: 'أخضر زيتي', en: 'Olive' },
      desc: {
        he: 'ירוק כהה וחמים עם מרכז זהוב. ירוק שנראה כמו עין ירוקה אמיתית, לא כמו עדשה.',
        ar: 'أخضر داكن ودافئ بمركز ذهبي. أخضر يشبه العين الخضراء الحقيقية، لا العدسة.'
      },
      effect: 1, effD: 1.7, effL: 1.3, warmth: 'warm',
      price: 179, power: true, gdia: '13.6',
      colors: { inner: '#b69a45', mid: '#7c8840', outer: '#5b6a33', ring: '#23291a' },
      seed: 0.93
    },
    {
      id: 'emerald',
      family: 'green',
      name: { he: 'ירוק אמרלד', ar: 'أخضر زمردي', en: 'Emerald' },
      desc: {
        he: 'ירוק אמרלד רווי ועמוק. צבע שרואים מרחוק, במיוחד באור יום.',
        ar: 'أخضر زمردي مشبع وعميق. لون يُرى من بعيد، خاصة في ضوء النهار.'
      },
      effect: 3, effD: 2.8, effL: 2.2, warmth: 'neutral',
      price: 179, power: true, gdia: '14.0',
      colors: { inner: '#86c08a', mid: '#3a9a63', outer: '#23744b', ring: '#0f3321' },
      seed: 0.16
    },
    {
      id: 'ocean',
      family: 'blue',
      name: { he: 'כחול אוקיינוס', ar: 'أزرق محيطي', en: 'Ocean' },
      desc: {
        he: 'כחול עמוק של ים פתוח, עם מרכז בהיר שמוסיף עומק. בולט מאוד על עיניים כהות.',
        ar: 'أزرق عميق كالبحر المفتوح، بمركز فاتح يضيف عمقًا. لافت جدًا على العيون الداكنة.'
      },
      effect: 2, effD: 2.6, effL: 1.6, warmth: 'cool',
      price: 179, power: true, gdia: '13.8',
      colors: { inner: '#9cc3dc', mid: '#4b8cc0', outer: '#2d6497', ring: '#132b43' },
      seed: 0.58
    },
    {
      id: 'ice-blue',
      family: 'blue',
      name: { he: 'תכלת קרח', ar: 'أزرق ثلجي', en: 'Ice Blue' },
      desc: {
        he: 'תכלת בהיר וזוהר, הגוון הכי דרמטי בקולקציה. מושלם לערב, לאירוע או לצילום.',
        ar: 'أزرق سماوي فاتح ومشرق، اللون الأجرأ في المجموعة. مثالي للسهرات والمناسبات والتصوير.'
      },
      effect: 3, effD: 3.0, effL: 2.2, warmth: 'cool',
      price: 179, power: true, gdia: '14.0',
      colors: { inner: '#d6e8f2', mid: '#9cc6e0', outer: '#6a9dc2', ring: '#233a50' },
      seed: 0.29
    },
    {
      id: 'turquoise',
      family: 'blue',
      name: { he: 'טורקיז', ar: 'فيروزي', en: 'Turquoise' },
      desc: {
        he: 'טורקיז ים-תיכוני בין כחול לירוק. גוון שמח ונועז שמתאים במיוחד לקיץ.',
        ar: 'فيروزي متوسطي بين الأزرق والأخضر. لون مبهج وجريء يناسب الصيف بشكل خاص.'
      },
      effect: 3, effD: 2.9, effL: 2.4, warmth: 'cool',
      price: 179, power: true, gdia: '14.0',
      colors: { inner: '#a3dbd3', mid: '#46b2aa', outer: '#2b8783', ring: '#123a38' },
      seed: 0.77
    }
  ],

  accessories: [
    {
      id: 'solution',
      icon: 'bottle',
      name: { he: 'נוזל רב-תכליתי לעדשות', ar: 'محلول متعدد الاستخدامات للعدسات' },
      note: { he: '360 מ״ל · ניקוי, חיטוי ואחסון', ar: '360 مل · تنظيف وتعقيم وحفظ' },
      price: 39
    },
    {
      id: 'case',
      icon: 'case',
      name: { he: 'קופסת עדשות ופינצטה', ar: 'علبة عدسات وملقط' },
      note: { he: 'מסומנת R/L · מומלץ להחליף כל 3 חודשים', ar: 'مُعلَّمة R/L · يُنصح بتبديلها كل 3 أشهر' },
      price: 19
    },
    {
      id: 'kit',
      icon: 'kit',
      name: { he: 'ערכת התחלה', ar: 'طقم البداية' },
      note: { he: 'נוזל, קופסה, פינצטה ומראה לנסיעות', ar: 'محلول، علبة، ملقط ومرآة للسفر' },
      price: 49
    }
  ]
};
