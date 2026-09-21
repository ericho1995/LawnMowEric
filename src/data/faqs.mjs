// FAQ content. Each set is rendered visibly with {{faq:<set>}} and the same
// text is emitted as FAQPage JSON-LD on that page, so the two never drift.
// Write answers as plain text (no HTML) — it's escaped on output.

const items = {
  cost: {
    q: 'How much does a mow cost?',
    a: 'A standard mow is $55–70 for a small lawn (under 150m²), $75–95 for a medium lawn (150–400m²) and $105–140 for a large lawn (400–800m²). Anything bigger is quoted individually. If you would rather not think about it, the monthly subscription is a flat $85.'
  },
  home: {
    q: 'Do I need to be home?',
    a: "Not if there's street or side-gate access straight to the lawn — just leave a gate code or access notes on the quote form. If getting to the lawn means going through your garage or the house, you'll need to be home (or arrange access). Mention it when you request your quote so it's not a surprise on the day."
  },
  rain: {
    q: "What if it's raining on the day?",
    a: "Light rain is fine. For genuinely wet ground or a storm, we'll message you to reschedule — no fee for that."
  },
  pay: {
    q: 'How do I pay?',
    a: "Bank transfer. A deposit of $20 or 20% of the quoted price, whichever is higher, confirms your booking within 24 hours of accepting the quote. The rest is due on the day."
  },
  unhappy: {
    q: "What if I'm not happy with the job?",
    a: "Let us know within 24 hours of the mow and we'll make it right — usually by coming back to fix whatever's wrong. We don't offer refunds, but we won't leave a job half-done either."
  },
  cancelSub: {
    q: 'Can I cancel the monthly subscription?',
    a: 'Yes, anytime — there is no lock-in contract. Just let us know before the next scheduled visit.'
  },
  clippings: {
    q: 'What happens to the clippings?',
    a: "They go in your own green waste bin at no extra charge. If you don't have one, we can bag them and take them away for $18–28."
  },
  area: {
    q: 'Which suburbs do you cover?',
    a: "We're booking in Melbourne CBD, Richmond, Fitzroy, Carlton, Brunswick, Preston, South Yarra, St Kilda, Footscray and Camberwell. Nearby and not listed? Put your suburb on the quote form and we'll tell you straight whether we can get there."
  },
  slotGuaranteed: {
    q: 'Is the time I pick guaranteed?',
    a: "It's a request. We confirm it — or offer the nearest free time — within one business day. Nothing is locked in until you've accepted the quote and paid the deposit."
  },
  howSoon: {
    q: 'How soon can you come?',
    a: "The earliest you can request is two days from today. If it's urgent, say so in the notes and we'll try to fit you in sooner."
  },
  change: {
    q: 'Can I change the day later?',
    a: 'Yes — just reply to the email we send you. Rain reschedules are always free.'
  }
};

export default {
  general: [items.cost, items.home, items.pay, items.unhappy, items.area],
  services: [items.home, items.clippings, items.rain, items.pay, items.unhappy, items.cancelSub],
  booking: [items.slotGuaranteed, items.howSoon, items.change, items.pay]
};
