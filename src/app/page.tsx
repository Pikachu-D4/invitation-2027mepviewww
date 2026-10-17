"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import React from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Send, Menu, X, Bell, ExternalLink, Sparkles, Youtube, Check, Phone, Instagram, Crown, ShieldCheck, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/lib/content";

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
  const [instagram, setInstagram] = useState("");
  const [requestedRole, setRequestedRole] = useState<"Leader" | "Co-Leader" | "">("");
  const [requestedPosition, setRequestedPosition] = useState<number>(0);
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    reference: string;
    requestedRole: string;
    requestedPosition: number;
    status: string;
  } | null>(null);
  // Profile image state
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);

  // Fetch leaders & site content from database / store
  useEffect(() => {
    fetchLeaders();
    fetchContent();
  }, []);

  async function fetchContent() {
    try {
      const response = await fetch('/api/content');
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data === 'object') {
          setContent(data);
        }
      }
    } catch (error) {
      console.warn('Could not refresh site content:', error);
    }
  }

  async function fetchLeaders() {
    try {
      const response = await fetch('/api/leaders');
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

  // Celebration state (initial 6s celebration)
  const [celebrate, setCelebrate] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setCelebrate(false), 6000);
    return () => clearTimeout(timer);
  }, []);

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
    if (!name.trim() || !email.trim() || !whatsapp.trim()) {
      toast.error('Please fill in all required fields (Name, Email, WhatsApp).');
      return;
    }

    if (!requestedRole) {
      toast.error('Please choose your preferred role: Squad Leader or Squad Co-Leader');
      return;
    }

    const cleanedInsta = instagram.trim().replace(/^@+/, "");
    if (cleanedInsta) {
      if (cleanedInsta.length > 30) {
        toast.error('Instagram username must not exceed 30 characters.');
        return;
      }
      if (!/^[A-Za-z0-9._]+$/.test(cleanedInsta)) {
        toast.error('Instagram username contains invalid characters. Use letters, numbers, periods, and underscores only.');
        return;
      }
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
      if (cleanedInsta) formData.append('instagramUsername', cleanedInsta);
      formData.append('requestedRole', requestedRole);
      formData.append('requestedPosition', String(requestedPosition));
      if (bio) formData.append('bio', bio);
      formData.append('profileImage', profileImageFile);

      const response = await fetch('/api/applications', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'MISSING_IMAGE') {
          setImageError('Profile picture is required before submission.');
        } else if (data.code === 'INVALID_IMAGE_TYPE') {
          setImageError('Please upload a JPG, PNG, or WEBP image.');
        } else if (data.code === 'IMAGE_TOO_LARGE') {
          setImageError('Image must be smaller than 5 MB.');
        } else {
          toast.error(data.error || 'Failed to submit application');
        }
        return;
      }

      // Success! Decoupled workflow: application is saved as pending review
      setSubmissionSuccess({
        reference: data.reference || `MEP2027-${data.applicationId}`,
        requestedRole: data.requestedRole || requestedRole,
        requestedPosition: data.requestedPosition ?? requestedPosition,
        status: data.status || 'pending',
      });

      toast.success('Application submitted successfully!');
      setName("");
      setEmail("");
      setWhatsapp("");
      setInstagram("");
      setRequestedRole("");
      setRequestedPosition(0);
      setBio("");
      setProfileImageFile(null);
      if (profilePreview) URL.revokeObjectURL(profilePreview);
      setProfilePreview(null);
      setImageError(null);

      await fetchLeaders();
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Functional button handlers: preselect role and navigate smoothly
  const handleApplyAsLeader = useCallback((e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setRequestedRole("Leader");
    setRequestedPosition(0);
    const el = document.getElementById("apply");
    if (el) {
      const navOffset = 80;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
      window.history.pushState(null, "", "#apply");
    } else {
      window.location.hash = "apply";
    }
  }, []);

  const handleApplyAsCoLeader = useCallback((e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setRequestedRole("Co-Leader");
    setRequestedPosition(0);
    const el = document.getElementById("apply");
    if (el) {
      const navOffset = 80;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
      window.history.pushState(null, "", "#apply");
    } else {
      window.location.hash = "apply";
    }
  }, []);

  const handleLearnMore = useCallback((e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const el = document.getElementById("about");
    if (el) {
      const navOffset = 80;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
      window.history.pushState(null, "", "#about");
    } else {
      window.location.hash = "about";
    }
  }, []);

  const handleAboutCta = useCallback((e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const el = document.getElementById("apply");
    if (el) {
      const navOffset = 80;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
      window.history.pushState(null, "", "#apply");
    } else {
      window.location.hash = "apply";
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 text-[#333333] relative">
      {/* Animated backgrounds */}
      <Fireworks celebrate={celebrate} />
      <Confetti celebrate={celebrate} />
      <GoldenSparkles celebrate={celebrate} />
      <SparkleCursor />
      {/* Soft pastel glow background with slight parallax */}
      <MemoizedParallaxBackground />

      {content.announcement && content.announcement.enabled && (
        <AnnouncementBanner announcement={content.announcement} />
      )}

      <MemoizedNavbar filled={filled} total={total} />

      <SectionWithParallax>
        <Hero
          celebrate={celebrate}
          hero={content.hero}
          event={content.event}
          onApplyAsLeader={handleApplyAsLeader}
          onApplyAsCoLeader={handleApplyAsCoLeader}
          onLearnMore={handleLearnMore}
        />
      </SectionWithParallax>

      <main className="relative z-10">
        <SectionWithParallax>
          <MemoizedAbout about={content.about} onAboutCta={handleAboutCta} />
        </SectionWithParallax>
        <SectionWithParallax>
          <MemoizedLeadersGrid leaders={leaders} filled={filled} total={total} loading={loading} />
        </SectionWithParallax>
        <SectionWithParallax>
          <ApplicationForm
            name={name}
            email={email}
            whatsapp={whatsapp}
            instagram={instagram}
            requestedRole={requestedRole}
            requestedPosition={requestedPosition}
            bio={bio}
            submitting={submitting}
            leaders={leaders}
            submissionSuccess={submissionSuccess}
            onResetSuccess={() => setSubmissionSuccess(null)}
            onName={setName}
            onEmail={setEmail}
            onWhatsapp={setWhatsapp}
            onInstagram={setInstagram}
            onRequestedRole={(role) => {
              setRequestedRole(role);
              setRequestedPosition(0); // Reset position to flexible when role changes
            }}
            onRequestedPosition={setRequestedPosition}
            onBio={setBio}
            onSubmit={handleSubmit}
            progress={(filled / total) * 100}
            profilePreview={profilePreview}
            imageError={imageError}
            onImageChange={handleImageChange}
          />
        </SectionWithParallax>
        <SectionWithParallax>
          <MemoizedFAQ faqs={content.faqs} />
        </SectionWithParallax>
        <SectionWithParallax>
          <MemoizedContact contact={content.contact} />
        </SectionWithParallax>
      </main>

      <MemoizedFooter />

      <MemoizedFloatingParticles />

      <style>{`html { scroll-behavior: smooth; }`}</style>
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
          <Button asChild className="bg-[color:var(--gold)] text-black hover:bg-[color:var(--gold)]/90">
            <a href="#apply" id="nav-apply-btn">Apply</a>
          </Button>
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
                <Button asChild className="w-full bg-[color:var(--gold)] text-black hover:bg-[color:var(--gold)]/90">
                  <a href="#apply" onClick={handleLinkClick} id="mobile-nav-apply-btn">
                    Apply Now
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AnnouncementBanner({ announcement }: { announcement: SiteContent['announcement'] }) {
  if (!announcement || !announcement.enabled || !announcement.text) return null;

  const styleClass =
    announcement.style === "gold"
      ? "bg-amber-100/90 text-amber-900 border-amber-300 shadow-xs"
      : announcement.style === "blue"
      ? "bg-blue-600 text-white border-blue-500 shadow-sm"
      : announcement.style === "festive"
      ? "bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white border-purple-400 shadow-md"
      : announcement.style === "minimal"
      ? "bg-white/80 text-gray-800 border-gray-200 backdrop-blur-md"
      : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-indigo-400 shadow-sm";

  return (
    <div className={`w-full py-2.5 px-4 text-center text-xs sm:text-sm font-medium border-b backdrop-blur-md transition-all relative z-40 ${styleClass}`}>
      <div className="mx-auto max-w-6xl flex items-center justify-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5">
          <Bell size={14} className="animate-bounce flex-shrink-0" />
          <span>{announcement.text}</span>
        </span>
        {announcement.linkLabel && announcement.linkUrl && (
          <a
            href={announcement.linkUrl}
            className="inline-flex items-center gap-1 underline underline-offset-4 font-bold hover:opacity-80 transition ml-1"
          >
            <span>{announcement.linkLabel}</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}

function calculateTimeLeft(rawTarget?: string) {
  const targetDate = rawTarget ? new Date(rawTarget) : TARGET_DATE;
  const validTarget = isNaN(targetDate.getTime()) ? TARGET_DATE : targetDate;
  const now = new Date();
  const diff = validTarget.getTime() - now.getTime();
  const clamped = Math.max(0, diff);
  const s = Math.floor(clamped / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return { days, hours, minutes, seconds };
}

function CountdownTimer({
  targetDateString,
  heading,
}: {
  targetDateString?: string;
  heading?: string;
}) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDateString));

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDateString));
    }, 1000);
    return () => clearInterval(id);
  }, [targetDateString]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="max-w-xl mx-auto"
    >
      <motion.div
        className="text-center mb-4 sm:mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <span
          className="text-lg sm:text-xl md:text-2xl text-[#333333] glass-text-charcoal font-semibold"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {heading}
        </span>
      </motion.div>
      <motion.div
        className="glass-panel p-2.5 sm:p-4 rounded-2xl bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.2)] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] overflow-hidden"
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.3 }}
      >
        <div className="liquid-bg pointer-events-none"></div>
        <div className="grid grid-cols-4 gap-1.5 sm:gap-3 md:gap-6 relative z-10">
          {(['days', 'hours', 'minutes', 'seconds'] as const).map((unit) => {
            const value = timeLeft[unit];
            const label = unit.charAt(0).toUpperCase() + unit.slice(1);
            const shortLabel = unit === 'days' ? 'Days' : unit === 'hours' ? 'Hours' : unit === 'minutes' ? 'Mins' : 'Secs';
            return (
              <motion.div key={unit} className="glass-panel group rounded-xl overflow-hidden" whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                <Card className="relative bg-[rgba(255,255,255,0.6)] border-[rgba(255,255,255,0.3)] backdrop-blur-xl shadow-[0_4px_16px_0_rgba(0,0,0,0.1)] overflow-hidden rounded-xl border">
                  <CardContent className="p-2 sm:p-4 text-center relative z-10 flex flex-col items-center justify-center">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={value}
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="text-xl sm:text-2xl md:text-3xl font-bold text-[#333333] drop-shadow-xs leading-none"
                        style={{ fontFamily: "Cinzel, serif" }}
                      >
                        {value.toString().padStart(2, '0')}
                      </motion.div>
                    </AnimatePresence>
                    <div className="text-[10px] sm:text-xs uppercase tracking-normal sm:tracking-wider text-[#555555] mt-1.5 font-semibold truncate w-full text-center">
                      <span className="hidden sm:inline">{label}</span>
                      <span className="sm:hidden">{shortLabel}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

const Hero = React.memo(function Hero({
  celebrate,
  hero,
  event,
  onApplyAsLeader,
  onApplyAsCoLeader,
  onLearnMore,
}: {
  celebrate: boolean;
  hero: SiteContent['hero'];
  event: SiteContent['event'];
  onApplyAsLeader: (e: React.MouseEvent) => void;
  onApplyAsCoLeader: (e: React.MouseEvent) => void;
  onLearnMore: (e: React.MouseEvent) => void;
}) {
  if (!hero || !hero.visible) return null;

  return (
    <section id="hero" className="relative overflow-hidden">
      <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-24 md:pt-28 md:pb-32 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        {/* Glossy invitation box with liquid-glass UI */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mx-auto max-w-4xl p-5 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl glass-panel bg-[rgba(255,255,255,0.15)] border-[rgba(255,255,255,0.3)] backdrop-blur-3xl shadow-2xl overflow-hidden relative z-10"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}>

          <div className="liquid-bg pointer-events-none"></div>
          {celebrate && (
            <motion.div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gold/20 via-transparent to-blue-100/20 rounded-3xl blur-3xl opacity-70"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 0.8 }}
              transition={{ duration: 3, repeat: 1 }}
            />
          )}

          <div className="relative z-10 text-center">
            {hero.welcomeBadge && (
              <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 border border-white/60 text-xs font-semibold text-gray-800 shadow-xs backdrop-blur-md">
                <Sparkles size={13} className="text-amber-500" />
                <span>{hero.welcomeBadge}</span>
              </div>
            )}

            <motion.h1 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}
            className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
              <span className="block glass-text-charcoal shimmer" style={{ fontFamily: "Cinzel, serif" }}>
                {hero.titleLine1}
              </span>
              <span className="block glass-text-pastel-blue shimmer" style={{ fontFamily: "Cinzel, serif" }}>
                {hero.titleLine2}
              </span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }} viewport={{ once: true }}
            className="mb-6 sm:mb-8 text-sm sm:text-base md:text-lg text-[#333333] max-w-2xl mx-auto leading-relaxed px-1 sm:px-0">
              {hero.subtitle}
            </motion.p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-10 relative z-20 w-full max-w-xs sm:max-w-none mx-auto">
              {hero.primaryCtaLabel && (
                <Button
                  asChild
                  size="lg"
                  className="w-full sm:w-auto min-w-[210px] sm:min-w-0 liquid-button text-black shadow-[0_8px_32px_0_rgba(167,216,255,0.1)] hover:shadow-[0_8px_32px_0_rgba(167,216,255,0.3)] backdrop-blur-md border-[rgba(255,255,255,0.2)] cursor-pointer justify-center text-center font-semibold"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(167,216,255,0.6))' }}
                >
                  <a href={hero.primaryCtaLink || "#apply"} onClick={onApplyAsLeader} id="hero-apply-leader-btn" className="w-full text-center">
                    {hero.primaryCtaLabel}
                  </a>
                </Button>
              )}
              {hero.secondaryCtaLabel && (
                <Button
                  asChild
                  size="lg"
                  className="w-full sm:w-auto min-w-[210px] sm:min-w-0 liquid-button text-[#333333] shadow-[0_8px_32px_0_rgba(215,196,243,0.1)] hover:shadow-[0_8px_32px_0_rgba(215,196,243,0.3)] backdrop-blur-md border-[rgba(255,255,255,0.2)] cursor-pointer justify-center text-center font-semibold"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(215,196,243,0.6))' }}
                >
                  <a href={hero.secondaryCtaLink || "#apply"} onClick={onApplyAsCoLeader} id="hero-apply-coleader-btn" className="w-full text-center">
                    {hero.secondaryCtaLabel}
                  </a>
                </Button>
              )}
              {hero.learnMoreLabel && (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto min-w-[210px] sm:min-w-0 glass-button border-[rgba(51,51,51,0.2)] text-[#333333] hover:bg-[rgba(255,255,255,0.5)] hover:shadow-[0_4px_16px_0_rgba(51,51,51,0.1)] backdrop-blur-md cursor-pointer justify-center text-center font-semibold"
                >
                  <a href={hero.learnMoreLink || "#about"} onClick={onLearnMore} id="hero-learn-more-btn" className="w-full text-center">
                    {hero.learnMoreLabel}
                  </a>
                </Button>
              )}
            </div>

            {event && event.countdownVisible && (
              <CountdownTimer
                targetDateString={event.targetDate}
                heading={event.countdownHeading}
              />
            )}
          </div>
        </motion.div>

        {/* Background image with overlay for futuristic feel */}
        <div className="pointer-events-none absolute inset-0 -z-10" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop)", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.1 }} />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-[rgba(255,255,255,0.1)] via-transparent to-transparent"></div>
      </div>
    </section>);

});

