const faqs = [
  {
    question: 'How do I transition my dog to new food?',
    answer:
      'We recommend a gradual transition over 7-10 days. Start by mixing 25% Little Green Dog with 75% of your current food, then increase the ratio every few days until your dog is fully transitioned.',
  },
  {
    question: 'What if my dog doesn\'t like it?',
    answer:
      'We stand behind our Sensitivity Promise. If it\'s not the right fit for your dog, just reach out and we\'ll refund you — no hoops, no hassle.',
  },
  {
    question: 'Can I change my bag size or frequency later?',
    answer:
      'Absolutely. You can update your bag size, delivery frequency, or add-ons at any time through your subscription portal. Changes take effect on your next delivery.',
  },
  {
    question: 'What\'s in the food — is it really hypoallergenic?',
    answer:
      'Yes. Our formula is specifically designed to exclude common allergens: no beef, dairy, gluten, wheat, grain, or fillers. We use hypoallergenic proteins like turkey, salmon, and duck alongside grain-free carbs and functional superfoods.',
  },
  {
    question: 'Where is the food made?',
    answer:
      'Little Green Dog is an NZ-owned company. Our kibble is manufactured by Bridge PetCare in Shanghai, using our proprietary formula with carefully sourced ingredients.',
  },
  {
    question: 'How does the subscription work after the sample?',
    answer:
      'Your 2kg sample ships first at 50% off. After that, your subscription automatically transitions to the bag size and delivery frequency you chose during setup. You can skip, pause, or cancel anytime.',
  },
];

export function FAQSection() {
  return (
    <section className="faq-section" id="faq">
      <div className="faq-inner">
        <span className="section-label">Support</span>
        <h2>Frequently asked questions</h2>
        <div className="faq-list">
          {faqs.map((faq) => (
            <details className="faq-item" key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
