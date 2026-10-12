# Zephyra OS

Private payments on Ethereum, with Zcash shielding. Marketing site at `/`, product dashboard at `/app`. Runs on Ethereum mainnet.

- Website: https://zephyra.world
- X: https://x.com/ZephyraOS

## Run it

```bash
npm install
cp .env.example .env   # then set VITE_REOWN_PROJECT_ID
npm run dev
```

| Variable | Required | What it does |
| --- | --- | --- |
| `VITE_REOWN_PROJECT_ID` | yes, for wallet connection | Reown AppKit project id from https://dashboard.reown.com |
| `VITE_ETHEREUM_RPC_URL` | recommended for production | Ethereum mainnet RPC (Alchemy, Infura, QuickNode...). Defaults to `https://ethereum-rpc.publicnode.com` |

Without a project id the dashboard still opens: Exposure scans, proof verification and pay pages read public data, and wallet actions show a setup notice.

Address history and token lists come from Blockscout's public Ethereum API (`eth.blockscout.com`), because an RPC cannot list an address's transactions. It needs no key.

## Stack

React 19, Vite, TypeScript, React Router 7. Wallet connection: Reown AppKit with the wagmi adapter (wagmi 3, viem 2) on Ethereum mainnet. Shield route: NEAR Intents 1Click API.

## Routes

| Route | Purpose |
| --- | --- |
| `/app` | Overview: public wallet balance, fresh address balances, pay links, Shield transfers, activity |
| `/app/receive`, `/app/receive/:id` | Pay links: each gets a fresh address, a shareable link and an EIP-681 QR code. Payments are detected on-chain |
| `/app/send` | Send ETH, USDC or USDT from the main wallet or a fresh address, to an address or a pay link |
| `/app/shield` | Ethereum to Zcash and back through the NEAR Intents 1Click route |
| `/app/addresses` | Fresh addresses: balances, labels, create, recover on a new device |
| `/app/proofs` | Sign a proof of where a payment came from; verify any proof |
| `/app/exposure` | What any address reveals to a block explorer |
| `/app/settings` | Wallet, vault, local data |
| `/pay/:code` | Public payment page for a pay link |
| `/proof/:code` | Public proof verification page |

## How fresh addresses work

The wallet signs one fixed message. Standard Ethereum wallets sign deterministically (RFC 6979), so the signature is the same every time. It is run through HKDF to derive a master key, and each fresh address (a secp256k1 key) is derived from it by index. The first unlock asks for two signatures and checks they match, so the addresses can always be recreated; smart-contract wallets that sign differently each time are refused. Keys live in memory only while the vault is unlocked. Nothing secret is stored or sent anywhere; localStorage holds public addresses, labels, pay link metadata and transfer records.

What this does and does not hide: payments to and from a fresh address don't involve your main wallet. Amounts on Ethereum are still public, a fresh address needs a little ETH for gas to send, and moving funds between a fresh address and your main wallet links them. The Shield moves value into Zcash's shielded pool through a public route (deposits, amounts and timing are visible on Ethereum).

## Deploy on Vercel

`vercel.json` sets the Vite build, the single-page-app rewrite (so `/app`, `/pay/...` and `/proof/...` load directly), long caching for hashed assets and basic security headers.

1. In Vercel, **Add New Project** and import the GitHub repository. The framework, build command (`npm run build`) and output (`dist`) are read from `vercel.json`.
2. **Settings → Environment Variables**, for Production and Preview:

   | Name | Value |
   | --- | --- |
   | `VITE_REOWN_PROJECT_ID` | Your project id from https://dashboard.reown.com (required for wallet connection) |
   | `VITE_ETHEREUM_RPC_URL` | Your Ethereum mainnet RPC URL (recommended) |

   `VITE_` variables are baked in at build time, so redeploy after changing them. They are also visible in the browser bundle, so restrict your RPC key to your domain at the provider.
3. **Settings → Domains**: add `zephyra.world` (and `www.zephyra.world` redirecting to it), then set the DNS records Vercel shows.
4. **Reown dashboard → your project → Domain**: add `https://zephyra.world`, plus your `*.vercel.app` preview domain if you test there. Without this, wallet connection is refused on the live site.
5. If your RPC provider restricts origins, allow `https://zephyra.world` there too.

## Scripts

- `npm run dev`: local dev server
- `npm run build`: typecheck and production build (the dashboard is a separate chunk)
- `npm run lint`: oxlint
- `npm run build:assets`: rebuild the logo exports, share image (`public/og.png`) and app icons from `scripts/`
