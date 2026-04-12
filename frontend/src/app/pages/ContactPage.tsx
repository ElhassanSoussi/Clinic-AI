import { useState } from "react";
import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { ApiError, apiJson } from "@/lib/api";
import { notifyError, notifySuccess } from "@/lib/feedback";

export function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setFeedback(null);
    try {
      const res = await apiJson<{ success?: boolean; message?: string }>("/contact", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          clinic_name: clinicName.trim(),
          phone: phone.trim(),
          message: message.trim(),
        }),
      });
      setStatus("success");
      const ok = res.message || "Thank you! We'll be in touch shortly.";
      setFeedback(ok);
      notifySuccess("Message sent", ok);
      setName("");
      setEmail("");
      setClinicName("");
      setPhone("");
      setMessage("");
    } catch (err) {
      setStatus("error");
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Something went wrong.";
      setFeedback(msg);
      notifyError("Could not send message", msg);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-foreground mb-6">Get in Touch</h1>
            <p className="text-xl text-muted-foreground">
              We're here to help with any questions about Clinic AI
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-semibold mb-6">Send us a message</h2>
              {feedback && status === "success" && (
                <div className="mb-4 p-3 rounded-lg border border-border bg-muted/40 text-sm">{feedback}</div>
              )}
              {feedback && status === "error" && (
                <div className="mb-4 p-3 rounded-lg border border-destructive/50 bg-destructive/10 text-sm text-destructive">
                  {feedback}
                </div>
              )}
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Your name"
                    required
                    minLength={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Clinic Name</label>
                  <input
                    type="text"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Your clinic"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                    placeholder="How can we help?"
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-60"
                >
                  {status === "loading" ? "Sending…" : "Send Message"}
                </button>
              </form>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-6">Other ways to reach us</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Email Support</h3>
                    <p className="text-muted-foreground text-sm mb-2">For general inquiries and support</p>
                    <a href="mailto:support@clinicai.com" className="text-primary hover:underline">
                      support@clinicai.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Sales Team</h3>
                    <p className="text-muted-foreground text-sm mb-2">Questions about pricing and features</p>
                    <a href="mailto:sales@clinicai.com" className="text-primary hover:underline">
                      sales@clinicai.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Phone</h3>
                    <p className="text-muted-foreground text-sm mb-2">Monday - Friday, 9am - 5pm PST</p>
                    <a href="tel:+18885551234" className="text-primary hover:underline">
                      (888) 555-1234
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-12 p-6 bg-card rounded-xl border border-border">
                <h3 className="font-semibold mb-2">Schedule a Demo</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  See Clinic AI in action with a personalized walkthrough
                </p>
                <button
                  type="button"
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  Book Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
