import { Icon } from '@/components/ui/Icon'
import { Appear, RevealText } from '@/components/ui/Reveal'
import { market } from '@/data/content'
import { useZecPrice } from '@/hooks/useZecPrice'

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

export function Market() {
  const { price, failed } = useZecPrice()
  const value = price
    ? `${market.price.label} ${usd.format(price.usd)}`
    : failed
      ? `${market.price.label} price unavailable`
      : `${market.price.label} loading…`
  const change = price?.change != null ? `${price.change >= 0 ? '+' : ''}${price.change.toFixed(1)}% in the last 24 hours` : ''

  return (
    <section className="stats" aria-label="Why now">
      <Appear className="grid2">
        <article className="card card--ink">
          <div className="card__head">
            <p className="title-24 price" aria-live="polite">
              <span className="live-dot" aria-hidden="true" />
              {value}
            </p>
            <Icon name="pulse" className="card__icon" />
          </div>
          <p className="small">{change || 'Live ZEC price'}</p>
        </article>
        <article className="card card--gold">
          <div className="card__head">
            <RevealText as="h3" className="title-24" lines={market.context.title} />
            <Icon name="trend" className="card__icon" />
          </div>
          <p className="small stats__note">{market.context.note}</p>
        </article>
      </Appear>
    </section>
  )
}
