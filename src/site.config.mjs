// Site-wide settings. Edit here, then run `npm run build` — every page picks
// the change up. Nothing in this file is secret: the repo is public.

export default {
  siteUrl: 'https://thelawncare.com.au/',

  business: {
    name: 'The Lawn Care',
    abn: '79 369 208 780',
    locality: 'Melbourne',
    region: 'VIC',
    country: 'AU'
  },

  // Google Analytics 4 Measurement ID from analytics.google.com. While this is
  // the placeholder, the build leaves the GA script off every page entirely.
  gaMeasurementId: 'G-XXXXXXXXXX',

  // Apps Script Web App URL (docs/apps-script/Code.gs). While this is the
  // placeholder, quotes go via FormSubmit email and the booking picker runs
  // on the rules below alone.
  gasWebhookUrl: 'PASTE_YOUR_DEPLOYED_APPS_SCRIPT_URL_HERE',

  // Inbox FormSubmit forwards quote requests to.
  formEmail: 'ericho995@gmail.com',

  offer: {
    firstMowDiscount: 10
  },

  // Standard mow only. Also drives the map estimator's instant price.
  pricing: {
    bands: [
      { id: 'small', label: 'Small', size: 'under 150m²', max: 150, low: 55, high: 70 },
      { id: 'medium', label: 'Medium', size: '150–400m²', max: 400, low: 75, high: 95 },
      { id: 'large', label: 'Large', size: '400–800m²', max: 800, low: 105, high: 140 }
      // 800m²+ is quote-on-request.
    ],
    fromPrice: 55,
    subscriptionMonthly: 85,
    addonRange: '$18–28'
  },

  // Booking request picker on quote.html. Customers *request* a slot; Eric
  // confirms or counter-offers within one business day.
  booking: {
    leadDays: 2,          // earliest requestable day = today + leadDays (Melbourne time)
    horizonDays: 21,      // how many calendar days of choice to show
    workDays: [0, 1, 2, 3, 4, 5, 6], // 0 = Sunday. Remove days you don't mow.
    blackout: [           // 'YYYY-MM-DD' days you're not taking jobs
      '2026-12-25',
      '2026-12-26',
      '2027-01-01'
    ],
    slotCapacity: 3       // open requests per morning/afternoon before it shows as full (needs Apps Script)
  }
};
