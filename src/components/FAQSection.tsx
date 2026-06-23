import type { ReactNode } from 'react';
import { trackFaqExpanded } from '../lib/analytics';

export interface FaqItem {
  question: string;
  answer: ReactNode;
}

const faqs: FaqItem[] = [
  {
    question: 'What if my dog doesn\'t like it?',
    answer:
      'We stand behind our Sensitivity Promise. If it\'s not the right fit for your dog, just reach out and we\'ll give you a full refund, no hoops, no hassle, no questions asked.',
  },
  {
    question: 'How does the subscription work after the sample?',
    answer:
      'Your 2kg sample ships first at 50% off. After that, your subscription automatically transitions to the bag size you chose, delivered every 4 weeks. You can skip, pause, or cancel anytime from your account.',
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
    question: 'What\'s in the food, and is it really hypoallergenic?',
    answer:
      'Yes. Our formula is specifically designed to exclude common allergens: no beef, dairy, gluten, wheat, grain, or fillers. We use hypoallergenic proteins alongside grain-free carbs and 6+ functional superfoods.',
  },
  {
    question: 'How do I transition my dog to new food?',
    answer:
      'We recommend a gradual transition over 7–10 days. Start by mixing 25% Little Green Dog with 75% of your current food, then increase the ratio every few days until your dog is fully transitioned.',
  },
  {
    question: 'Where is the food made?',
    answer:
      'Our food is manufactured with Bridge PetCare, one of China\'s largest and most respected pet food makers who hold ISO 9001, 22000, 45001 and 14001 certified, plus GMP, BRC, HACCP and FDA registration. Eight internal laboratories, and never responsible for a product recall.\n\nEvery batch is independently verified by SGS Laboratories across 73 distinct nutritional, chemical and safety factors including nutrient profiles, fatty acids, minerals, vitamins, pathogens, heavy metals, contaminants and mycotoxins.',
  },
];

function renderFaqAnswer(answer: ReactNode) {
  if (typeof answer === 'string') {
    return answer.split('\n\n').map((paragraph) => (
      <p key={paragraph}>{paragraph}</p>
    ));
  }

  return answer;
}

interface FAQSectionProps {
  children?: React.ReactNode;
  additionalFaqs?: FaqItem[];
}

export function FAQSection({ children, additionalFaqs = [] }: FAQSectionProps) {
  const allFaqs = [...additionalFaqs, ...faqs];

  return (
    <section className="faq-section" id="faq">
      <div className="faq-inner">
        <span className="section-label" style={{ display: 'block', textAlign: 'center' }}>Support</span>
        <h2>Frequently asked questions</h2>
        <div className="faq-list">
          {allFaqs.map((faq) => (
            <details
              className="faq-item"
              key={faq.question}
              onToggle={(e) => {
                if ((e.currentTarget as HTMLDetailsElement).open) {
                  trackFaqExpanded({ question: faq.question });
                }
              }}
            >
              <summary>{faq.question}</summary>
              {renderFaqAnswer(faq.answer)}
            </details>
          ))}
        </div>

        {children}
      </div>
    </section>
  );
}
