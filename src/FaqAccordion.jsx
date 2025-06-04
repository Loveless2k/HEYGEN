import { useState } from 'react';

function FaqItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        borderBottom: '1px solid var(--theme-border)',
        marginBottom: '16px',
        paddingBottom: '16px'
      }}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          padding: '8px 0',
          fontWeight: '600',
          fontSize: '18px',
          color: 'var(--theme-text)',
          transition: 'all 0.3s ease'
        }}
      >
        <span>{question}</span>
        <span
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            transition: 'transform 0.3s ease',
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            color: 'var(--theme-text)'
          }}
        >
          +
        </span>
      </div>

      <div
        style={{
          maxHeight: isOpen ? '500px' : '0',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          opacity: isOpen ? 1 : 0,
          marginTop: isOpen ? '12px' : '0',
          color: 'var(--theme-text-secondary)',
          lineHeight: '1.6'
        }}
      >
        <p>{answer}</p>
      </div>
    </div>
  );
}

function FaqAccordion({ faqs }) {
  return (
    <div>
      {faqs.map((faq, index) => (
        <FaqItem
          key={index}
          question={faq.question}
          answer={faq.answer}
        />
      ))}
    </div>
  );
}

export default FaqAccordion;
