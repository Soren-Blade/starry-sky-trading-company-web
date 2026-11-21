/**
 * Legal documents (English).
 *
 * Keep `**bold**` and `` `code` `` markers: Legal.vue turns them into
 * <strong> / <code> instead of rendering the raw markers.
 */
export default {
  ui: {
    updatedAt: 'Last updated: {date}',
    tocAria: 'On this page',
    tocTitle: 'Contents',
    footnote:
      'This document describes what this site actually does today. If you find a mismatch between the document and the implementation, please tell us using the contact details in the footer — we treat that as a defect and will fix it.',
    docs: {
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      rules: 'Platform Rules',
    },
  },
  terms: {
    title: 'Terms of Service',
    updatedAt: '2026-10-12',
    sections: [
      {
        heading: '1. Services',
        paragraphs: [
          'Starry Sky Trading Company provides digital goods and a tool directory. The former covers browsing products, the cart, checkout and order management; the latter covers the tool catalog, 2FA code generation and shared Apple ID listings.',
          'The platform has **not yet connected an online payment channel**. Placing an order creates a pending order; after the buyer and seller settle offline, the buyer confirms completion on the order page.',
        ],
      },
      {
        heading: '2. Accounts',
        paragraphs: [
          'Your first visit automatically creates a guest identity and asks for no personal information. Guests can browse products and tools and generate 2FA codes.',
          'The cart, checkout, order management and favorites require an account. Registration needs a username, email and password; the password is hashed with bcrypt and never stored in plain text.',
        ],
      },
      {
        heading: '3. Orders and cancellation',
        paragraphs: [
          'When an order is submitted, the server recalculates the amount from the current product prices. Amounts submitted by the client are ignored.',
          'Pending orders can be cancelled, and reserved stock is returned. Orders that have already been confirmed complete cannot be cancelled.',
        ],
      },
      {
        heading: '4. Prohibited conduct',
        paragraphs: [
          'You may not use the service for anything that violates applicable law, including bulk registration, artificial traffic, or attempts to access other users’ data without authorization.',
          'Shared Apple ID content comes from third-party sources and is provided for learning and testing only. Do not use it commercially.',
        ],
      },
      {
        heading: '5. Membership and points',
        paragraphs: [
          'Membership is a **time-limited paid service**: each tier provides a spending discount, points multiplier and related benefits, as shown in the Member Center. Tiers are based on cumulative growth value; reaching a threshold upgrades the tier.',
          'The platform supports online payment, with the methods shown at checkout. Where online payment is unavailable, the flow remains “place order, contact support to settle, support confirms, membership activates”. Refunds are requested through support: after approval the payment is returned to the original method, and **a refunded membership order also revokes the membership benefits it activated**. Coupon packs already issued and still valid are not clawed back.',
          'When you buy the same or a higher tier again, the duration **adds to** the existing expiry date instead of replacing the remaining days.',
          'Points and coupons are virtual benefits inside the platform and **cannot be withdrawn or transferred**. 100 points offset ¥1. Points and coupons expire; watch the expiry reminders in the Member Center.',
        ],
      },
      {
        heading: '6. Disclaimer',
        paragraphs: [
          'Third-party data sources (the Apple ID list) are provided externally. The platform does not guarantee their availability or freshness.',
          'The platform is not liable for losses caused by force majeure, upstream service failures, or problems with your device or network.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updatedAt: '2026-10-05',
    sections: [
      {
        heading: '1. What we collect',
        paragraphs: [
          '**Account information**: the username and email you enter at registration, plus a randomly generated nickname, avatar, gender and birthday. Passwords are stored only as bcrypt hashes.',
          '**Identity**: every user, including guests, has a random UUID. The server uses it to identify the requester; login tokens contain only this UUID, never an email or phone number.',
          '**Network information**: request IP and User-Agent. Guest identities are reused per IP, so the same egress shares one guest account. Signing in updates the last-login time.',
          '**Content you provide**: nickname, avatar URL, gender and birthday when editing your profile; optional contact details and notes at checkout.',
          '**Behavioral data**: failed login attempts and their source (for brute-force protection, expiring after 15 minutes), product views, sales and stock.',
        ],
      },
      {
        heading: '2. Data stored on your device',
        paragraphs: [
          'The platform uses no third-party tracking scripts or advertising cookies. The following items live in browser local storage (localStorage / sessionStorage) and disappear when you clear browser data:',
        ],
        list: [
          '`ACCESS_TOKEN`: access token (valid for 3 minutes)',
          '`REFRESH_TOKEN`: refresh token (7 days). **Stored only in sessionStorage by default**, so closing the browser ends the session. Ticking “Remember me” at sign-in also writes it to localStorage so the session survives a browser restart',
          '`SSTC_REMEMBER_ME`: whether “Remember me” was ticked last time (only affects the checkbox default)',
          '`SSTC_LAST_IDENTIFIER`: the account used for the last successful sign-in (username / email / phone), **unrelated to the password**. Saved only when “Remember me” is ticked, to prefill the next sign-in dialog',
          '`SSTC_THEME_PREF`: your chosen visual theme and individual tweaks',
          '`SSTC_TOOL_FAVORITES`: tool favorites for **guests** (favorites sync to the server after signing in)',
        ],
      },
      {
        heading: '3. How we use it',
        paragraphs: [
          'Data is used only to provide the services above: identifying you, showing your cart and orders, preventing account abuse and diagnosing failures.',
          'We do not sell or share your personal information with third parties. The third-party Apple ID source is **read-only** data (the platform fetches the list); it does not receive your data.',
        ],
      },
      {
        heading: '4. Logs',
        paragraphs: [
          'Server logs are redacted: values whose field names match the deny list (passwords, tokens, card keys, email, phone and similar) are never written to logs, and undeclared fields are logged as summaries only.',
        ],
      },
      {
        heading: '5. Your rights',
        paragraphs: [
          'You can view and edit your nickname, avatar, gender and birthday in your profile.',
          'To delete your account or export your data, contact us using the details in the footer.',
        ],
      },
    ],
  },
  rules: {
    title: 'Platform Rules',
    updatedAt: '2026-10-12',
    sections: [
      {
        heading: '1. Trading rules',
        paragraphs: [
          'Product prices, stock and listing status come from server data. If stock is insufficient or a product is delisted at checkout, the order is rejected with a reason.',
          'If a cart item is delisted or runs out of stock before checkout, it is marked as unavailable and excluded from the total.',
        ],
      },
      {
        heading: '2. Card key rules',
        paragraphs: [
          'Once activated, a card key is bound to the account and cannot be transferred. Confirm which tool the key is for before activating it.',
          'Card keys expire and cannot be activated afterwards. If a key shows as used but you never used it, contact support to review the usage record.',
        ],
      },
      {
        heading: '3. Tools and shared accounts',
        paragraphs: [
          'External links in the tool directory point to third-party sites; their content and availability are the third party’s responsibility.',
          'For shared Apple IDs, do not change the password or bind your own phone number — that would lock everyone else out.',
        ],
      },
      {
        heading: '4. Integrity and enforcement',
        paragraphs: [
          'The platform reserves the right to ban accounts for bulk registration, artificial traffic, attempts to access other users’ data, and similar abuse. Once an account is disabled, issued tokens stop working immediately.',
          'If you believe an action was mistaken, appeal using the contact details in the footer.',
        ],
      },
      {
        heading: '5. Membership and points rules',
        paragraphs: [
          'Membership discounts and points multipliers use the tier **at the time of checkout**. Amounts and points are always recalculated by the server from current prices; client-submitted amounts are ignored.',
          '**Points**: points accrue from orders, daily check-ins, task rewards and membership gifts. 100 points offset ¥1. Positive point balances expire; on expiry they are consumed **in the order earned** (oldest first), and expired points can no longer be used.',
          '**Coupons**: issued through membership packs, the coupon center, points redemption or manually. They have thresholds and expiry dates, expire without compensation, and only one coupon can be used per order.',
          'Points and coupons cannot be withdrawn or transferred. Points or coupons obtained through fake orders, bulk registration, artificial traffic or similar abuse may be clawed back, and the account handled according to the circumstances.',
        ],
      },
    ],
  },
}
