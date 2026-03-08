const faqs = [
  {
    question: 'What if my dog doesn\'t like it?',
    answer:
      'We stand behind our Sensitivity Promise. If it\'s not the right fit for your dog, just reach out and we\'ll give you a full refund — no hoops, no hassle, no questions asked.',
  },
  {
    question: 'How does the subscription work after the sample?',
    answer:
      'Your 2kg sample ships first at 50% off. After that, your subscription automatically transitions to the bag size you chose — delivered every 4 weeks. You can skip, pause, or cancel anytime from your account.',
  },
  {
    question: 'Can I change my bag size later?',
    answer:
      'Absolutely. You can update your bag size or add-ons at any time through your subscription portal. We offer 2kg, 6kg, and 12kg bags to suit all dog sizes. Changes take effect on your next delivery.',
  },
  {
    question: 'How long does delivery take?',
    answer:
      'Orders are typically delivered within 1–3 business days across New Zealand. You\'ll receive a tracking notification as soon as your order ships.',
  },
  {
    question: 'What\'s in the food — is it really hypoallergenic?',
    answer:
      'Yes. Our formula is specifically designed to exclude common allergens: no beef, dairy, gluten, wheat, grain, or fillers. We use hypoallergenic proteins alongside grain-free carbs and 20+ functional superfoods.',
  },
  {
    question: 'How do I transition my dog to new food?',
    answer:
      'We recommend a gradual transition over 7–10 days. Start by mixing 25% Little Green Dog with 75% of your current food, then increase the ratio every few days until your dog is fully transitioned.',
  },
  {
    question: 'Where is the food made?',
    answer:
      'Little Green Dog is an NZ-owned company. Our kibble is manufactured by Bridge PetCare in Shanghai, using our proprietary formula with carefully sourced ingredients.',
  },
];

interface FAQSectionProps {
  onGetStarted?: () => void;
  samplePrice?: string;
}

export function FAQSection({ onGetStarted, samplePrice }: FAQSectionProps) {
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

        {onGetStarted && (
          <div className="faq-cta">
            <p className="faq-cta-heading">Still on the fence? Try it risk-free.</p>
            <button className="btn-order" onClick={onGetStarted}>
              {samplePrice ? `Get my sample — ${samplePrice}` : 'Get my sample'}
            </button>
            <p className="faq-cta-note">50% off your first box · Full refund if it's not a fit</p>
          </div>
        )}
      </div>
    </section>
  );
}
