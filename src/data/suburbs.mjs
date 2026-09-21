// Suburbs we're booking in. Each one gets a landing page at
// lawn-mowing/<slug>.html, a link in the footer and on service-area.html, and
// an entry in LocalBusiness.areaServed.
//
// Honesty rule: describe what lawns in the suburb are *likely* to be like.
// Never imply jobs we haven't done ("hundreds of Richmond lawns mowed").
//
// likelyBands: price bands most yards there probably fall into, using the ids
// from site.config.mjs pricing.bands. Shown as a guide, not a quote.

export default [
  {
    slug: 'melbourne-cbd',
    name: 'Melbourne CBD',
    postcode: '3000',
    council: 'City of Melbourne',
    likelyBands: ['small'],
    intro: "Lawns in the CBD are rare and usually small: a townhouse courtyard, a strip of turf in a shared garden, or a podium lawn. They're quick to mow but often awkward to reach, so access is what we'll ask about first.",
    notes: [
      'Tell us how access works — lifts, loading bays, parking and any building rules — on the quote form.',
      "Shared and body-corporate gardens are fine; we just need to know who's arranging the job.",
      'Small areas like these usually fall in the Small band.'
    ],
    faq: [
      { q: 'Can you mow a lawn in an apartment building?', a: "Usually, yes — as long as we can get a mower to it. Tell us how access works and whether building management needs to approve contractors, and we'll confirm before quoting." }
    ],
    nearby: ['carlton', 'richmond', 'south-yarra']
  },
  {
    slug: 'richmond',
    name: 'Richmond',
    postcode: '3121',
    council: 'City of Yarra',
    likelyBands: ['small'],
    intro: "Richmond is mostly Victorian workers' cottages, terraces and newer townhouses, so lawns tend to be small: a front patch behind the fence and a courtyard or narrow backyard. Side access is often tight or missing altogether.",
    notes: [
      'Many terraces have no side gate. If the mower has to come through the house, say so on the form and we will plan for it.',
      'Courtyard lawns usually fall in the Small band.',
      'Streets are narrow and parking is tight, so parking notes help on the day.'
    ],
    faq: [
      { q: 'My terrace has no side access. Can you still mow it?', a: "Usually, yes. You'll need to be home to let us through. Mention it on the quote form so we can plan for it." }
    ],
    nearby: ['south-yarra', 'fitzroy', 'melbourne-cbd']
  },
  {
    slug: 'fitzroy',
    name: 'Fitzroy',
    postcode: '3065',
    council: 'City of Yarra',
    likelyBands: ['small'],
    intro: "Fitzroy was Melbourne's first suburb, and its Victorian terraces sit on some of the smallest blocks in the city. Where there's a lawn, it's usually a compact courtyard or a small patch out the front, often reached from a rear lane.",
    notes: [
      'Compact courtyards usually fall in the Small band.',
      'If the lawn is easier to reach from the laneway, tell us — and include any gate code.',
      'Small, formal gardens are where edging makes the most visible difference.'
    ],
    faq: [
      { q: 'Can you come in through the back lane?', a: 'Yes, if that is the easier way in. Note the laneway and any gate details on the quote form.' }
    ],
    nearby: ['carlton', 'richmond', 'brunswick']
  },
  {
    slug: 'carlton',
    name: 'Carlton',
    postcode: '3053',
    council: 'City of Melbourne',
    likelyBands: ['small'],
    intro: "Carlton's terraces and townhouses come with small, often heritage-style gardens: a front plot behind an iron fence and a courtyard out the back. The lawns are small, so a clean edge does a lot of the work.",
    notes: [
      'Front and back lawns here usually fall in the Small band.',
      'Edging along paths and garden beds is what makes a small heritage garden look finished.',
      'Parking restrictions are common near the university and Lygon Street, so parking notes help.'
    ],
    faq: [
      { q: 'Is edging worth adding on a small lawn?', a: "On small, formal gardens it's often the biggest visual difference — crisp lines along paths and beds. It's optional and priced on top of the standard mow." }
    ],
    nearby: ['fitzroy', 'brunswick', 'melbourne-cbd']
  },
  {
    slug: 'brunswick',
    name: 'Brunswick',
    postcode: '3056',
    council: 'Merri-bek City Council',
    likelyBands: ['small', 'medium'],
    intro: 'Brunswick mixes Victorian and Edwardian cottages, interwar bungalows and plenty of newer townhouses. Backyards run from compact courtyards to decent-sized lawns on the older blocks, and many have a side gate or a rear lane.',
    notes: [
      'Most yards fall in the Small or Medium band.',
      'Older blocks often have a side gate — a gate code or access note on the form saves time on the day.',
      "If the back has been left to grow over winter, choose the right 'last mowed' option so the quote is accurate."
    ],
    faq: [
      { q: 'My backyard has got away from me. Can you still mow it?', a: "Yes. Lawns not mowed in four weeks or more attract an overgrown surcharge, confirmed when we quote. Choose the right 'last mowed' option on the form so the price is accurate from the start." }
    ],
    nearby: ['carlton', 'fitzroy', 'preston']
  },
  {
    slug: 'preston',
    name: 'Preston',
    postcode: '3072',
    council: 'City of Darebin',
    likelyBands: ['medium', 'large'],
    intro: 'Preston has more room than the inner suburbs: post-war weatherboards and brick veneers on generous blocks, with lawns front and back. Medium and large lawns are common here, and a regular schedule saves the most effort.',
    notes: [
      'Many yards fall in the Medium or Large band. The map tool on the quote page gives an instant size.',
      'Front and back lawns are both part of a standard mow.',
      'Bigger lawns grow fast in spring — a fortnightly schedule keeps them from getting away.'
    ],
    faq: [
      { q: 'Does the monthly subscription suit a bigger block?', a: 'The $85 monthly subscription suits small to medium lawns up to about 400m². Larger blocks are quoted by size — the map tool on the quote page gives you an instant range.' }
    ],
    nearby: ['brunswick', 'fitzroy']
  },
  {
    slug: 'south-yarra',
    name: 'South Yarra',
    postcode: '3141',
    council: 'City of Stonnington and City of Melbourne',
    likelyBands: ['small', 'medium'],
    intro: "South Yarra ranges from apartments and townhouses to substantial period homes with established gardens. Lawns are often small but formal — the kind where a clean edge and an even cut are the whole point.",
    notes: [
      'Townhouse and courtyard lawns usually fall in the Small band; larger period gardens in the Medium band.',
      'Edging is popular on formal front gardens.',
      'Light hedge shaping is available at an intro rate — ask when you quote.'
    ],
    faq: [
      { q: 'Can you trim the hedges as well?', a: "Yes — light hedge shaping, at a discounted intro rate while we build up hedging experience. It's priced per job; tick it on the quote form." }
    ],
    nearby: ['richmond', 'st-kilda', 'melbourne-cbd']
  },
  {
    slug: 'st-kilda',
    name: 'St Kilda',
    postcode: '3182',
    council: 'City of Port Phillip',
    likelyBands: ['small'],
    intro: 'St Kilda is dense and varied: art deco and Edwardian flats, Victorian terraces and a few grand old homes. Most lawns are small courtyards or shared gardens, and a block of flats often shares one lawn between several units.',
    notes: [
      'Most lawns fall in the Small band.',
      "Shared gardens are fine — tell us who's arranging the job and how we get in.",
      'Parking is tight in much of St Kilda, so parking notes on the form help.'
    ],
    faq: [
      { q: 'Can neighbours share one booking for a shared lawn?', a: 'Yes. One person requests the quote and notes that the lawn is shared. We price the lawn by its size, once — not per unit.' }
    ],
    nearby: ['south-yarra', 'richmond']
  },
  {
    slug: 'footscray',
    name: 'Footscray',
    postcode: '3011',
    council: 'City of Maribyrnong',
    likelyBands: ['small', 'medium'],
    intro: "Footscray's workers' cottages and weatherboards sit alongside newer townhouses and apartments. Block sizes change a lot from street to street, so lawns range from small courtyards to proper backyards.",
    notes: [
      'Most yards fall in the Small or Medium band.',
      'Because block sizes vary so much, the map tool on the quote page is the quickest way to an accurate price.',
      'Weatherboards often have a side path to the backyard — note the gate or code on the form.'
    ],
    faq: [
      { q: 'How do I know which size band my lawn is in?', a: 'Use the map on the quote page: find your address, pick roughly how much of the block is lawn, and it gives you a size and a price range on the spot. You can move and resize the box on the map to fine-tune it.' }
    ],
    nearby: ['melbourne-cbd', 'brunswick']
  },
  {
    slug: 'camberwell',
    name: 'Camberwell',
    postcode: '3124',
    council: 'City of Boroondara',
    likelyBands: ['medium', 'large'],
    intro: 'Camberwell has some of the most generous blocks on our list: Edwardian and interwar homes with established front gardens and lawns front and back. Most lawns here are medium to large.',
    notes: [
      'Most lawns fall in the Medium or Large band.',
      'Established front gardens benefit from edging along paths and beds.',
      'Larger lawns are priced by size — the map tool on the quote page gives an instant range.'
    ],
    faq: [
      { q: 'Do you do regular visits for larger lawns?', a: 'Yes — weekly, fortnightly or monthly. Larger lawns are priced by size; the $85 monthly subscription covers lawns up to about 400m².' }
    ],
    nearby: ['richmond', 'south-yarra']
  }
];