// Golden sparkles rain on celebration
function GoldenSparkles({ celebrate }: {celebrate: boolean;}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!celebrate || typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

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
    let isRunning = true;

    const animate = () => {
      if (!isRunning || !canvasRef.current) return;
      raf = requestAnimationFrame(animate);
      const currentCtx = canvasRef.current.getContext('2d');
      if (!currentCtx) return;
      currentCtx.clearRect(0, 0, w, h);

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.y += s.vy;
        s.life--;
        if (s.life <= 0 || s.y > h) {
          sparks.splice(i, 1);
          continue;
        }

        const alpha = s.life / 150;
        currentCtx.beginPath();
        currentCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        currentCtx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
        currentCtx.shadowColor = '#FFD700';
        currentCtx.shadowBlur = 10;
        currentCtx.fill();
        currentCtx.shadowBlur = 0;
      }

      if (sparks.length === 0 && bursts >= 3) {
        cancelAnimationFrame(raf);
        if (canvasRef.current && document.body.contains(canvasRef.current)) {
          document.body.removeChild(canvasRef.current);
        }
        canvasRef.current = null;
        window.removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        isRunning = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
      } else if (isRunning && canvasRef.current) {
        raf = requestAnimationFrame(animate);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    raf = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      clearInterval(interval);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (canvasRef.current && document.body.contains(canvasRef.current)) {
        document.body.removeChild(canvasRef.current);
      }
      canvasRef.current = null;
    };
  }, [celebrate]);

  return null;
}

