import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Privacy Policy - MEP 2027",
  description: "Privacy policy for MEP 2027 New Year MEP application process",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-[rgba(255,255,255,0.6)] bg-[rgba(255,255,255,0.6)] border-b border-[rgba(255,255,255,0.3)]">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-extrabold tracking-wide" style={{ fontFamily: "Cinzel, serif" }}>
            <span className="glow-text-gold">MEP</span> <span className="glow-text-blue">2027</span>
          </Link>
          <Link href="/">
            <Button variant="outline" className="glass-button border-[rgba(51,51,51,0.2)] text-[#333333]">
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-16">
        <Card className="bg-[rgba(255,255,255,0.7)] border-[rgba(255,255,255,0.3)] backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "Cinzel, serif", color: '#333333' }}>
              Privacy Policy
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2" style={{ color: '#555555' }}>
              Last Updated: January 2026
            </p>
          </CardHeader>
          <CardContent className="space-y-6 text-[#333333]">
            <section>
              <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "Cinzel, serif" }}>1. Information We Collect</h2>
              <p className="mb-2">When you apply as a Leader or Co-Leader for MEP 2027, we collect:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Full Name</li>
                <li>Email Address</li>
                <li>WhatsApp Number</li>
                <li>Profile Picture (uploaded by you)</li>
                <li>Short Bio (optional)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "Cinzel, serif" }}>2. How We Use Your Information</h2>
              <p className="mb-2">We use your information to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Process your application for Leader/Co-Leader positions</li>
                <li>Contact you regarding your application status</li>
                <li>Display your profile on the MEP website (if selected)</li>
                <li>Communicate project updates and deadlines</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "Cinzel, serif" }}>3. Data Storage and Security</h2>
              <p>
                Your data is stored securely in our database. Profile pictures are stored as optimized base64-encoded images. 
                We implement strict security measures to protect your personal information from unauthorized access, 
                alteration, disclosure, or destruction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "Cinzel, serif" }}>4. Data Sharing</h2>
              <p>
                We do not sell, trade, or rent your personal information to third parties. Your information is only 
                shared with MEP team members involved in the selection process. If you are selected as a Leader or 
                Co-Leader, your name and profile picture will be displayed publicly on the MEP website.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "Cinzel, serif" }}>5. Your Rights</h2>
              <p className="mb-2">You have the right to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Access your personal data</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Withdraw your application at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "Cinzel, serif" }}>6. Contact Us</h2>
              <p className="mb-2">
                If you have any questions about this Privacy Policy or wish to exercise your data rights, please contact us:
              </p>
              <ul className="list-none space-y-1 ml-4">
                <li>📧 Email: <a href="mailto:toxicsmile22936@gmail.com" className="text-blue-600 hover:underline">toxicsmile22936@gmail.com</a></li>
                <li>💬 Discord: <a href="https://discordapp.com/users/1263021894773506162" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">@toxicsmile</a></li>
                <li>📱 Telegram: <a href="https://t.me/toxicsmile22936" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">@toxicsmile22936</a></li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "Cinzel, serif" }}>7. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. The &quot;Last Updated&quot; date at the top will reflect 
                the most recent changes. We encourage you to review this policy periodically.
              </p>
            </section>

            <section className="pt-6 border-t border-[rgba(0,0,0,0.1)]">
              <p className="text-sm text-muted-foreground">
                By submitting your application, you acknowledge that you have read and understood this Privacy Policy 
                and consent to the collection and use of your information as described.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t bg-[rgba(255,255,255,0.6)] backdrop-blur mt-16">
        <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© 2026–2027 MEP — New Year 2027 Invitation</p>
          <div className="text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
