# Project memory — subscription

## Design decisions (do not flag as issues)

### Sample sizing copy vs. cart variant — intentional
The `SampleSubscribePicker` hardcodes "2kg sample" in three places (the how-it-works
step, the "2kg sample today" summary row, and the "Send my 2kg sample" button), while the
cart builds the line from `getSampleVariantGid(bagSizeKg)` (the sample variant for the
chosen bag size) and the FAQ describes a "size-matched 2kg–8kg sample (based on the bag
size you choose)."

This apparent inconsistency is **by design** — it exists to enable the future
subscription deliveries (the sample variant carries the selling plan that seeds the
ongoing subscription at the chosen bag size). Do **not** raise this as a conversion,
trust, support, or refund risk, and do not recommend making the "2kg sample" copy and the
size-matched FAQ copy consistent. Chris has confirmed this is intended behaviour.
