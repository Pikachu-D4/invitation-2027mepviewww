"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Send, Menu, X } from "lucide-react";
import { toast } from "sonner";

const TARGET_DATE = new Date("2027-01-01T00:00:00+05:30");

type Leader = {
  id: number;
  name: string | null;
  role: string | null;
  avatar: string;
  status: string;
  position: number;
};

const DEFAULT_LEADERS: Leader[] = [
  { id: 1, name: null, role: 'Leader', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader1', status: 'open', position: 1 },
  { id: 2, name: null, role: 'Leader', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader2', status: 'open', position: 2 },
  { id: 3, name: null, role: 'Leader', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader3', status: 'open', position: 3 },
  { id: 4, name: null, role: 'Co-Leader', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader4', status: 'open', position: 4 },
  { id: 5, name: null, role: 'Co-Leader', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader5', status: 'open', position: 5 },
  { id: 6, name: null, role: 'Co-Leader', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader6', status: 'open', position: 6 },
];

export default function Home() {
  const [leaders, setLeaders] = useState<Leader[]>(DEFAULT_LEADERS);
  const [loading, setLoading] = useState(false);
  const filled = useMemo(() => leaders.filter((l) => l.status === 'filled').length, [leaders]);
  const total = 6;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // New: profile image state
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState(getTimeLeft());
  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch leaders from database / store
  useEffect(() => {
    fetchLeaders();
  }, []);

  async function fetchLeaders() {
    try {
      const response = await fetch(`/api/leaders?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setLeaders(data);
        }
      }
    } catch (error) {
      console.warn('Could not refresh leaders:', error);
    }
  }

  // New: Celebration state
  const [celebrate, setCelebrate] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setCelebrate(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  function getTimeLeft() {
    const now = new Date();
    const diff = TARGET_DATE.getTime() - now.getTime();
    const clamped = Math.max(0, diff);
    const s = Math.floor(clamped / 1000);
    const days = Math.floor(s / 86400);
    const hours = Math.floor(s % 86400 / 3600);
    const minutes = Math.floor(s % 3600 / 60);
    const seconds = s % 60;
    return { days, hours, minutes, seconds };
  }

  // Compress and resize image to ~40KB so upload & display is ultra fast on all devices
  async function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement('canvas');
        const maxDim = 450;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    });
  }

  // Image selection handler with auto-compression
  async function handleImageChange(file: File | null) {
    setImageError(null);
    if (!file) {
      setProfileImageFile(null);
      if (profilePreview) URL.revokeObjectURL(profilePreview);
      setProfilePreview(null);
      return;
    }
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setImageError('Please upload a JPG, JPEG, or PNG image.');
      return;
    }
    const maxSize = 10 * 1024 * 1024; // Allow up to 10MB original photo
    if (file.size > maxSize) {
      setImageError('Image must be smaller than 10 MB.');
      return;
    }

    try {
      const compressed = await compressImage(file);
      if (profilePreview) URL.revokeObjectURL(profilePreview);
      const url = URL.createObjectURL(compressed);
      setProfileImageFile(compressed);
      setProfilePreview(url);
    } catch {
      if (profilePreview) URL.revokeObjectURL(profilePreview);
      const url = URL.createObjectURL(file);
      setProfileImageFile(file);
      setProfilePreview(url);
    }
  }

  useEffect(() => {
    return () => {
      if (profilePreview) URL.revokeObjectURL(profilePreview);
    };
  }, [profilePreview]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !whatsapp) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!profileImageFile) {
      setImageError('Profile picture is required before submission.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('whatsapp', whatsapp);
      if (bio) formData.append('bio', bio);
      formData.append('profileImage', profileImageFile);

      const response = await fetch('/api/applications', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'NO_OPEN_SLOTS') {
          toast.error('All leader slots are filled. Thank you for your interest!');
        } else if (data.code === 'MISSING_IMAGE') {
          setImageError('Profile picture is required before submission.');
        } else if (data.code === 'INVALID_IMAGE_TYPE') {
          setImageError('Please upload a JPG or PNG image.');
        } else if (data.code === 'IMAGE_TOO_LARGE') {
          setImageError('Image must be smaller than 2 MB.');
        } else if (data.code === 'UNSUPPORTED_MEDIA_TYPE') {
          toast.error('Upload failed: unsupported format.');
        } else {
          toast.error(data.error || 'Failed to submit application');
        }
        return;
      }

      // Success!
      toast.success('Application submitted successfully!');
      setName("");
      setEmail("");
      setWhatsapp("");
      setBio("");
      setProfileImageFile(null);
      if (profilePreview) URL.revokeObjectURL(profilePreview);
      setProfilePreview(null);
      setImageError(null);

      // Refresh leaders to show the new filled slot
      await fetchLeaders();
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 text-[#333333] relative">
      {/* Animated backgrounds */}
      <Fireworks celebrate={celebrate} />
      <Confetti celebrate={celebrate} />
      <GoldenSparkles celebrate={celebrate} />
      <SparkleCursor />
      {/* Soft pastel glow background with slight parallax */}
      <ParallaxBackground />

      <Navbar filled={filled} total={total} />

      <SectionWithParallax>
        <Hero timeLeft={timeLeft} celebrate={celebrate} />
      </SectionWithParallax>

      <main className="relative z-10">
        <SectionWithParallax>
          <About />
        </SectionWithParallax>
        <SectionWithParallax>
          <LeadersGrid leaders={leaders} filled={filled} total={total} loading={loading} />
        </SectionWithParallax>
        <SectionWithParallax>
          <ApplicationForm
            name={name}
            email={email}
            whatsapp={whatsapp}
            bio={bio}
            submitting={submitting}
            onName={setName}
            onEmail={setEmail}
            onWhatsapp={setWhatsapp}
            onBio={setBio}
            onSubmit={handleSubmit}
            progress={filled / total * 100}
            profilePreview={profilePreview}
            imageError={imageError}
            onImageChange={handleImageChange} />

        </SectionWithParallax>
        <SectionWithParallax>
          <FAQ />
        </SectionWithParallax>
        <SectionWithParallax>
          <Contact />
        </SectionWithParallax>
      </main>

      <Footer />

      <FloatingParticles />

      <style>{`:root html{scroll-behavior:smooth}`}</style>
    </div>);

}

// New: subtle parallax pastel blobs
function ParallaxBackground() {
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -50]);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
      <motion.div
        className="absolute -top-40 left-1/2 -translate-x-1/2 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-60"
        style={{
          background: "radial-gradient(closest-side, #A7D8FF, transparent 70%)",
          y: y1
        }} />

      <motion.div
        className="absolute top-1/2 -right-24 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-50"
        style={{
          background: "radial-gradient(closest-side, #B9FBC0, transparent 70%)",
          y: y2
        }} />

      <motion.div
        className="absolute -bottom-32 -left-20 h-[22rem] w-[22rem] rounded-full blur-3xl opacity-50"
        style={{
          background: "radial-gradient(closest-side, #FFD6E0, transparent 70%)",
          y: y1
        }} />

      <motion.div
        className="absolute top-[20%] left-[10%] h-40 w-40 rounded-full blur-2xl opacity-60"
        style={{
          background: "radial-gradient(closest-side, #D7C4F3, transparent 70%)",
          y: y2
        }} />

    </div>);

}

function Navbar({ filled, total }: {filled: number;total: number;}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close menu when clicking on a link
  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-[rgba(255,255,255,0.6)] bg-[rgba(255,255,255,0.6)] border-b border-[rgba(255,255,255,0.3)]">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <a href="#hero" className="font-extrabold tracking-wide" style={{ fontFamily: "Cinzel, serif" }}>
          <span className="glow-text-gold">MEP</span> <span className="glow-text-blue">2027</span>
        </a>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <a href="#about" className="hover:text-[color:var(--gold)] transition">About</a>
          <a href="#leaders" className="hover:text-[color:var(--gold)] transition">Leaders</a>
          <a href="#apply" className="hover:text-[color:var(--gold)] transition">Apply</a>
          <a href="#faq" className="hover:text-[color:var(--gold)] transition">FAQ</a>
          <a href="#contact" className="hover:text-[color:var(--gold)] transition">Contact</a>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Badge className="bg-[color:var(--gold)] text-black">{filled}/{total} filled</Badge>
          <a href="#apply">
            <Button className="bg-[color:var(--gold)] text-black hover:bg-[color:var(--gold)]/90">Apply</Button>
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 hover:bg-white/50 rounded-lg transition"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden bg-[rgba(255,255,255,0.95)] backdrop-blur-xl border-t border-[rgba(255,255,255,0.3)]"
          >
            <div className="px-4 py-4 space-y-3">
              <a
                href="#about"
                onClick={handleLinkClick}
                className="block py-2 px-4 hover:bg-white/60 rounded-lg transition text-[#333333]"
              >
                About
              </a>
              <a
                href="#leaders"
                onClick={handleLinkClick}
                className="block py-2 px-4 hover:bg-white/60 rounded-lg transition text-[#333333]"
              >
                Leaders
              </a>
              <a
                href="#apply"
                onClick={handleLinkClick}
                className="block py-2 px-4 hover:bg-white/60 rounded-lg transition text-[#333333]"
              >
                Apply
              </a>
              <a
                href="#faq"
                onClick={handleLinkClick}
                className="block py-2 px-4 hover:bg-white/60 rounded-lg transition text-[#333333]"
              >
                FAQ
              </a>
              <a
                href="#contact"
                onClick={handleLinkClick}
                className="block py-2 px-4 hover:bg-white/60 rounded-lg transition text-[#333333]"
              >
                Contact
              </a>
              
              <div className="pt-3 border-t border-[rgba(0,0,0,0.1)] flex flex-col gap-3">
                <Badge className="bg-[color:var(--gold)] text-black w-fit">{filled}/{total} filled</Badge>
                <a href="#apply" onClick={handleLinkClick}>
                  <Button className="w-full bg-[color:var(--gold)] text-black hover:bg-[color:var(--gold)]/90">
                    Apply Now
                  </Button>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Hero({ timeLeft, celebrate }: {timeLeft: {days: number;hours: number;minutes: number;seconds: number;};celebrate: boolean;}) {
  return (
    <section id="hero" className="relative overflow-hidden">
      <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-24 md:pt-28 md:pb-32 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        {/* New: Glossy invitation box with liquid-glass UI */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mx-auto max-w-4xl p-8 md:p-12 rounded-3xl glass-panel bg-[rgba(255,255,255,0.15)] border-[rgba(255,255,255,0.3)] backdrop-blur-3xl shadow-2xl overflow-hidden relative"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}>

          <div className="liquid-bg"></div>
          {/* Subtle glow behind main text */}
          {celebrate &&
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-gold/20 via-transparent to-blue-100/20 rounded-3xl blur-3xl opacity-70"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0.8 }}
            transition={{ duration: 3, repeat: 1 }} />

          }
          <div className="relative z-10 text-center">
            <motion.h1 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}
            className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
              <span className="block glass-text-charcoal shimmer" style={{ fontFamily: "Cinzel, serif" }}>New Year 2027</span>
              <span className="block glass-text-pastel-blue shimmer" style={{ fontFamily: "Cinzel, serif" }}>MEP Invitation</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }} viewport={{ once: true }}
            className="mb-8 text-base md:text-lg text-[#333333] max-w-2xl mx-auto">
              Celebrate progress, leadership, and community. You are invited to join New Year 2027 AMV MEP.
            </motion.p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <a href="#apply"><Button size="lg" className="liquid-button text-black shadow-[0_8px_32px_0_rgba(167,216,255,0.1)] hover:shadow-[0_8px_32px_0_rgba(167,216,255,0.3)] backdrop-blur-md border-[rgba(255,255,255,0.2)]" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(167,216,255,0.6))' }}>Apply as Leader</Button></a>
              <a href="#apply"><Button size="lg" className="liquid-button text-[#333333] shadow-[0_8px_32px_0_rgba(215,196,243,0.1)] hover:shadow-[0_8px_32px_0_rgba(215,196,243,0.3)] backdrop-blur-md border-[rgba(255,255,255,0.2)]" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(215,196,243,0.6))' }}>Apply as Co-Leader</Button></a>
              <a href="#about"><Button variant="outline" size="lg" className="glass-button border-[rgba(51,51,51,0.2)] text-[#333333] hover:bg-[rgba(255,255,255,0.5)] hover:shadow-[0_4px_16px_0_rgba(51,51,51,0.1)] backdrop-blur-md">Learn more</Button></a>
            </div>

            {/* Flipping Countdown with liquid glass effects */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="max-w-xl mx-auto">

              <motion.div
                className="text-center mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}>

                <span
                  className="text-xl md:text-2xl text-[#333333] glass-text-charcoal"
                  style={{ fontFamily: "Inter, sans-serif" }}>

                  Total days left in New Year
                </span>
              </motion.div>
              <motion.div
                className="glass-panel p-4 rounded-xl bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.2)] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] overflow-hidden"
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.3 }}>

                <div className="liquid-bg"></div>
                <div className="grid grid-cols-4 gap-3 sm:gap-6 relative z-10">
                  {(['days', 'hours', 'minutes', 'seconds'] as const).map((unit) => {
                    const value = timeLeft[unit];
                    const label = unit.charAt(0).toUpperCase() + unit.slice(1);
                    return (
                      <motion.div key={unit} className="glass-panel group" whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                        <Card className="relative bg-[rgba(255,255,255,0.6)] border-[rgba(255,255,255,0.3)] backdrop-blur-xl shadow-[0_4px_16px_0_rgba(0,0,0,0.1)] overflow-hidden">
                          <CardContent className="p-4 text-center relative z-10">
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={value}
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -50, opacity: 0 }}
                                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                className="text-3xl font-bold text-[#333333] drop-shadow-md"
                                style={{ fontFamily: "Cinzel, serif" }}>

                                {value.toString().padStart(2, '0')}
                              </motion.div>
                            </AnimatePresence>
                            <div className="text-xs uppercase tracking-widest text-[#555555] mt-1">{label}</div>
                          </CardContent>
                        </Card>
                      </motion.div>);

                  })}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Background image with overlay for futuristic feel */}
        <div className="absolute inset-0 -z-10" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop)", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.1 }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(255,255,255,0.1)] via-transparent to-transparent"></div>
      </div>
    </section>);

}

// New: Golden sparkles rain on celebration
function GoldenSparkles({ celebrate }: {celebrate: boolean;}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!celebrate) return;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '-10';
    document.body.appendChild(canvas);
    canvasRef.current = canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      if (canvasRef.current && document.body.contains(canvasRef.current)) {
        document.body.removeChild(canvasRef.current);
        canvasRef.current = null;
      }
      return;
    }

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const resize = () => {
      if (!canvasRef.current) return;
      w = canvasRef.current.width = window.innerWidth;
      h = canvasRef.current.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);

    type Spark = {x: number;y: number;vy: number;life: number;size: number;};
    let sparks: Spark[] = [];

    const burst = () => {
      for (let i = 0; i < 100; i++) {
        sparks.push({
          x: Math.random() * w,
          y: -10,
          vy: 2 + Math.random() * 3,
          life: 100 + Math.random() * 50,
          size: 2 + Math.random() * 4
        });
      }
    };

    let bursts = 0;
    const interval = setInterval(() => {
      burst();
      bursts++;
      if (bursts >= 3) clearInterval(interval);
    }, 800);

    let raf: number;
    const animate = () => {
      if (!canvasRef.current) return;
      raf = requestAnimationFrame(animate);
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.y += s.vy;
        s.life--;
        if (s.life <= 0 || s.y > h) {
          sparks.splice(i, 1);
          continue;
        }

        const alpha = s.life / 150;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (sparks.length === 0 && bursts >= 3) {
        cancelAnimationFrame(raf);
        if (canvasRef.current && document.body.contains(canvasRef.current)) {
          document.body.removeChild(canvasRef.current);
        }
        canvasRef.current = null;
        window.removeEventListener('resize', resize);
      }
    };
    animate();

    return () => {
      clearInterval(interval);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (canvasRef.current && document.body.contains(canvasRef.current)) {
        document.body.removeChild(canvasRef.current);
      }
      canvasRef.current = null;
    };
  }, [celebrate]);

  return null;
}

// Modified: Confetti burst on celebration
function Confetti({ celebrate }: {celebrate: boolean;}) {
  // Continuous subtle confetti
  const pieces = Array.from({ length: 50 }).map((_, i) => i);
  // Burst confetti on load
  useEffect(() => {
    if (!celebrate) return;

    const burstPieces = Array.from({ length: 200 }).map((_, i) => i);
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    burstPieces.forEach((_, i) => {
      const angle = Math.PI * 2 * i / burstPieces.length;
      const velocity = 5 + Math.random() * 10;
      const spark = document.createElement('div');
      spark.style.position = 'fixed';
      spark.style.left = `${centerX}px`;
      spark.style.top = `${centerY}px`;
      spark.style.width = '6px';
      spark.style.height = '6px';
      spark.style.backgroundColor = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][Math.floor(Math.random() * 5)];
      spark.style.borderRadius = '50%';
      spark.style.pointerEvents = 'none';
      spark.style.zIndex = '1000';
      document.body.appendChild(spark);

      const anim = spark.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      {
        transform: `translate(${Math.cos(angle) * velocity * 50}px, ${Math.sin(angle) * velocity * 50}px) scale(0)`,
        opacity: 0
      }],
      {
        duration: 2000 + Math.random() * 1000,
        easing: 'ease-out'
      });

      anim.onfinish = () => spark.remove();
    });
  }, [celebrate]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
      <style>{`@keyframes fall { to { transform: translateY(110vh) rotate(1turn); opacity: .9; } }`}</style>
      {pieces.map((i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 3;
        const size = 6 + Math.random() * 8;
        const colors = ["#FFE66D", "#E0E0E0", "#ffffff"] as const;
        const color = colors[i % colors.length];
        const duration = 5 + Math.random() * 6;
        return (
          <span key={i} className="absolute top-[-10vh] rounded" style={{
            left: `${left}%`, width: size, height: size, background: color, filter: 'drop-shadow(0 0 6px rgba(224,224,224,.6))',
            animation: `fall ${duration}s linear ${delay}s infinite`
          }} />);

      })}
    </div>);

}

// New: Fireworks with initial bursts
function Fireworks({ celebrate }: {celebrate: boolean;}) {
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.className = 'fixed inset-0 -z-30 pointer-events-none';
    Object.assign(canvas.style, { position: 'fixed', inset: '0', zIndex: '-30', pointerEvents: 'none' });
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
      return;
    }

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    type Particle = {x: number;y: number;vx: number;vy: number;life: number;color: string;};
    let particles: Particle[] = [];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFE66D', '#A7D8FF', '#B9FBC0', '#FFD6E0', '#D7C4F3'];

    function burst(x: number, y: number, large = false) {
      const count = large ? 50 + Math.floor(Math.random() * 30) : 24 + Math.floor(Math.random() * 12);
      for (let i = 0; i < count; i++) {
        const a = Math.PI * 2 * i / count + Math.random() * 0.2;
        const speed = large ? 3 + Math.random() * 5 : 1.2 + Math.random() * 2.2;
        particles.push({
          x, y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: large ? 120 + Math.random() * 60 : 60 + Math.random() * 30,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    }

    // Initial celebration bursts
    if (celebrate) {
      let burstCount = 0;
      const initialBursts = setInterval(() => {
        burst(Math.random() * w, h * 0.3 + Math.random() * h * 0.4, true);
        burstCount++;
        if (burstCount >= 5) {
          clearInterval(initialBursts);
        }
      }, 500);
    }

    let frame = 0;
    let raf: number;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      frame++;
      ctx.clearRect(0, 0, w, h);
      // More frequent background bursts for continuous fireworks effect
      if (frame % 60 === 0) {// Every ~1 second at 60fps
        burst(Math.random() * w, h * 0.2 + Math.random() * h * 0.5, false);
      }
      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03; // gravity
        p.life -= 1;
        if (p.life <= 0) {particles.splice(i, 1);continue;}
        const alpha = Math.max(0, Math.min(1, p.life / 120));
        const size = 3 + (1 - alpha) * 2; // Larger when fading
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      // Cleanup check: remove canvas if no particles and not celebrating
      if (particles.length === 0 && !celebrate && frame > 300) {
        cancelAnimationFrame(raf);
        if (document.body.contains(canvas)) {
          document.body.removeChild(canvas);
        }
        window.removeEventListener('resize', onResize);
        return;
      }
    };
    loop();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    };
  }, [celebrate]);

  return null;
}

// New: Sparkle cursor using lightweight canvas emitter
function SparkleCursor() {
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.className = 'fixed inset-0 z-50 pointer-events-none';
    Object.assign(canvas.style, { position: 'fixed', inset: '0', zIndex: '50', pointerEvents: 'none' });
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {document.body.removeChild(canvas);};

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const onResize = () => {w = canvas.width = window.innerWidth;h = canvas.height = window.innerHeight;};
    window.addEventListener('resize', onResize);

    type S = {x: number;y: number;vx: number;vy: number;life: number;color: string;};
    let sparks: S[] = [];
    let mx = w / 2,my = h / 2;

    const colors = ['#FFE66D', '#E0E0E0', '#FFFFFF'];
    const onMove = (e: MouseEvent) => {
      mx = e.clientX;my = e.clientY;
      for (let i = 0; i < 4; i++) {
        sparks.push({
          x: mx, y: my,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          life: 24 + Math.random() * 12,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };
    window.addEventListener('mousemove', onMove);

    let raf = 0 as number;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      ctx.clearRect(0, 0, w, h);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;s.y += s.vy;s.life -= 1;
        if (s.life <= 0) {sparks.splice(i, 1);continue;}
        const a = Math.max(0, s.life / 30);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 8;
        ctx.globalAlpha = a;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', onResize);
      document.body.removeChild(canvas);
    };
  }, []);
  return null;
}

function SectionWithParallax({ children }: {children: React.ReactNode;}) {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, 20]);

  return (
    <motion.section style={{ y }} className="relative">
      {children}
    </motion.section>);

}

function About() {
  const [typedText, setTypedText] = useState('');
  const fullText = `🎬 2027 Mega AMV New Year MEP: Call for Leaders & Co-Leaders! 🎬

We're kicking off the 2027 New Year with a MEP (Multi Editor Project) and we want you to be part of it!

This ambitious project will unite 30 driven editors, working together in squads to create something unforgettable. Each squad will consist of:

1 Leader
1 Co-Leader
8 Members

That's 3 squads in total — all collaborating, creating, and pushing boundaries!

🔥 We're currently looking for LEADERS & CO-LEADERS!

Each leader and co-leader will be:

~Personally selected and entrusted with guiding their squad
~Responsible for communication, quality control, and team motivation
~Collaborating closely with their co-leader/leader for smooth execution

If you're passionate about editing, experienced in leadership, and ready to kick off 2027 with creativity and teamwork...

👉 Fill out the Application Form below.`;

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < fullText.length) {
        setTypedText(fullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 30);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="about" className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "Cinzel, serif", color: '#333333' }}>About MEP</h2>
          <p className="mt-3 text-muted-foreground max-w-3xl !whitespace-pre-line" style={{ color: '#333333' }}>{typedText}</p>
        </motion.div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[{
            title: 'Vision', text: "To celebrate New Year 2027 with leaders and squads who combine artistry, teamwork, and energy shaping the ultimate AMV MEP."
          }, {
            title: 'Structure', text: "3 Leaders + 3 Co-Leaders working together to guide 6 squads with clear deadlines and progress monitoring."
          }, {
            title: "Leader & Co-Leader ROLE", text: "Observe, Direct, Support, Uplift and collaborate to deliver excellence."
          }].map((item) =>
          <Card key={item.title} className="bg-[rgba(255,255,255,0.5)] border-[rgba(255,255,255,0.3)] backdrop-blur-md">
              <CardHeader>
                <CardTitle className="!whitespace-pre-line" style={{ fontFamily: "Cinzel, serif", color: '#555555' }}>{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground !whitespace-pre-line !w-full !h-full !whitespace-pre-line" style={{ color: '#333333' }}>{item.text}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>);

}

function LeadersGrid({ leaders, filled, total, loading }: {leaders: Leader[];filled: number;total: number;loading: boolean;}) {
  const leaderSlots = leaders.filter((l) => l.position <= 3);
  const coLeaderSlots = leaders.filter((l) => l.position > 3);

  return (
    <section id="leaders" className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "Cinzel, serif", color: '#333333' }}>Leader & Co-Leader Invitations</h2>
            <p className="mt-2 text-sm text-muted-foreground" style={{ color: '#555555' }}>3 Leaders (Positions 1-3) • 3 Co-Leaders (Positions 4-6)</p>
          </div>
          <div className="min-w-[220px]">
            <Progress value={filled / total * 100} className="h-3" />
            <div className="mt-1 text-xs text-muted-foreground" style={{ color: '#333333' }}>{filled} of {total} slots filled</div>
          </div>
        </div>

        {loading ?
        <div className="mt-8 space-y-8">
            {/* Leaders Loading State */}
            <div>
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-[#333333]" style={{ fontFamily: "Cinzel, serif" }}>Leaders</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) =>
              <Card key={i} className="overflow-hidden bg-[rgba(255,255,255,0.5)] border-[rgba(255,255,255,0.3)] backdrop-blur-md animate-pulse">
                    <div className="h-48 bg-gray-200 flex items-center justify-center">
                      <div className="h-32 w-32 rounded-full bg-gray-300" />
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between">
                        <div className="h-6 w-32 bg-gray-200 rounded" />
                        <div className="h-6 w-16 bg-gray-200 rounded" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="h-4 w-full bg-gray-200 rounded" />
                    </CardContent>
                  </Card>
              )}
              </div>
            </div>
            {/* Co-Leaders Loading State */}
            <div>
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-[#333333]" style={{ fontFamily: "Cinzel, serif" }}>Co-Leaders</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) =>
              <Card key={i} className="overflow-hidden bg-[rgba(255,255,255,0.5)] border-[rgba(255,255,255,0.3)] backdrop-blur-md animate-pulse">
                    <div className="h-48 bg-gray-200 flex items-center justify-center">
                      <div className="h-32 w-32 rounded-full bg-gray-300" />
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between">
                        <div className="h-6 w-32 bg-gray-200 rounded" />
                        <div className="h-6 w-16 bg-gray-200 rounded" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="h-4 w-full bg-gray-200 rounded" />
                    </CardContent>
                  </Card>
              )}
              </div>
            </div>
          </div> :

        <div className="mt-8 space-y-12">
            {/* Leaders Section */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                <h3 className="text-xl font-semibold text-[#333333]" style={{ fontFamily: "Cinzel, serif" }}>Leaders</h3>
                <Badge className="bg-[color:var(--gold)] text-black">Positions 1-3</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {leaderSlots.map((l) =>
              <Card key={l.id} className="overflow-hidden bg-[rgba(255,255,255,0.5)] border-2 border-[color:var(--gold)]/30 backdrop-blur-md hover:border-[color:var(--gold)]/60 transition-colors">
                    {/* Liquid glass background with circular avatar */}
                    <div className="h-48 relative flex items-center justify-center overflow-hidden">
                      {/* Liquid glass effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
                        <div className="absolute inset-0" style={{
                          background: 'radial-gradient(circle at 30% 70%, rgba(167,216,255,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(215,196,243,0.3) 0%, transparent 50%)',
                        }} />
                        <div className="absolute inset-0 backdrop-blur-3xl bg-white/20" />
                      </div>
                      
                      {/* Badge overlay */}
                      <div className="absolute top-2 left-2 z-10">
                        <Badge className="bg-[color:var(--gold)] text-black">Leader</Badge>
                      </div>
                      
                      {/* Circular avatar */}
                      <div className="relative z-10 h-32 w-32 rounded-full overflow-hidden border-4 border-white/60 shadow-2xl backdrop-blur-sm">
                        <img 
                          src={l.avatar} 
                          alt={l.name ?? `Leader ${l.position}`}
                          className="h-full w-full object-cover"
                        />
                        {/* Inner glow */}
                        <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/20" />
                      </div>
                    </div>
                    
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between">
                        <span style={{ fontFamily: "Cinzel, serif", color: '#333333' }}>{l.name ?? `Leader Slot #${l.position}`}</span>
                        <Badge className={l.status === 'filled' ? "bg-[color:var(--gold)] text-black" : "bg-transparent border border-[rgba(0,0,0,0.1)] text-[#555555]"}>
                          {l.status === 'filled' ? "Filled" : "Open"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground" style={{ color: '#333333' }}>
                        {l.status === 'filled' ? 'Leading the way forward' : 'Awaiting an inspiring leader'}
                      </p>
                    </CardContent>
                  </Card>
              )}
              </div>
            </div>

            {/* Co-Leaders Section */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                <h3 className="text-xl font-semibold text-[#333333]" style={{ fontFamily: "Cinzel, serif" }}>Co-Leaders</h3>
                <Badge className="bg-[color:var(--silver)] text-[#333333]">Positions 4-6</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {coLeaderSlots.map((l) =>
              <Card key={l.id} className="overflow-hidden bg-[rgba(255,255,255,0.5)] border-2 border-[color:var(--silver)]/30 backdrop-blur-md hover:border-[color:var(--silver)]/60 transition-colors">
                    {/* Liquid glass background with circular avatar */}
                    <div className="h-48 relative flex items-center justify-center overflow-hidden">
                      {/* Liquid glass effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
                        <div className="absolute inset-0" style={{
                          background: 'radial-gradient(circle at 30% 70%, rgba(215,196,243,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(185,251,192,0.3) 0%, transparent 50%)',
                        }} />
                        <div className="absolute inset-0 backdrop-blur-3xl bg-white/20" />
                      </div>
                      
                      {/* Badge overlay */}
                      <div className="absolute top-2 left-2 z-10">
                        <Badge className="bg-[color:var(--silver)] text-[#333333]">Co-Leader</Badge>
                      </div>
                      
                      {/* Circular avatar */}
                      <div className="relative z-10 h-32 w-32 rounded-full overflow-hidden border-4 border-white/60 shadow-2xl backdrop-blur-sm">
                        <img 
                          src={l.avatar} 
                          alt={l.name ?? `Co-Leader ${l.position}`}
                          className="h-full w-full object-cover"
                        />
                        {/* Inner glow */}
                        <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/20" />
                      </div>
                    </div>
                    
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between">
                        <span style={{ fontFamily: "Cinzel, serif", color: '#333333' }}>{l.name ?? `Co-Leader Slot #${l.position}`}</span>
                        <Badge className={l.status === 'filled' ? "bg-[color:var(--gold)] text-black" : "bg-transparent border border-[rgba(0,0,0,0.1)] text-[#555555]"}>
                          {l.status === 'filled' ? "Filled" : "Open"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground" style={{ color: '#333333' }}>
                        {l.status === 'filled' ? 'Supporting with excellence' : 'Awaiting a dedicated co-leader'}
                      </p>
                    </CardContent>
                  </Card>
              )}
              </div>
            </div>
          </div>
        }
      </div>
    </section>);

}

function ApplicationForm(props: {
  name: string;email: string;whatsapp: string;bio: string;submitting: boolean;
  onName: (v: string) => void;onEmail: (v: string) => void;onWhatsapp: (v: string) => void;onBio: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;progress: number;
  profilePreview: string | null;imageError: string | null;onImageChange: (file: File | null) => void;
}) {
  const { name, email, whatsapp, bio, submitting, onName, onEmail, onWhatsapp, onBio, onSubmit, progress, profilePreview, imageError, onImageChange } = props;
  return (
    <section id="apply" className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "Cinzel, serif", color: '#333333' }}>Apply as Leader or Co-Leader</h2>
          <p className="mt-2 text-muted-foreground" style={{ color: '#333333' }}>Tell us about your strengths and motivation. We review applications on a rolling basis and will assign you to either a Leader or Co-Leader position.</p>
          <div className="mt-6">
            <div className="text-sm mb-2">Slots progress</div>
            <Progress value={progress} className="h-3" />
            <div className="text-xs text-muted-foreground mt-1" style={{ color: '#333333' }}>{Math.round(progress)}% filled (3 Leaders + 3 Co-Leaders)</div>
          </div>
        </div>
        <Card className="bg-[rgba(255,255,255,0.5)] border-[rgba(255,255,255,0.3)] backdrop-blur-md">
          <CardContent className="pt-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="text-sm">Full Name</label>
                <Input value={name} onChange={(e) => onName(e.target.value)} placeholder="Your full name" required className="mt-1 bg-white/60" />
              </div>
              <div>
                <label className="text-sm">Email</label>
                <Input type="email" value={email} onChange={(e) => onEmail(e.target.value)} placeholder="you@example.com" required className="mt-1 bg-white/60" />
              </div>
              <div>
                <label className="text-sm">WhatsApp Number</label>
                <Input type="tel" value={whatsapp} onChange={(e) => onWhatsapp(e.target.value)} placeholder="e.g., +1 555 123 4567" required className="mt-1 bg-white/60" />
              </div>
              {/* New: Profile Picture Upload */}
              <div>
                <label className="text-sm block mb-1">Upload your Profile Picture (required)</label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full overflow-hidden border border-[rgba(0,0,0,0.08)] shadow-sm bg-white/70 flex items-center justify-center">
                    {profilePreview ?
                    <img src={profilePreview} alt="Preview" className="h-full w-full object-cover" /> :

                    <div className="h-full w-full bg-gradient-to-br from-slate-100 to-white" />
                    }
                  </div>
                  <label htmlFor="profileImage" className="flex-1 cursor-pointer rounded-2xl border border-white/60 bg-white/60 backdrop-blur-md px-4 py-3 shadow-sm hover:shadow-md transition ring-1 ring-transparent hover:ring-[rgba(167,216,255,0.5)]">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#333333]">{profilePreview ? 'Change image' : 'Choose JPG or PNG (max 2MB)'}</span>
                      <Button type="button" variant="outline" className="glass-button text-[#333333]">Browse…</Button>
                    </div>
                    <input
                      id="profileImage"
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => onImageChange(e.target.files?.[0] ?? null)} />

                  </label>
                </div>
                {imageError &&
                <p className="mt-2 text-xs text-red-600">{imageError}</p>
                }
              </div>
              <div>
                <label className="text-sm">Short Bio</label>
                <Textarea value={bio} onChange={(e) => onBio(e.target.value)} placeholder="Share highlights, goals, and what you hope to build in 2027" rows={5} className="mt-1 bg-white/60" />
              </div>
              <Button type="submit" disabled={submitting} className="w-full text-black hover:brightness-105" style={{ backgroundImage: 'linear-gradient(135deg,#D7C4F3,#A7D8FF)' }}>
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>);

}

function FAQ() {
  return (
    <section id="faq" className="py-16 md:py-24">
      <div className="mx-auto max-w-4xl px-4">
        <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "Cinzel, serif", color: '#333333' }}>FAQ</h2>
        <Accordion type="single" collapsible className="mt-6">
          <AccordionItem value="item-1">
            <AccordionTrigger>What is this MEP about?</AccordionTrigger>
            <AccordionContent>
              This MEP is a collaborative AMV project where multiple editors edit different parts of the same audio/theme for New Year Celebration.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-2">
            <AccordionTrigger>Do I need to follow a "New Year vibe" in my edit?</AccordionTrigger>
            <AccordionContent>
              Yes, bright colors, fireworks, celebration, transitions, or anything that gives a New Year energy feel.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-3">
            <AccordionTrigger>Is there a specific anime style for this New Year MEP?</AccordionTrigger>
            <AccordionContent>
              No specific anime is required, but clips should match the uplifting or fresh-start theme.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-4">
            <AccordionTrigger>Can I use darker or sad scenes?</AccordionTrigger>
            <AccordionContent>
              Light emotional scenes are allowed, but the overall tone must shift toward hope or new beginnings.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-5">
            <AccordionTrigger>What are the editing requirements for this New Year MEP?</AccordionTrigger>
            <AccordionContent>
              1080p, 23.976/30FPS, clean sync, and smooth transitions that match the celebration theme.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-6">
            <AccordionTrigger>When is the deadline?</AccordionTrigger>
            <AccordionContent>
              The final deadline for all members to submit their parts is on or before 15 December. 
              Group leaders are responsible for collecting and merging all parts from their team, and they must complete the merging process by 20 December.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-7">
            <AccordionTrigger>Can I upload my part after the full MEP is released?</AccordionTrigger>
            <AccordionContent>
              Yes, Once the complete New Year MEP is uploaded, you are allowed to post your individual part.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-8">
            <AccordionTrigger>What happens if someone drops out near the deadline?</AccordionTrigger>
            <AccordionContent>
              In case of dropouts, backup editors may be assigned. This is the responsibility of the group leader and co-leader to ensure the MEP is completed and released on New Year.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-9">
            <AccordionTrigger>When will the final MEP be uploaded?</AccordionTrigger>
            <AccordionContent>
              The MEP will be uploaded on 1 January according to Hawaii Standard Time (HST). 
              Since Hawaii reaches the New Year last, this ensures that every country in the world will already be in 1 January when the MEP goes live.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>);

}

function Contact() {
  return (
    <section id="contact" className="py-16 md:py-24">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "Cinzel, serif", color: '#333333' }}>Contact</h2>
        <p className="mt-2 text-muted-foreground" style={{ color: '#333333' }}>Any questions or querry? We'd love to hear from you.</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <a className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[rgba(255,255,255,0.3)] hover:bg-white/60" href="mailto:toxicsmile22936@gmail.com"><Mail size={18} /> toxicsmile22936@gmail.com</a>
          <a className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[rgba(255,255,255,0.3)] hover:bg-white/60" href="https://discordapp.com/users/1263021894773506162" target="_blank" rel="noreferrer"><MessageSquare size={18} /> Discord</a>
          <a className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[rgba(255,255,255,0.3)] hover:bg-white/60" href="https://t.me/toxicsmile22936" target="_blank" rel="noreferrer"><Send size={18} /> Telegram</a>
        </div>
      </div>
    </section>);

}

function Footer() {
  return (
    <footer className="border-t bg-[rgba(255,255,255,0.6)] backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">© 2026–2027 MEP — New Year 2027 Invitation</p>
        <div className="text-xs text-muted-foreground flex items-center gap-4">
          <a href="/privacy" className="hover:underline">Privacy Policy</a>
          <span>•</span>
          <span>Made By toxicsmile22936 </span>
        </div>
      </div>
    </footer>);

}

function FloatingParticles() {
  const particles = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    delay: Math.random() * 10,
    duration: 15 + Math.random() * 10,
    left: Math.random() * 100,
    size: 4 + Math.random() * 8,
    color: ['#FFD700', '#6EC6FF', '#1A237E', '#D7C4F3', '#B9FBC0'][Math.floor(Math.random() * 5)]
  }));

  return (
    <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
      {particles.map((p) =>
      <motion.div
        key={p.id}
        className="absolute rounded-full opacity-60 blur-sm"
        style={{
          left: `${p.left}%`,
          top: '-10%',
          width: p.size,
          height: p.size,
          backgroundColor: p.color,
          boxShadow: `0 0 10px ${p.color}40`
        }}
        initial={{ y: '-100vh' }}
        animate={{
          y: '120vh',
          rotate: 360
        }}
        transition={{
          duration: p.duration,
          delay: p.delay,
          repeat: Infinity,
          ease: 'linear'
        }} />

      )}
    </div>);

}