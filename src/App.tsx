import { Mark } from '@/components/brand/Logo'
import { OrbitScene, type OrbitItem } from '@/components/scenes/OrbitScene'
import { SwitchesScene } from '@/components/scenes/SwitchesScene'
import { Closing } from '@/components/sections/Closing'
import { Explorer } from '@/components/sections/Explorer'
import { Feature } from '@/components/sections/Feature'
import { Header } from '@/components/sections/Header'
import { Hero } from '@/components/sections/Hero'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { Market } from '@/components/sections/Market'
import { UseCases } from '@/components/sections/UseCases'
import { apps, people } from '@/data/content'

const APP_ITEMS: OrbitItem[] = [
  { kind: 'token', label: 'SOL' },
  { kind: 'dot' },
  { kind: 'lock' },
  { kind: 'token', label: 'USDC' },
  { kind: 'dot' },
  { kind: 'token', label: 'ZEC' },
  { kind: 'lock' },
  { kind: 'token', label: 'cUSDC' },
]

function KitCard() {
  const [open, src, to, amount, close] = apps.snippet
  return (
    <div className="code-card" aria-hidden="true">
      <div className="code-card__bar">
        <span>kit.js · example</span>
        <Mark size={18} />
      </div>
      <pre>
        <span className="k">{open}</span>
        {'\n'}
        {src.replace(/"(.*)"/, '')}
        <span className="s">{src.match(/".*"/)?.[0]}</span>
        {'\n'}
        {to.replace(/"(.*)"/, '')}
        <span className="s">{to.match(/".*"/)?.[0]}</span>
        {'\n'}
        {amount}
        {'\n'}
        <span className="k">{close}</span>
      </pre>
      <button type="button" className="btn btn--dark btn--sm" tabIndex={-1}>
        Pay privately
      </button>
    </div>
  )
}

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Explorer />
        <HowItWorks />
        <UseCases />
        <Feature
          icon={people.icon}
          title={people.title}
          body={people.body}
          cta={people.cta}
          fade="top"
          scene={<SwitchesScene />}
        />
        <Feature
          id="apps"
          icon={apps.icon}
          title={apps.title}
          body={apps.body}
          cta={apps.cta}
          fade="bottom"
          scene={
            <OrbitScene
              seed={47}
              glows={[
                { x: 0.66, y: 0.42, r: 0.3, color: 'rgba(205,190,255,0.55)' },
                { x: 0.95, y: 0.8, r: 0.2, color: 'rgba(255,221,150,0.4)' },
              ]}
              items={APP_ITEMS}
              radius={0.47}
              squash={0.3}
              stageClass="orbit--apps"
              center={<KitCard />}
            />
          }
        />
        <Market />
      </main>
      <Closing />
    </>
  )
}
