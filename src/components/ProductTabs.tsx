import { useState, useEffect } from 'react';
import { trackProductTabChanged } from '../lib/analytics';
import { IngredientList } from './IngredientList';

type Tab = 'info' | 'ingredients';

interface ProductTabsProps {
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
}

export function ProductTabs({ activeTab: controlledTab, onTabChange }: ProductTabsProps = {}) {
  const [activeTab, setActiveTab] = useState<Tab>(controlledTab ?? 'info');

  // Sync when parent drives the active tab (e.g. nav link click)
  useEffect(() => {
    if (!controlledTab) return;
    setActiveTab((prev) => {
      if (prev === controlledTab) return prev;
      trackProductTabChanged({ tab: controlledTab });
      return controlledTab;
    });
  }, [controlledTab]);

  const handleTabChange = (tab: Tab) => {
    if (tab !== activeTab) trackProductTabChanged({ tab });
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <section className="product-tabs-section" id="product-tabs">
      <div className="product-tabs-inner">
        {/* Tab bar */}
        <div className="tab-bar" role="tablist">
          {(['info', 'ingredients'] as Tab[]).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              className={`tab-btn ${activeTab === tab ? 'tab-btn--active' : ''}`}
              onClick={() => handleTabChange(tab)}
            >
              {tab === 'info' ? 'Product Info' : 'Ingredients'}
            </button>
          ))}
        </div>

        {/* ── Product Info tab ── */}
        {activeTab === 'info' && (
          <div className="tab-panel" role="tabpanel">
            <div className="tab-info-grid">
              <div className="tab-info-content">
                <span className="section-label">Overview</span>
                <h2>Hypoallergenic with Superfoods</h2>
                <p>
                  Complete premium food for adult dogs. Our 2kg kibble is vet-formulated
                  with a single hydrolysed protein and 6+ functional superfoods,
                  designed specifically for dogs with food sensitivities.
                </p>
                <p>
                  Free from beef, dairy, gluten, wheat, grain, fillers, and artificial
                  colours. Gentle on digestion, great for joints, coat, and immune health.
                </p>

                <div className="analysis-grid">
                  <div className="analysis-item"><span className="analysis-value">27%</span><span className="analysis-label">Crude Protein</span></div>
                  <div className="analysis-item"><span className="analysis-value">13%</span><span className="analysis-label">Crude Fat</span></div>
                  <div className="analysis-item"><span className="analysis-value">5%</span><span className="analysis-label">Crude Fibre</span></div>
                  <div className="analysis-item"><span className="analysis-value">3,383</span><span className="analysis-label">kcal ME/kg</span></div>
                </div>
              </div>

              <div className="tab-info-story">
                <span className="section-label">Our Story</span>
                <h2>Created for Chloe</h2>
                <p>
                  Chloe had lifelong food sensitivities. Every commercial kibble we tried
                  left her with itchy skin, digestive issues, and low energy. We spent years
                  searching for the right food, and when we couldn't find it, we made it.
                </p>
                <p>
                  Little Green Dog was born from a simple belief: every dog deserves food
                  that doesn't make them feel terrible. Our hypoallergenic, grain-free formula
                  is built from the ground up for sensitive stomachs.
                </p>
                <div className="sensitivity-promise">
                  <strong>The Sensitivity Promise</strong>
                  <p>
                    If it's not the right fit for your dog, we'll refund you, just reach out.
                    No hoops, no hassle.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Ingredients tab ── */}
        {activeTab === 'ingredients' && (
          <div className="tab-panel" role="tabpanel">
            <div className="ing-header">
              <p className="ing-intro">
                <span className="ing-intro-desktop">Hover any ingredient to learn exactly why it's included.</span>
                <span className="ing-intro-mobile">Click each ingredient for more info</span>
              </p>
              <div className="excluded-list-large">
                <span className="excluded-title">No:</span>
                {['Beef', 'Dairy', 'Gluten', 'Wheat', 'Grain', 'Fillers', 'Artificial colours'].map((item) => (
                  <span className="excluded-tag-large" key={item}>{item}</span>
                ))}
              </div>
            </div>
            <IngredientList />
          </div>
        )}
      </div>
    </section>
  );
}
