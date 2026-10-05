// All site copy lives here. Written for Sotto from the product concept.
// Example addresses (7XKP..3FQA, so1q..8kzp) and the sottoprotocol.cash domain.

export type IconName =
  | 'search'
  | 'eyeOff'
  | 'list'
  | 'key'
  | 'link'
  | 'send'
  | 'wallet'
  | 'scale'
  | 'toggle'
  | 'code'
  | 'pulse'
  | 'trend'

export const brand = {
  name: 'Sotto',
  domain: 'sottoprotocol.cash',
}

export const nav = [
  {
    label: 'How it works',
    href: '#how',
    title: 'Three steps to private',
    text: 'Sign in with the wallet you already have, move SOL, USDC or ZEC in, then pay anyone.',
    cta: 'See the steps',
  },
  {
    label: 'Use cases',
    href: '#use-cases',
    title: 'Private money at work',
    text: 'Get paid with a pay link, fund a fresh wallet or settle a big deal with your balance sealed.',
    cta: 'Browse uses',
  },
  {
    label: 'The Shield',
    href: '/app/shield',
    title: 'Solana to shielded Zcash',
    text: 'One tap moves private funds into native shielded ZEC in the wallet built into the app.',
    cta: 'Meet the Shield',
  },
  {
    label: 'For apps',
    href: '/app/receive',
    title: 'Private checkout, one line',
    text: 'Drop kit.js into any wallet, shop or app. No account and no SDK to learn.',
    cta: 'Create a pay link',
  },
  {
    label: 'Roadmap',
    href: '#start',
    title: 'Three assets to start',
    text: 'SOL, USDC and ZEC at launch. Then more tokens, and lending with the amounts sealed.',
    cta: 'See what is next',
  },
  {
    label: 'Docs',
    href: '#faq',
    title: 'Not a mixer',
    text: 'Deposits are sanctions-checked, and you can prove where any payment came from.',
    cta: 'Read the docs',
  },
] as const

export const hero = {
  eyebrow: 'Private Solana payments. Zcash built in.',
  title: ['Private payments', 'on Solana.'],
  body: 'Pay and get paid from a private Solana balance. Zcash shielding is built in, and you can prove where any payment came from.',
  primary: { label: 'Go private', href: '/app' },
  secondary: { label: 'How it works', href: '#how' },
  wallet: {
    tag: 'example wallet · solana',
    address: '7XKP..3FQA',
    balance: '40.00 ZEC',
    sub: 'Private · only your key reads this',
    hint: 'Hover to view',
    hintTouch: 'Tap to view',
  },
}

export const explorer: { icon: IconName; text: string }[] = [
  {
    icon: 'search',
    text: 'Paste any address into an explorer and the whole world reads its balance, every swap and every payment.',
  },
  {
    icon: 'eyeOff',
    text: 'With Sotto, your private balance and the people you pay never show up in that search. Not the amount, not the recipient.',
  },
  {
    icon: 'list',
    text: 'Search 7XKP..3FQA without Sotto: Balance 40.00 ZEC. Paid 250.00 USDC to 9MWD..R2LX. Anyone can read it.',
  },
  {
    icon: 'key',
    text: 'Search it with Sotto and both lines read the same: sealed, readable only with your key.',
  },
]

export const how = {
  eyebrow: 'How it works',
  title: ['Go private in three steps.', 'Then pay anyone, quietly.'],
  primary: { label: 'Go private', href: '/app' },
  secondary: { label: 'Read the docs', href: '#faq' },
  cardTitle: 'From your wallet to shielded Zcash, sealed the whole way.',
  steps: [
    {
      lead: '01 · Go private.',
      text: 'Sign in with the wallet you already have and move SOL, USDC or ZEC into the privacy protocol. Every deposit is checked against sanctions lists on the way in.',
    },
    {
      lead: '02 · Pay anyone.',
      text: 'Send to any privacy address, like so1q..8kzp. The money moves inside the protocol, so the chain shows neither the amount nor who paid whom.',
    },
    {
      lead: '03 · Shield.',
      text: "One tap moves private funds into Zcash's shielded pool, in the Zcash wallet built into the app. One tap brings them back.",
    },
    {
      lead: 'The Shield.',
      text: 'Converts your private Solana balance into native shielded ZEC. The external route has public deposits, amounts and timing. Coming back delivers SOL.',
    },
  ],
}

