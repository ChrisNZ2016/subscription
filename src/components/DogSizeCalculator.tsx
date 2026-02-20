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

const SIZE_ICONS: Record<string, string> = {
  Small: 'S',
  Medium: 'M',
  Large: 'L',
};

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
      <div className="step-inner">
        <h2>Build your perfect plan</h2>
        <p className="step-subtitle">
          Pick your dog's size and we'll recommend the right bag and delivery
          schedule. You can always customise it.
        </p>

        <div className="size-cards">
          {DOG_SIZE_PRESETS.map((preset, i) => (
            <button
              key={preset.label}
              className={`size-card ${selectedSize === i ? 'selected' : ''}`}
              onClick={() => onSelectSize(i)}
            >
              <span className="size-icon" aria-hidden="true">
                {SIZE_ICONS[preset.label] ?? preset.label[0]}
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
      </div>
    </section>
  );
}
