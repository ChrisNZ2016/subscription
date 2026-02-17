import {
  DOG_SIZE_PRESETS,
  BAG_WEIGHT_OPTIONS,
  FREQUENCY_OPTIONS,
} from '../constants/dogSizes';

interface DogSizeCalculatorProps {
  selectedSize: number | null;
  bagWeight: number;
  frequencyWeeks: number;
  onSelectSize: (index: number) => void;
  onBagWeightChange: (weight: number) => void;
  onFrequencyChange: (weeks: number) => void;
  onContinue: () => void;
}

export function DogSizeCalculator({
  selectedSize,
  bagWeight,
  frequencyWeeks,
  onSelectSize,
  onBagWeightChange,
  onFrequencyChange,
  onContinue,
}: DogSizeCalculatorProps) {
  return (
    <section className="step" id="dog-size">
      <h2>What size is your dog?</h2>
      <p className="step-subtitle">
        We'll recommend the perfect bag size and delivery frequency.
      </p>

      <div className="size-cards">
        {DOG_SIZE_PRESETS.map((preset, i) => (
          <button
            key={preset.label}
            className={`size-card ${selectedSize === i ? 'selected' : ''}`}
            onClick={() => onSelectSize(i)}
          >
            <span className="size-icon" aria-hidden="true">
              {preset.label === 'Small' ? '🐕' : preset.label === 'Medium' ? '🐕‍🦺' : '🦮'}
            </span>
            <strong>{preset.label}</strong>
            <span className="size-desc">{preset.description}</span>
          </button>
        ))}
      </div>

      {selectedSize !== null && (
        <div className="customiser">
          <div className="customiser-field">
            <label htmlFor="bag-weight">Bag size</label>
            <select
              id="bag-weight"
              value={bagWeight}
              onChange={(e) => onBagWeightChange(Number(e.target.value))}
            >
              {BAG_WEIGHT_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w}kg
                </option>
              ))}
            </select>
          </div>

          <div className="customiser-field">
            <label htmlFor="frequency">Delivery every</label>
            <select
              id="frequency"
              value={frequencyWeeks}
              onChange={(e) => onFrequencyChange(Number(e.target.value))}
            >
              {FREQUENCY_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w} {w === 1 ? 'week' : 'weeks'}
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary" onClick={onContinue}>
            Continue
          </button>
        </div>
      )}
    </section>
  );
}