export const uses: { tone: 'ink' | 'gold' | 'violet' | 'plain'; icon: IconName; title: string; text: string }[] = [
  {
    tone: 'ink',
    icon: 'link',
    title: 'Get paid without showing your wallet.',
    text: 'Share a pay link like sottoprotocol.cash/pay/7XKP..3FQA. Each payment lands at a fresh address, so the payer never learns your balance.',
  },
  {
    tone: 'gold',
    icon: 'send',
    title: 'Pay without showing your balance.',
    text: 'The other side sees one thing: the payment arrived. What you hold, and everything you paid before, stays sealed.',
  },
  {
    tone: 'violet',
    icon: 'wallet',
    title: 'Fund a fresh wallet quietly.',
    text: 'Top up a new wallet from your private balance and leave bots no trail to follow back to the old one.',
  },
  {
    tone: 'plain',
    icon: 'scale',
    title: 'Settle a big deal privately.',
    text: 'Move size on Solana with the amount sealed. Teams run salaries and treasury the same way, and shielded ZEC bridges back.',
  },
]

export const usesActions = {
  primary: { label: 'Make a pay link', href: '/app/receive' },
  secondary: { label: 'All use cases', href: '#use-cases' },
}

export const people = {
  icon: 'toggle' as IconName,
  title: 'Private by default',
  body: 'Every switch comes on with your first deposit: private sends, a fresh destination for every payment, shielding to Zcash and a vault that decrypts on your device. When someone needs to know, prove where a payment came from without handing over your keys.',
  cta: { label: 'Go private', href: '/app' },
  switches: [
    'Private sends',
    'Shield to Zcash',
    'Fresh destination per payment',
    'Vault decrypts on your device',
    'Proof of where money came from',
    'Sign in with your own wallet',
  ],
}

export const apps = {
  icon: 'code' as IconName,
  title: 'Private checkout',
  body: 'One button and a small kit give any Solana wallet, shop or app private payments without building privacy themselves. One line of code, no account, no SDK.',
  cta: { label: 'Create a pay link', href: '/app/receive' },
  snippet: [
    '<script',
    '  src="https://sottoprotocol.cash/kit.js"',
    '  data-to="so1q..your address"',
    '  data-amount="25" data-asset="USDC"',
    '></script>',
  ],
}

export const market = {
  price: {
    label: 'ZEC',
  },
  context: {
    title: 'The market is buying privacy again, and Solana is turning it back on.',
    note: 'The Zcash ETF (ZCSH) is up 61.8% since it listed on 25 Aug 2026, $21.03 to $34.04. Solana’s confidential-token feature went live again on 4 Jun 2026. Dates from public reports.',
  },
}

export const closing = {
  eyebrow: 'SOL, USDC and ZEC at launch',
  title: 'Your first private payment',
  body: 'Sign in with the wallet you already have. Sotto never holds your keys, and nobody at Sotto can move your funds.',
  primary: { label: 'Go private', href: '/app' },
  secondary: { label: 'Read the docs', href: '#faq' },
}

export const socials = [{ key: 'x', label: 'Sotto on X', href: 'https://x.com/SottoCash' }] as const

export const footer = {
  title: ['Launch', 'notes'],
  news: ['One email when Sotto launches, then only real releases.', 'Leave any time.'],
  consent: 'Send me launch and release notes only',
  submit: 'Notify me →',
  links: [
    [
      { label: 'How it works', href: '#how' },
      { label: 'Use cases', href: '#use-cases' },
      { label: 'The Shield', href: '#how' },
      { label: 'For apps', href: '#apps' },
      { label: 'Roadmap', href: '#start' },
      { label: 'Brand kit', href: '/brand/logo.svg' },
    ],
    [
      { label: 'Docs', href: '#faq' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Payment proofs', href: '#apps' },
      { label: 'Audits', href: '#faq' },
    ],
  ],
  fine: '2026 © Sotto. Sotto is software for private payments and Zcash shielding on Solana. It does not hold your keys, and nobody at Sotto can move your funds. Not affiliated with the Zcash community, Electric Coin Co. or the Solana Foundation. Digital assets can lose value. Not available where prohibited. Not financial advice.',
  legal: [
    { label: 'Privacy', href: '#privacy' },
    { label: 'Terms', href: '#terms' },
  ],
}
