// Suburbs we're booking in — Melbourne's west, around home base in Deer Park.
// Each one gets a landing page at lawn-mowing/<slug>.html, a link in the
// footer and on service-area.html, and an entry in LocalBusiness.areaServed.
// To add a suburb, add an entry here and run `npm run build`; removing one
// also removes its page.
//
// Honesty rule: describe what lawns in the suburb are *likely* to be like.
// Never imply jobs we haven't done ("hundreds of St Albans lawns mowed").
// Keep prices out of the copy — they live in site.config.mjs.
//
// likelyBands: price bands most yards there probably fall into, using the ids
// from site.config.mjs pricing.bands. Shown as a guide, not a quote.

export default [
  {
    slug: 'deer-park',
    name: 'Deer Park',
    postcode: '3023',
    council: 'Brimbank City Council',
    likelyBands: ['medium', 'large'],
    intro: "Deer Park is where The Lawn Care is based. Most homes here are established brick houses on generous blocks, with a lawn out the front and a proper backyard, alongside newer units and townhouses. Being local means short trips between jobs, not a drive across Melbourne.",
    notes: [
      'Most established blocks have both a front lawn and a decent backyard — both are part of a standard mow.',
      'Newer units and townhouses usually have small courtyards, which fall in the Small band.',
      'Side gates are common. Leave the gate code or access notes on the quote form.'
    ],
    faq: [
      { q: 'Are you actually local to Deer Park?', a: 'Yes. The Lawn Care is based in Deer Park, so your lawn is close to home rather than a long drive away.' }
    ],
    nearby: ['cairnlea', 'ardeer', 'derrimut', 'caroline-springs']
  },
  {
    slug: 'st-albans',
    name: 'St Albans',
    postcode: '3021',
    council: 'Brimbank City Council',
    likelyBands: ['small', 'medium'],
    intro: 'St Albans has plenty of original post-war blocks with big backyards, and plenty that have been subdivided, with units and townhouses sharing what used to be one garden. Lawns here range from a small courtyard to a full-size backyard.',
    notes: [
      'Subdivided blocks usually leave each unit a small courtyard lawn, in the Small band.',
      'Original houses on full blocks often have Medium lawns front and back.',
      "If you share a lawn with other units, say so on the form and we'll price it once, by its size."
    ],
    faq: [
      { q: "I'm in a unit with a small courtyard. Is it worth booking?", a: 'Yes. Small courtyards fall in the lowest price band, and a regular schedule keeps them tidy with no effort from you.' }
    ],
    nearby: ['albanvale', 'cairnlea', 'sunshine']
  },
  {
    slug: 'caroline-springs',
    name: 'Caroline Springs',
    postcode: '3023',
    council: 'City of Melton',
    likelyBands: ['small', 'medium'],
    intro: 'Caroline Springs is a master-planned suburb built from the late 1990s, with brick homes on mid-sized blocks around its lakes and parks. Front gardens are on show on these streets, so a clean edge makes a visible difference.',
    notes: [
      'Many homes have a neat front lawn and a compact backyard — usually the Small or Medium band.',
      'Edging along the driveway and paths is what makes a front lawn look finished.',
      "The nature strip can be added to a mow: tick 'Also mow the nature strip' in the map tool on the quote page."
    ],
    faq: [
      { q: 'Can you mow the nature strip too?', a: "Yes. In the map tool on the quote page, tick 'Also mow the nature strip out front' to add it to your estimate." }
    ],
    nearby: ['burnside', 'deer-park', 'cairnlea']
  },
  {
    slug: 'cairnlea',
    name: 'Cairnlea',
    postcode: '3023',
    council: 'Brimbank City Council',
    likelyBands: ['small', 'medium'],
    intro: "Cairnlea is one of the area's newer suburbs, with modern brick homes on mid-sized blocks and plenty of open parkland nearby. Lawns tend to be tidy and medium-sized: a front yard and a backyard.",
    notes: [
      'Most yards fall in the Small or Medium band.',
      'Newer homes often have access down one side of the house — note the gate on the form.',
      'Lawns here grow fastest in spring, when a fortnightly schedule keeps them from getting away.'
    ],
    faq: [
      { q: 'How often should my lawn be mowed?', a: 'Fortnightly through spring and summer suits most lawns; monthly is usually enough in winter. Choose what suits you on the quote form.' }
    ],
    nearby: ['deer-park', 'albanvale', 'st-albans']
  },
  {
    slug: 'burnside',
    name: 'Burnside',
    postcode: '3023',
    council: 'City of Melton',
    likelyBands: ['small', 'medium'],
    intro: 'Burnside is a quiet, newer estate suburb next to Caroline Springs, with brick homes on mid-sized blocks. Lawns are usually a neat front yard and a manageable backyard.',
    notes: [
      'Most yards fall in the Small or Medium band.',
      'Front and back lawns are both part of a standard mow.',
      'Edging along the driveway makes a big difference to how a front yard looks.'
    ],
    faq: [
      { q: 'Do you cover Burnside Heights as well?', a: "We're booking in Burnside now. If you're in Burnside Heights or another nearby suburb, put it on the quote form and we'll tell you straight whether we can get there." }
    ],
    nearby: ['caroline-springs', 'deer-park']
  },
  {
    slug: 'albanvale',
    name: 'Albanvale',
    postcode: '3021',
    council: 'Brimbank City Council',
    likelyBands: ['medium'],
    intro: 'Albanvale is a small, established suburb of mostly brick homes on decent-sized blocks, most with a front lawn and a good backyard.',
    notes: [
      'Most yards fall in the Medium band, with lawn front and back.',
      'Established gardens often have beds along the fence line — edging keeps them crisp.',
      'Tell us about dogs or locked gates in the notes on the quote form.'
    ],
    faq: [
      { q: 'Can you take the clippings away?', a: "If you don't have a green waste bin, yes — tick the green waste option on the quote form. Otherwise they go in your bin at no extra charge." }
    ],
    nearby: ['st-albans', 'cairnlea', 'deer-park']
  },
  {
    slug: 'ardeer',
    name: 'Ardeer',
    postcode: '3022',
    council: 'Brimbank City Council',
    likelyBands: ['medium', 'large'],
    intro: 'Ardeer sits between Deer Park and Sunshine, with older post-war homes on generous blocks and a growing number of townhouse developments. Original blocks often have big backyards; newer townhouses have small courtyards.',
    notes: [
      'Original blocks often fall in the Medium or Large band.',
      'Townhouse courtyards are usually in the Small band.',
      "A big backyard that's been left for a while may attract an overgrown surcharge — choose the right 'last mowed' option."
    ],
    faq: [
      { q: 'My backyard is really overgrown. Can you still do it?', a: "Yes. Lawns not mowed in four weeks or more attract an overgrown surcharge, confirmed when we quote — so choose the right 'last mowed' option on the form." }
    ],
    nearby: ['deer-park', 'sunshine-west', 'sunshine']
  },
  {
    slug: 'sunshine',
    name: 'Sunshine',
    postcode: '3020',
    council: 'Brimbank City Council',
    likelyBands: ['small', 'medium'],
    intro: 'Sunshine mixes older weatherboard and brick homes with plenty of newer townhouses and units. Block sizes change a lot from street to street, so lawns range from a small courtyard to a full backyard.',
    notes: [
      'Because block sizes vary so much, the map tool on the quote page is the quickest way to an accurate price.',
      'Units and townhouses usually fall in the Small band.',
      'Street parking can be tight near the station and shops, so parking notes help.'
    ],
    faq: [
      { q: 'How do I know which size band my lawn is in?', a: 'Use the map on the quote page: find your address and it looks up your block, takes the house off, and gives you a size and a price range on the spot.' }
    ],
    nearby: ['sunshine-west', 'ardeer', 'st-albans']
  },
  {
    slug: 'sunshine-west',
    name: 'Sunshine West',
    postcode: '3020',
    council: 'Brimbank City Council',
    likelyBands: ['medium', 'large'],
    intro: 'Sunshine West has many post-war brick-veneer and weatherboard homes on large original blocks, often with big backyards, plus newer units where blocks have been split.',
    notes: [
      'Many original blocks fall in the Medium or Large band.',
      'Bigger backyards suit a fortnightly schedule through spring and summer.',
      'Split blocks usually leave each home a small yard in the Small band.'
    ],
    faq: [
      { q: 'Does the monthly subscription suit a big backyard?', a: 'The monthly subscription suits small to medium lawns up to about 400m². Bigger backyards are priced by size — the map tool on the quote page gives you an instant range.' }
    ],
    nearby: ['sunshine', 'ardeer', 'derrimut']
  },
  {
    slug: 'derrimut',
    name: 'Derrimut',
    postcode: '3026',
    council: 'Brimbank City Council',
    likelyBands: ['small'],
    intro: "Derrimut's homes are mostly newer estate houses on smaller blocks, so lawns tend to be compact: a front yard and a small backyard. They're quick to mow, and still look much better with a clean edge.",
    notes: [
      'Most yards here fall in the Small band.',
      'Edging along the driveway and paths is the easiest way to lift a small front lawn.',
      'Leave side-gate details on the form if the backyard is only reachable down the side.'
    ],
    faq: [
      { q: 'Is edging worth it on a small lawn?', a: "On a compact front yard it's often the biggest visual difference — crisp lines along the driveway and paths. It's optional and priced on top of the standard mow." }
    ],
    nearby: ['deer-park', 'sunshine-west']
  }
];