// Confetti burst on celebration and continuous subtle drift
function Confetti({ celebrate }: {celebrate: boolean;}) {
  const pieces = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    left: ((i * 17 + 3) % 100),
    delay: ((i * 0.45) % 3),
    size: 6 + ((i * 2.1) % 8),
    color: (["#FFE66D", "#E0E0E0", "#ffffff"] as const)[i % 3],
    duration: 5 + ((i * 1.4) % 6)
  })), []);

  // Burst confetti on load
  useEffect(() => {
    if (!celebrate || typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const burstPieces = Array.from({ length: 200 }).map((_, i) => i);
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const createdSparks: HTMLDivElement[] = [];

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
      createdSparks.push(spark);

      const anim = spark.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        {
          transform: `translate(${Math.cos(angle) * velocity * 50}px, ${Math.sin(angle) * velocity * 50}px) scale(0)`,
          opacity: 0
        }
      ], {
        duration: 2000 + Math.random() * 1000,
        easing: 'ease-out'
      });

      anim.onfinish = () => {
        spark.remove();
        const idx = createdSparks.indexOf(spark);
        if (idx !== -1) createdSparks.splice(idx, 1);
      };
    });

    return () => {
      createdSparks.forEach((s) => s.remove());
    };
  }, [celebrate]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
      <style>{`@keyframes fall { to { transform: translateY(110vh) rotate(1turn); opacity: .9; } }`}</style>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-[-10vh] rounded"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            filter: 'drop-shadow(0 0 6px rgba(224,224,224,.6))',
            animation: `fall ${p.duration}s linear ${p.delay}s infinite`,
            willChange: 'transform'
          }}
        />
      ))}
    </div>
  );
}

