import { Navigation } from "../components/Navigation";
import { Footer } from "../components/Footer";

export function FAQPage() {
  const faqs = [
    {
      question: "How does the AI assistant work?",
      answer: "Your AI assistant is trained on your clinic's specific information—services, policies, insurance, and procedures. When patients reach out, it can answer questions, book appointments, and collect necessary information automatically. Complex cases are escalated to your staff.",
    },
    {
      question: "Can patients book appointments directly?",
      answer: "Yes. The AI can check your availability and book appointments in real-time. Patients receive confirmation via SMS or email, and staff can review and adjust bookings through the dashboard.",
    },
    {
      question: "What channels are supported?",
      answer: "Clinic AI works across website chat and SMS. You can embed the chat widget on your site and get a dedicated phone number for text messaging.",
    },
    {
      question: "How long does setup take?",
      answer: "Most clinics are up and running in under an hour. You'll provide information about your services and policies, customize your availability, and embed the chat widget on your site.",
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We're HIPAA compliant, SOC 2 Type II certified, and use enterprise-grade encryption. All patient data is encrypted in transit and at rest. Business Associate Agreements are available.",
    },
    {
      question: "Can I customize the AI's responses?",
      answer: "Yes. You control what the AI knows through our training interface. Add information about your services, update policies, and review conversations to improve accuracy over time.",
    },
    {
      question: "What if the AI can't handle a question?",
      answer: "The AI is designed to recognize when it needs help. Complex medical questions, emergencies, or unusual requests are automatically flagged for staff review in the inbox.",
    },
    {
      question: "How is billing calculated?",
      answer: "Plans are based on the number of patient conversations per month. A conversation is any exchange between a patient and your clinic, whether handled by AI or staff.",
    },
    {
      question: "Can I cancel anytime?",
      answer: "Yes. There are no long-term contracts. You can cancel your subscription at any time and export all your data.",
    },
    {
      question: "Do you integrate with practice management software?",
      answer: "We're actively building integrations with major PM systems. Contact us to discuss your specific needs and timeline.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-foreground mb-6">Frequently Asked Questions</h1>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about Clinic AI
            </p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-card rounded-xl p-8 border border-border">
                <h3 className="text-xl font-semibold mb-3">{faq.question}</h3>
                <p className="text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 bg-card rounded-2xl p-12 border border-border text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">Still have questions?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              We're here to help. Reach out anytime.
            </p>
            <a
              href="/contact"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Contact Support
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
