import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Logo } from '@/components/brand/Logo'
import { AppIcon, type AppIconName } from '../components/AppIcon'
import { SetupNotice } from '../components/gates'
import { ConnectButton } from '../components/walletBits'
import { usePayLinks, usePayLinkWatcher } from '../state/payLinks'
import { useSwaps, useSwapWatcher } from '../state/swaps'
import { useVault } from '../state/vault'
import { useWallet } from '../state/wallet'

type Item = { to: string; label: string; icon: AppIconName; end?: boolean }

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Money',
    items: [
      { to: '/app', label: 'Overview', icon: 'overview', end: true },
      { to: '/app/receive', label: 'Pay links', icon: 'link' },
      { to: '/app/send', label: 'Send', icon: 'send' },
      { to: '/app/shield', label: 'The Shield', icon: 'shield' },
    ],
  },
  {
    title: 'Privacy',
    items: [
      { to: '/app/addresses', label: 'Fresh addresses', icon: 'key' },
      { to: '/app/proofs', label: 'Proofs', icon: 'proof' },
      { to: '/app/exposure', label: 'Exposure', icon: 'eye' },
    ],
  },
]

/** Keeps pay links and Shield transfers up to date on every dashboard page. */
function Watchers() {
  const [links, setLinks] = usePayLinks()
  const [swaps, setSwaps] = useSwaps()
  usePayLinkWatcher(links, setLinks)
  useSwapWatcher(swaps, setSwaps)
  return null
}

function VaultStatus() {
  const { address } = useWallet()
  const { unlocked, unlock, lock, busy } = useVault()
  if (!address) return null
  return (
    <div className="vault-status">
      <span className={`vault-status__dot ${unlocked ? 'is-on' : ''}`} aria-hidden="true" />
      <span className="vault-status__text">{unlocked ? 'Vault unlocked' : 'Vault locked'}</span>
      <button type="button" className="link-btn" onClick={() => (unlocked ? lock() : void unlock())} disabled={busy}>
        {unlocked ? 'Lock' : 'Unlock'}
      </button>
    </div>
  )
}

export function DashboardLayout() {
  const { configured, address } = useWallet()
  const { pathname } = useLocation()
  // the drawer belongs to the page it was opened on, so navigating closes it without an effect
  const [drawerFor, setDrawerFor] = useState<string | null>(null)
  const drawerOpen = drawerFor === pathname

  return (
    <div className="dash">
      {address ? <Watchers /> : null}
      <aside className={`side ${drawerOpen ? 'is-open' : ''}`} aria-label="Dashboard">
        <div className="side__top">
          <Link to="/" className="side__logo" aria-label="Sotto website">
            <Logo height={28} />
          </Link>
          <button type="button" className="icon-btn side__close" onClick={() => setDrawerFor(null)} aria-label="Close menu">
            <AppIcon name="close" />
          </button>
        </div>
        <nav className="side__nav">
          {GROUPS.map((g) => (
            <div className="side__group" key={g.title}>
              <p className="side__group-title">{g.title}</p>
              {g.items.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `side__link ${isActive ? 'is-active' : ''}`}>
                  <AppIcon name={it.icon} />
                  {it.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="side__bottom">
          <VaultStatus />
          <NavLink to="/app/settings" className={({ isActive }) => `side__link ${isActive ? 'is-active' : ''}`}>
            <AppIcon name="settings" />
            Settings
          </NavLink>
          <Link to="/" className="side__link">
            <AppIcon name="back" />
            Back to website
          </Link>
        </div>
      </aside>
      {drawerOpen ? <button type="button" className="side-scrim" aria-label="Close menu" onClick={() => setDrawerFor(null)} /> : null}

      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn topbar__menu" onClick={() => setDrawerFor(pathname)} aria-label="Open menu">
            <AppIcon name="menu" />
          </button>
          <Link to="/" className="topbar__logo" aria-label="Sotto website">
            <Logo height={24} />
          </Link>
          <div className="topbar__right">
            <ConnectButton />
          </div>
        </header>
        <main className="content">
          {configured ? null : <SetupNotice />}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