// Fireworks with initial bursts and visibility-aware continuous effect
function Fireworks({ celebrate }: {celebrate: boolean;}) {
  const celebrateRef = useRef(celebrate);
  useEffect(() => {
    celebrateRef.current = celebrate;
  }, [celebrate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

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
    let burstInterval: NodeJS.Timeout | null = null;
    if (celebrateRef.current) {
      let burstCount = 0;
      burstInterval = setInterval(() => {
        burst(Math.random() * w, h * 0.3 + Math.random() * h * 0.4, true);
        burstCount++;
        if (burstCount >= 5 && burstInterval) {
          clearInterval(burstInterval);
          burstInterval = null;
        }
      }, 500);
    }

    let frame = 0;
    let raf: number;
    let isRunning = true;

    const loop = () => {
      if (!isRunning) return;
      raf = requestAnimationFrame(loop);
      frame++;
      ctx.clearRect(0, 0, w, h);
      // Continuous background bursts
      if (frame % 60 === 0) {
        burst(Math.random() * w, h * 0.2 + Math.random() * h * 0.5, false);
      }
      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03; // gravity
        p.life -= 1;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        const alpha = Math.max(0, Math.min(1, p.life / 120));
        const size = 3 + (1 - alpha) * 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      // Cleanup check
      if (particles.length === 0 && !celebrateRef.current && frame > 300) {
        cancelAnimationFrame(raf);
        if (document.body.contains(canvas)) {
          document.body.removeChild(canvas);
        }
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        isRunning = false;
        return;
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
      } else if (isRunning) {
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    raf = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (burstInterval) clearInterval(burstInterval);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    };
  }, []);

  return null;
}

// Sparkle cursor using on-demand RAF emitter (stops rendering when mouse is static)
function SparkleCursor() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'fixed inset-0 z-50 pointer-events-none';
    Object.assign(canvas.style, { position: 'fixed', inset: '0', zIndex: '50', pointerEvents: 'none' });
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      if (document.body.contains(canvas)) document.body.removeChild(canvas);
      return;
    }

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    type S = {x: number;y: number;vx: number;vy: number;life: number;color: string;};
    let sparks: S[] = [];
    let mx = w / 2, my = h / 2;
    let raf = 0;
    let isTicking = false;

    const colors = ['#FFE66D', '#E0E0E0', '#FFFFFF'];

    const tick = () => {
      if (sparks.length === 0) {
        ctx.clearRect(0, 0, w, h);
        isTicking = false;
        return;
      }
      raf = requestAnimationFrame(tick);
      ctx.clearRect(0, 0, w, h);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 1;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
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

    const startTicking = () => {
      if (!isTicking && !document.hidden) {
        isTicking = true;
        raf = requestAnimationFrame(tick);
      }
    };

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      for (let i = 0; i < 4; i++) {
        sparks.push({
          x: mx,
          y: my,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          life: 24 + Math.random() * 12,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
      startTicking();
    };
    window.addEventListener('mousemove', onMove, { passive: true });

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        isTicking = false;
      } else if (sparks.length > 0) {
        startTicking();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
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

function About({ about, onAboutCta }: { about: SiteContent['about']; onAboutCta?: (e: React.MouseEvent) => void; }) {
  if (!about || !about.visible) return null;

  return (
    <section id="about" className="scroll-mt-20 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900" style={{ fontFamily: "Cinzel, serif" }}>
            {about.heading}
          </h2>
          {about.subtitle && (
            <p className="mt-2 text-base md:text-lg font-semibold text-blue-900/90">
              {about.subtitle}
            </p>
          )}
          <p className="mt-4 text-base md:text-lg text-gray-800 leading-relaxed font-medium">
            {about.introParagraph}
          </p>

          {about.additionalParagraphs && about.additionalParagraphs.length > 0 && (
            <div className="mt-4 space-y-2">
              {about.additionalParagraphs.map((para, i) => (
                <p key={i} className="text-sm md:text-base text-gray-700 leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          )}
        </motion.div>

        {/* Info Cards Grid (Vision, Structure, Role) */}
        {about.infoCards && about.infoCards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {about.infoCards.map((item) => (
              <Card key={item.id || item.title} className="bg-[rgba(255,255,255,0.6)] border-[rgba(255,255,255,0.4)] backdrop-blur-md shadow-sm">
                <CardHeader>
                  <CardTitle style={{ fontFamily: "Cinzel, serif", color: '#333333' }}>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 leading-relaxed">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Highlight Callout & CTA Button */}
        {about.calloutText && (
          <div className="p-6 sm:p-8 rounded-2xl glass-panel bg-white/70 border border-white/60 backdrop-blur-md shadow-sm text-center space-y-4">
            <p className="text-base sm:text-lg font-medium text-gray-900 max-w-2xl mx-auto leading-relaxed">
              {about.calloutText}
            </p>
            {about.ctaButtonText && (
              <div className="relative z-10 pt-2">
                <Button
                  asChild
                  size="lg"
                  className="liquid-button text-black font-semibold shadow-md"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(167,216,255,0.7))' }}
                >
                  <a
                    href={about.ctaButtonLink || "#apply"}
                    onClick={onAboutCta}
                    id="about-cta-btn"
                  >
                    {about.ctaButtonText} →
                  </a>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function LeadersGrid({ leaders, filled, total, loading }: {leaders: Leader[];filled: number;total: number;loading: boolean;}) {
  const leaderSlots = leaders.filter((l) => l.position <= 3);
  const coLeaderSlots = leaders.filter((l) => l.position > 3);

  return (
    <section id="leaders" className="scroll-mt-20 py-16 md:py-24">
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
                          loading="lazy"
                          decoding="async"
                          width={128}
                          height={128}
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
                          loading="lazy"
                          decoding="async"
                          width={128}
                          height={128}
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
  name: string;
  email: string;
  whatsapp: string;
  instagram: string;
  requestedRole: "Leader" | "Co-Leader" | "";
  requestedPosition: number;
  bio: string;
  submitting: boolean;
  leaders: Leader[];
  submissionSuccess: {
    reference: string;
    requestedRole: string;
    requestedPosition: number;
    status: string;
  } | null;
  onResetSuccess: () => void;
  onName: (v: string) => void;
  onEmail: (v: string) => void;
  onWhatsapp: (v: string) => void;
  onInstagram: (v: string) => void;
  onRequestedRole: (role: "Leader" | "Co-Leader") => void;
  onRequestedPosition: (pos: number) => void;
  onBio: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  progress: number;
  profilePreview: string | null;
  imageError: string | null;
  onImageChange: (file: File | null) => void;
}) {
  const {
    name,
    email,
    whatsapp,
    instagram,
    requestedRole,
    requestedPosition,
    bio,
    submitting,
    leaders,
    submissionSuccess,
    onResetSuccess,
    onName,
    onEmail,
    onWhatsapp,
    onInstagram,
    onRequestedRole,
    onRequestedPosition,
    onBio,
    onSubmit,
    progress,
    profilePreview,
    imageError,
    onImageChange,
  } = props;

  // Selected position details
  const selectedLeaderSlot = requestedPosition > 0 ? leaders.find((l) => l.position === requestedPosition) : null;
  const isSelectedSlotOccupied = selectedLeaderSlot ? selectedLeaderSlot.status === 'filled' : false;

  return (
    <section id="apply" className="scroll-mt-20 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Guidelines & Progress */}
        <div>
          <Badge className="mb-3 bg-white/70 text-gray-800 border-white/60 shadow-sm backdrop-blur-md">
            MEP 2027 Leadership Application
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "Cinzel, serif", color: '#333333' }}>
            Apply as Leader or Co-Leader
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed text-sm md:text-base" style={{ color: '#444444' }}>
            Join the executive squad steering the New Year 2027 milestone. Choose your preferred role and numbered seat. 
            All submissions are reviewed by administrators before official seat allocations are confirmed.
          </p>

          <div className="mt-6 p-4 rounded-2xl bg-white/40 border border-white/50 backdrop-blur-md">
            <div className="flex items-center justify-between text-sm mb-2 font-medium">
              <span>Overall Squad Capacity</span>
              <span>{Math.round(progress)}% Filled</span>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="text-xs text-muted-foreground mt-2" style={{ color: '#555555' }}>
              6 Dedicated Positions (3 Squad Leaders + 3 Squad Co-Leaders)
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/30 border border-white/40 text-xs text-gray-700">
              <ShieldCheck size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-gray-900 block">Separate Role Preference & Assignment:</span>
                Selecting a seat indicates your preference. Official public slots are occupied only when approved by administrators.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/30 border border-white/40 text-xs text-gray-700">
              <Clock size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-gray-900 block">Rolling Waiting List:</span>
                Even if all seats are filled, your application enters our priority waiting list for upcoming expansions or openings.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Form or Success Confirmation Card */}
        <Card className="bg-[rgba(255,255,255,0.6)] border-[rgba(255,255,255,0.4)] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
          <CardContent className="pt-6">
            {submissionSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 px-2 space-y-5"
              >
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-emerald-600 shadow-md">
                  <CheckCircle2 size={36} />
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Cinzel, serif" }}>
                    Application Submitted!
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Your leadership application has been securely recorded.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/80 border border-emerald-200 text-left space-y-2 text-sm shadow-sm">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <span className="text-gray-500 font-medium text-xs uppercase tracking-wider">Reference</span>
                    <Badge variant="outline" className="font-mono bg-emerald-50 text-emerald-800 border-emerald-300 font-bold">
                      {submissionSuccess.reference}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">Requested Role:</span>
                    <span className="font-semibold text-gray-900">
                      {submissionSuccess.requestedRole === "Leader" ? "Squad Leader" : "Squad Co-Leader"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">Position Preference:</span>
                    <span className="font-semibold text-gray-900">
                      {submissionSuccess.requestedPosition === 0
                        ? "Any available position (Flexible)"
                        : `Position #${submissionSuccess.requestedPosition}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-gray-500 font-medium">Status:</span>
                    <Badge className="bg-amber-100 text-amber-800 border border-amber-300 capitalize text-xs">
                      {submissionSuccess.status} Review
                    </Badge>
                  </div>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed max-w-md mx-auto">
                  Our administration team reviews each application carefully before confirming seat assignments. 
                  You will receive updates via WhatsApp and Email.
                </p>

                <Button
                  onClick={onResetSuccess}
                  variant="outline"
                  className="w-full bg-white/80 border-gray-300 hover:bg-white text-gray-800"
                >
                  Submit Another Application
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="text-sm font-medium text-gray-800">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => onName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    required
                    maxLength={100}
                    className="mt-1 bg-white/70 border-white/60 focus:bg-white transition"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="text-sm font-medium text-gray-800">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => onEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    maxLength={150}
                    className="mt-1 bg-white/70 border-white/60 focus:bg-white transition"
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="text-sm font-medium text-gray-800">
                    WhatsApp Number <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => onWhatsapp(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    required
                    maxLength={30}
                    className="mt-1 bg-white/70 border-white/60 focus:bg-white transition"
                  />
                </div>

                {/* Instagram Username (optional) */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                      <Instagram size={15} className="text-pink-600" />
                      Instagram Username (optional)
                    </label>
                    <span className="text-2xs text-gray-400">Handle without @</span>
                  </div>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm">
                      @
                    </span>
                    <Input
                      type="text"
                      value={instagram}
                      onChange={(e) => onInstagram(e.target.value.replace(/\s+/g, ''))}
                      placeholder="yourusername"
                      maxLength={30}
                      className="pl-8 bg-white/70 border-white/60 focus:bg-white transition font-mono text-sm"
                    />
                  </div>
                  <p className="mt-1 text-2xs text-gray-500">
                    Used for event mentions, squad shoutouts, and team tags. Enter with or without &apos;@&apos;.
                  </p>
                </div>

                {/* SECTION: Choose Your Preferred Role */}
                <div className="pt-2 border-t border-gray-200/50 space-y-3">
                  <div>
                    <label className="text-sm font-bold text-gray-900 block" style={{ fontFamily: "Cinzel, serif" }}>
                      Choose Your Preferred Role <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500">
                      Select whether you wish to apply as a Squad Leader or Squad Co-Leader.
                    </p>
                  </div>

                  {/* Two Selectable Role Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Card 1: Squad Leader */}
                    <div
                      role="button"
                      tabIndex={0}
                      aria-pressed={requestedRole === "Leader"}
                      aria-label="Select Squad Leader role"
                      onClick={() => onRequestedRole("Leader")}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onRequestedRole("Leader")}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                        requestedRole === "Leader"
                          ? "border-amber-500 bg-amber-50/80 shadow-md ring-2 ring-amber-200"
                          : "border-white/70 bg-white/50 hover:bg-white/80 hover:border-amber-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                          <Crown size={18} />
                        </div>
                        <Badge variant="outline" className={`text-2xs font-bold uppercase ${requestedRole === "Leader" ? "bg-amber-200 text-amber-900 border-amber-400" : "bg-white/60 text-gray-600"}`}>
                          Positions 1–3
                        </Badge>
                      </div>
                      <h4 className="font-bold text-gray-900 text-base">Squad Leader</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        Primary squad guidance, strategic execution, and squad vision.
                      </p>
                    </div>

                    {/* Card 2: Squad Co-Leader */}
                    <div
                      role="button"
                      tabIndex={0}
                      aria-pressed={requestedRole === "Co-Leader"}
                      aria-label="Select Squad Co-Leader role"
                      onClick={() => onRequestedRole("Co-Leader")}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onRequestedRole("Co-Leader")}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                        requestedRole === "Co-Leader"
                          ? "border-indigo-500 bg-indigo-50/80 shadow-md ring-2 ring-indigo-200"
                          : "border-white/70 bg-white/50 hover:bg-white/80 hover:border-indigo-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                          <Sparkles size={18} />
                        </div>
                        <Badge variant="outline" className={`text-2xs font-bold uppercase ${requestedRole === "Co-Leader" ? "bg-indigo-200 text-indigo-900 border-indigo-400" : "bg-white/60 text-gray-600"}`}>
                          Positions 4–6
                        </Badge>
                      </div>
                      <h4 className="font-bold text-gray-900 text-base">Squad Co-Leader</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        Operational co-management, member engagement, and execution.
                      </p>
                    </div>
                  </div>

                  {/* Position Preference Selector: displays after role is chosen */}
                  {requestedRole && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-xl bg-white/60 border border-white/80 space-y-2.5 mt-2 shadow-inner"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                          Select Preferred Position in {requestedRole} Role:
                        </span>
                        <span className="text-2xs text-gray-500">Live database availability</span>
                      </div>

                      {/* Position Grid: 3 specific positions */}
                      <div className="grid grid-cols-3 gap-2">
                        {(requestedRole === "Leader" ? [1, 2, 3] : [4, 5, 6]).map((pos) => {
                          const slot = leaders.find((l) => l.position === pos);
                          const isOccupied = slot?.status === 'filled';
                          const isSelected = requestedPosition === pos;

                          return (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => onRequestedPosition(pos)}
                              className={`p-2.5 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                                isSelected
                                  ? "border-blue-600 bg-blue-50 ring-2 ring-blue-300 shadow-sm"
                                  : "border-gray-200 bg-white/70 hover:bg-white"
                              }`}
                            >
                              <span className="text-xs font-bold text-gray-900">
                                {requestedRole === "Leader" ? `Leader #${pos}` : `Co-Leader #${pos - 3}`}
                              </span>
                              <span className="text-2xs text-gray-500 font-mono">
                                Slot #{pos}
                              </span>
                              <span
                                className={`text-3xs uppercase font-bold px-1.5 py-0.5 rounded-full ${
                                  isOccupied
                                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                                    : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                }`}
                              >
                                {isOccupied ? "Occupied" : "Open"}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Option: Any available position in this role (Flexible Preference) */}
                      <button
                        type="button"
                        onClick={() => onRequestedPosition(0)}
                        className={`w-full py-2 px-3 rounded-lg border text-xs font-medium transition-all flex items-center justify-between ${
                          requestedPosition === 0
                            ? "border-blue-600 bg-blue-50/90 text-blue-900 ring-2 ring-blue-200 font-semibold"
                            : "border-gray-200 bg-white/70 hover:bg-white text-gray-700"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Check size={14} className={requestedPosition === 0 ? "text-blue-600" : "text-transparent"} />
                          Any available position in this role (Flexible)
                        </span>
                        <span className="text-2xs text-gray-500">Recommended for highest match</span>
                      </button>

                      {/* Occupied Seat Explanation Banner */}
                      {isSelectedSlotOccupied && (
                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50/90 border border-amber-200 text-xs text-amber-800">
                          <AlertCircle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-2xs leading-relaxed">
                            <strong>Slot #{requestedPosition} is currently occupied.</strong> Selecting this records your preference for administrator evaluation, backup seating, or potential reallocation. Seat assignment is never guaranteed.
                          </p>
                        </div>
                      )}

                      <p className="text-3xs text-gray-500 leading-normal">
                        Note: Selecting a numbered position records your preference. Placement is finalized during administrator review and is not an instant reservation.
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Profile Picture Upload */}
                <div>
                  <label className="text-sm font-medium text-gray-800 block mb-1">
                    Profile Picture <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full overflow-hidden border border-gray-200 shadow-sm bg-white/70 flex items-center justify-center flex-shrink-0">
                      {profilePreview ? (
                        <img src={profilePreview} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-slate-100 to-white" />
                      )}
                    </div>
                    <label
                      htmlFor="profileImage"
                      className="flex-1 cursor-pointer rounded-2xl border border-white/60 bg-white/60 backdrop-blur-md px-4 py-3 shadow-sm hover:shadow-md transition ring-1 ring-transparent hover:ring-[rgba(167,216,255,0.5)]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#333333] truncate">
                          {profilePreview ? 'Change image' : 'Choose JPG or PNG (max 5MB)'}
                        </span>
                        <Button type="button" variant="outline" size="sm" className="glass-button text-[#333333] pointer-events-none">
                          Browse…
                        </Button>
                      </div>
                      <input
                        id="profileImage"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => onImageChange(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                  {imageError && <p className="mt-2 text-xs text-red-600 font-medium">{imageError}</p>}
                </div>

                {/* Short Bio */}
                <div>
                  <label className="text-sm font-medium text-gray-800">Short Bio</label>
                  <Textarea
                    value={bio}
                    onChange={(e) => onBio(e.target.value)}
                    placeholder="Share your background, vision for 2027, and what you hope to contribute..."
                    rows={4}
                    maxLength={1000}
                    className="mt-1 bg-white/70 border-white/60 focus:bg-white transition"
                  />
                </div>

                {/* Submit Application Button */}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full text-black font-semibold hover:brightness-105 shadow-md py-6 text-base"
                  style={{ backgroundImage: 'linear-gradient(135deg,#D7C4F3,#A7D8FF)' }}
                >
                  {submitting ? "Submitting Application..." : "Submit Application"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function FAQ({ faqs }: { faqs: SiteContent['faqs'] }) {
  if (!faqs || faqs.length === 0) return null;

  return (
    <section id="faq" className="scroll-mt-20 py-16 md:py-24">
      <div className="mx-auto max-w-4xl px-4">
        <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "Cinzel, serif", color: '#333333' }}>
          Frequently Asked Questions
        </h2>
        <Accordion type="single" collapsible className="mt-6">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.id || index} value={faq.id || `faq-${index}`}>
              <AccordionTrigger className="text-left font-medium text-gray-800 hover:text-black">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-700 leading-relaxed text-sm md:text-base">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function Contact({ contact }: { contact: SiteContent['contact'] }) {
  if (!contact) return null;

  return (
    <section id="contact" className="scroll-mt-20 py-16 md:py-24">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "Cinzel, serif", color: '#333333' }}>
          {contact.heading || "Contact"}
        </h2>
        <p className="mt-2 text-muted-foreground" style={{ color: '#333333' }}>
          {contact.subtitle || "Any questions or query? We'd love to hear from you."}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          {contact.email && (
            <a className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[rgba(255,255,255,0.3)] hover:bg-white/60 text-sm font-medium transition" href={`mailto:${contact.email}`}>
              <Mail size={18} /> {contact.email}
            </a>
          )}
          {contact.discordUrl && (
            <a className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[rgba(255,255,255,0.3)] hover:bg-white/60 text-sm font-medium transition" href={contact.discordUrl} target="_blank" rel="noreferrer">
              <MessageSquare size={18} /> Discord
            </a>
          )}
          {contact.telegramUrl && (
            <a className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[rgba(255,255,255,0.3)] hover:bg-white/60 text-sm font-medium transition" href={contact.telegramUrl} target="_blank" rel="noreferrer">
              <Send size={18} /> Telegram
            </a>
          )}
          {contact.whatsappUrl && (
            <a className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[rgba(255,255,255,0.3)] hover:bg-white/60 text-sm font-medium transition" href={contact.whatsappUrl} target="_blank" rel="noreferrer">
              <Phone size={18} /> WhatsApp
            </a>
          )}
          {contact.youtubeUrl && (
            <a className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[rgba(255,255,255,0.3)] hover:bg-white/60 text-sm font-medium transition" href={contact.youtubeUrl} target="_blank" rel="noreferrer">
              <Youtube size={18} /> YouTube
            </a>
          )}
        </div>
      </div>
    </section>
  );
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
  const particles = useMemo(() => Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    delay: ((i * 1.7) % 10),
    duration: 15 + ((i * 3.1) % 10),
    left: ((i * 19 + 7) % 100),
    size: 4 + ((i * 2.3) % 8),
    color: ['#FFD700', '#6EC6FF', '#1A237E', '#D7C4F3', '#B9FBC0'][i % 5]
  })), []);

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
          boxShadow: `0 0 10px ${p.color}40`,
          willChange: 'transform'
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

const MemoizedNavbar = React.memo(Navbar);
const MemoizedParallaxBackground = React.memo(ParallaxBackground);
const MemoizedAbout = React.memo(About);
const MemoizedLeadersGrid = React.memo(LeadersGrid);
const MemoizedFAQ = React.memo(FAQ);
const MemoizedContact = React.memo(Contact);
const MemoizedFooter = React.memo(Footer);
const MemoizedFloatingParticles = React.memo(FloatingParticles);