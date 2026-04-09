import { useGameStore } from '../../store/gameStore'
import { JokerArea } from '../joker/JokerArea'
import { JokerSlot } from '../joker/JokerSlot'
import { Button } from '../ui/Button'

function formatShopEffect(item: { type: string; name: string; effect?: string; desc?: string; handType?: string; bonus?: number }): string {
  if (item.effect) return item.effect
  if (item.desc) return item.desc
  if (item.type === 'planet' && item.handType && item.bonus != null) {
    return `${item.handType} +${item.bonus}`
  }
  return ''
}

export function ShopScreen() {
  const money = useGameStore(s => s.money)
  const shopManager = useGameStore(s => s.shopManager)
  const buyItem = useGameStore(s => s.buyItem)
  const leaveShop = useGameStore(s => s.leaveShop)
  const activeJokers = useGameStore(s => s.activeJokers)

  const jokers = shopManager.jokers
  const tarotPlanet = shopManager.tarotPlanet
  const jokerPrices = shopManager.jokerPrices
  const tarotPlanetPrice = shopManager.tarotPlanetPrice

  return (
    <div className="shop-screen">
      <div className="shop-header">
        <h2>商店</h2>
        <div className="shop-money">
          <span className="money-icon">$</span>
          <span className="money-value">{money}</span>
        </div>
      </div>

      <div className="shop-section">
        <h3>Joker</h3>
        <div className="shop-jokers">
          {jokers.map((joker, i) =>
            joker ? (
              <div key={joker.id} className="shop-item">
                <JokerSlot joker={joker} />
                <div className="shop-item-footer">
                  <span className="item-price">
                    <span className="money-icon">$</span>
                    {jokerPrices[i] ?? joker.price}
                  </span>
                  <Button
                    size="small"
                    disabled={money < (jokerPrices[i] ?? joker.price)}
                    onClick={() => buyItem('joker', i)}
                  >
                    购买
                  </Button>
                </div>
              </div>
            ) : (
              <div key={`empty-${i}`} className="shop-item sold-out">
                <div className="sold-out-badge">已售出</div>
              </div>
            )
          )}
        </div>
      </div>

      {tarotPlanet ? (
        <div className="shop-section">
          <h3>{tarotPlanet.type === 'tarot' ? 'Tarot' : 'Planet'}</h3>
          <div className="shop-item shop-tarot-planet">
            <div className={`tarot-card rarity-${tarotPlanet.type === 'tarot' ? 'uncommon' : 'rare'}`}>
              <div className="tarot-name">{tarotPlanet.name}</div>
              <div className="tarot-desc">{formatShopEffect(tarotPlanet)}</div>
            </div>
            <div className="shop-item-footer">
              <span className="item-price">
                <span className="money-icon">$</span>
                {tarotPlanetPrice}
              </span>
              <Button
                size="small"
                disabled={money < tarotPlanetPrice}
                onClick={() => buyItem('tarotPlanet', 0)}
              >
                购买
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="shop-section">
          <h3>Tarot / Planet</h3>
          <div className="shop-item sold-out">
            <div className="sold-out-badge">已售出</div>
          </div>
        </div>
      )}

      <div className="shop-footer">
        <JokerArea jokers={activeJokers} />
        <Button variant="secondary" onClick={leaveShop}>
          离开商店
        </Button>
      </div>
    </div>
  )
}
