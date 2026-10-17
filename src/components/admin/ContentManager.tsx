"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SiteContent,
  InfoCard,
  FaqItem,
} from "@/lib/content";
import {
  FileText,
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  Bell,
  Share2,
  History,
  Smartphone,
  Monitor,
  Eye,
  Save,
  RotateCcw,
  Clock,
  Layers,
  ChevronRight,
  ExternalLink,
  X,
  AlertTriangle,
} from "lucide-react";

interface ContentManagerProps {
  content: SiteContent;
  onChange: (updated: SiteContent) => void;
  onSave: () => Promise<void>;
  onDiscard: () => void;
  onResetDefault: () => Promise<void>;
  isSaving: boolean;
  isDirty: boolean;
  version: number;
  updatedAt: string | Date | null;
  revisions: Array<{ id: number; action: string; createdBy?: string; createdAt: string | Date }>;
}

export function ContentManager({
  content,
  onChange,
  onSave,
  onDiscard,
  onResetDefault,
  isSaving,
  isDirty,
  version,
  updatedAt,
  revisions,
}: ContentManagerProps) {
  const [activeTab, setActiveTab] = useState<
    "about" | "hero" | "event" | "announcement" | "faqs" | "contact" | "revisions"
  >("about");

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Helper for deeply updating content state
  const updateContent = <K extends keyof SiteContent>(
    section: K,
    updates: Partial<SiteContent[K]>
  ) => {
    onChange({
      ...content,
      [section]: {
        ...content[section],
        ...updates,
      },
    });
  };

  // Reorder helper
  const moveItem = <T,>(list: T[], index: number, direction: "up" | "down"): T[] => {
    const copy = [...list];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= copy.length) return copy;
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    return copy;
  };

  return (
    <div className="space-y-6">
      {/* CMS Top Bar: Actions & Dirty State */}
      <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-white/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "Cinzel, serif" }}>
              Website Content Manager
            </h2>
            <Badge
              variant="outline"
              className={`text-xs font-semibold px-2.5 py-0.5 ${
                isDirty
                  ? "bg-amber-100 text-amber-800 border-amber-300 animate-pulse"
                  : "bg-emerald-100 text-emerald-800 border-emerald-300"
              }`}
            >
              {isDirty ? "● Unsaved Changes" : "✓ Published"}
            </Badge>
          </div>

          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span>Rev #{version}</span>
            {updatedAt && (
              <span>• Last saved {new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreviewModal(true)}
            className="border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
          >
            <Eye size={14} className="mr-1.5" />
            Live Preview
          </Button>

          {isDirty && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDiscard}
              disabled={isSaving}
              className="border-gray-300 text-gray-600 hover:bg-gray-100"
            >
              Discard Edits
            </Button>
          )}

          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving || !isDirty}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Save size={14} className={`mr-1.5 ${isSaving ? "animate-spin" : ""}`} />
            {isSaving ? "Publishing..." : "Save & Publish"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowResetConfirm(true)}
            className="text-xs text-rose-600 hover:bg-rose-50"
            title="Reset website content to defaults"
          >
            <RotateCcw size={13} className="mr-1" />
            Reset Defaults
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-1.5 p-1.5 rounded-xl bg-white/60 border border-gray-200/70 backdrop-blur-sm">
        {[
          { id: "about", label: "About MEP", icon: FileText, badge: "Main" },
          { id: "hero", label: "Hero & Headline", icon: Sparkles },
          { id: "event", label: "Event & Countdown", icon: Clock },
          { id: "announcement", label: "Announcement Banner", icon: Bell },
          { id: "faqs", label: "FAQs", icon: HelpCircle, count: content.faqs.length },
          { id: "contact", label: "Contact & Social", icon: Share2 },
          { id: "revisions", label: "History", icon: History, count: revisions.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-700 hover:bg-white/70 hover:text-black"
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-2xs px-1.5 py-0.2 rounded font-bold uppercase ${
                    isActive ? "bg-blue-800 text-white" : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
              {tab.count !== undefined && (
                <span
                  className={`text-2xs px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-blue-700 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: 1. ABOUT MEP */}
      {activeTab === "about" && (
        <Card className="bg-white/80 border-white/60 shadow-sm backdrop-blur-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg font-bold" style={{ fontFamily: "Cinzel, serif" }}>
                  About MEP Section Settings
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Customize the manifesto, squad composition, leader responsibilities, and callouts.
                </p>
              </div>

              {/* Section Visibility Switch */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs font-semibold text-gray-700">Section Visibility:</span>
                <input
                  type="checkbox"
                  checked={content.about.visible}
                  onChange={(e) =>
                    updateContent("about", { visible: e.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className={`text-xs font-bold ${content.about.visible ? "text-emerald-700" : "text-gray-400"}`}>
                  {content.about.visible ? "Visible" : "Hidden"}
                </span>
              </label>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-6">
            {/* Heading & Subtitle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Main Section Heading <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={content.about.heading}
                  onChange={(e) =>
                    updateContent("about", { heading: e.target.value })
                  }
                  placeholder="e.g. ABOUT MEP"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Intro Subtitle / Highlight Line
                </label>
                <input
                  type="text"
                  value={content.about.subtitle}
                  onChange={(e) =>
                    updateContent("about", { subtitle: e.target.value })
                  }
                  placeholder="e.g. 🎬 2027 Mega AMV New Year MEP: Call for Leaders!"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  maxLength={200}
                />
              </div>
            </div>

            {/* Introductory Paragraph */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Introductory Opening Paragraph
              </label>
              <textarea
                value={content.about.introParagraph}
                onChange={(e) =>
                  updateContent("about", { introParagraph: e.target.value })
                }
                rows={3}
                className="w-full rounded-md border border-gray-300 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                placeholder="Opening paragraph introducing the project..."
              />
            </div>

            {/* Additional Paragraphs List (Editable, Reorderable) */}
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Additional Description Paragraphs ({content.about.additionalParagraphs.length})
                  </h4>
                  <p className="text-2xs text-gray-500">
                    Add, edit, reorder or remove story & context paragraphs.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateContent("about", {
                      additionalParagraphs: [
                        ...content.about.additionalParagraphs,
                        "New paragraph text describing MEP 2027...",
                      ],
                    });
                  }}
                  className="h-7 text-xs bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Plus size={12} className="mr-1" />
                  Add Paragraph
                </Button>
              </div>

              {content.about.additionalParagraphs.map((para, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg border border-gray-200 bg-white/70 flex items-start gap-2 group"
                >
                  <span className="text-xs font-bold text-gray-400 mt-2 flex-shrink-0 w-6">
                    #{index + 1}
                  </span>
                  <textarea
                    value={para}
                    onChange={(e) => {
                      const updated = [...content.about.additionalParagraphs];
                      updated[index] = e.target.value;
                      updateContent("about", { additionalParagraphs: updated });
                    }}
                    rows={2}
                    className="flex-1 rounded border border-gray-300 p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() =>
                        updateContent("about", {
                          additionalParagraphs: moveItem(
                            content.about.additionalParagraphs,
                            index,
                            "up"
                          ),
                        })
                      }
                      title="Move up"
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-600"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={index === content.about.additionalParagraphs.length - 1}
                      onClick={() =>
                        updateContent("about", {
                          additionalParagraphs: moveItem(
                            content.about.additionalParagraphs,
                            index,
                            "down"
                          ),
                        })
                      }
                      title="Move down"
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-600"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = content.about.additionalParagraphs.filter(
                          (_, i) => i !== index
                        );
                        updateContent("about", { additionalParagraphs: updated });
                      }}
                      title="Delete paragraph"
                      className="p-1 rounded hover:bg-rose-100 text-rose-600"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Info Cards (Vision, Structure, Role) */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Highlight Info Cards ({content.about.infoCards.length})
                  </h4>
                  <p className="text-2xs text-gray-500">
                    The 3 glass cards shown below the manifesto (Vision, Structure, Role).
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const id = `card-${Date.now()}`;
                    updateContent("about", {
                      infoCards: [
                        ...content.about.infoCards,
                        { id, title: "New Card Title", text: "Card description text..." },
                      ],
                    });
                  }}
                  className="h-7 text-xs bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Plus size={12} className="mr-1" />
                  Add Card
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {content.about.infoCards.map((card, index) => (
                  <div
                    key={card.id || index}
                    className="p-3.5 rounded-xl border border-gray-200 bg-white/70 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={card.title}
                        onChange={(e) => {
                          const updated = [...content.about.infoCards];
                          updated[index] = { ...card, title: e.target.value };
                          updateContent("about", { infoCards: updated });
                        }}
                        placeholder="Card Title"
                        className="font-bold text-sm text-gray-800 border-b border-gray-200 bg-transparent py-0.5 outline-none w-3/4"
                      />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() =>
                            updateContent("about", {
                              infoCards: moveItem(content.about.infoCards, index, "up"),
                            })
                          }
                          className="p-1 text-gray-400 hover:text-black disabled:opacity-20"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          disabled={index === content.about.infoCards.length - 1}
                          onClick={() =>
                            updateContent("about", {
                              infoCards: moveItem(content.about.infoCards, index, "down"),
                            })
                          }
                          className="p-1 text-gray-400 hover:text-black disabled:opacity-20"
                        >
                          <ArrowDown size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = content.about.infoCards.filter((_, i) => i !== index);
                            updateContent("about", { infoCards: updated });
                          }}
                          className="p-1 text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={card.text}
                      onChange={(e) => {
                        const updated = [...content.about.infoCards];
                        updated[index] = { ...card, text: e.target.value };
                        updateContent("about", { infoCards: updated });
                      }}
                      rows={3}
                      placeholder="Card text..."
                      className="w-full text-xs rounded border border-gray-200 p-2 bg-white outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Callout Text & CTA Button */}
            <div className="pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Highlighted Bottom Callout
                </label>
                <textarea
                  value={content.about.calloutText}
                  onChange={(e) =>
                    updateContent("about", { calloutText: e.target.value })
                  }
                  rows={2}
                  className="w-full rounded-md border border-gray-300 bg-white p-2.5 text-sm"
                  placeholder="e.g. If you're passionate about editing, experienced in leadership..."
                />
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-2xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Callout CTA Label
                  </label>
                  <input
                    type="text"
                    value={content.about.ctaButtonText || ""}
                    onChange={(e) =>
                      updateContent("about", { ctaButtonText: e.target.value })
                    }
                    placeholder="e.g. Fill out Application Form"
                    className="w-full rounded border border-gray-300 bg-white px-2.5 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Destination Anchor / URL
                  </label>
                  <input
                    type="text"
                    value={content.about.ctaButtonLink || "#apply"}
                    onChange={(e) =>
                      updateContent("about", { ctaButtonLink: e.target.value })
                    }
                    placeholder="#apply"
                    className="w-full rounded border border-gray-300 bg-white px-2.5 py-1 text-xs"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: 2. HERO & HEADLINE */}
      {activeTab === "hero" && (
        <Card className="bg-white/80 border-white/60 shadow-sm backdrop-blur-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg font-bold" style={{ fontFamily: "Cinzel, serif" }}>
                  Hero Section & Homepage Headlines
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure top hero titles, subtitle, CTA button text and destination anchors.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs font-semibold text-gray-700">Hero Visibility:</span>
                <input
                  type="checkbox"
                  checked={content.hero.visible}
                  onChange={(e) =>
                    updateContent("hero", { visible: e.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className={`text-xs font-bold ${content.hero.visible ? "text-emerald-700" : "text-gray-400"}`}>
                  {content.hero.visible ? "Visible" : "Hidden"}
                </span>
              </label>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Title Line 1 (Cinzel Heading)
                </label>
                <input
                  type="text"
                  value={content.hero.titleLine1}
                  onChange={(e) =>
                    updateContent("hero", { titleLine1: e.target.value })
                  }
                  placeholder="New Year 2027"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Title Line 2 (Pastel Blue Shimmer)
                </label>
                <input
                  type="text"
                  value={content.hero.titleLine2}
                  onChange={(e) =>
                    updateContent("hero", { titleLine2: e.target.value })
                  }
                  placeholder="MEP Invitation"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Hero Subtitle Description
              </label>
              <textarea
                value={content.hero.subtitle}
                onChange={(e) =>
                  updateContent("hero", { subtitle: e.target.value })
                }
                rows={2}
                className="w-full rounded-md border border-gray-300 bg-white p-2.5 text-sm"
                placeholder="Celebrate progress, leadership, and community..."
              />
            </div>

            {/* Buttons Customization */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-gray-100">
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                <span className="text-xs font-bold text-gray-700 block">Primary CTA Button</span>
                <input
                  type="text"
                  value={content.hero.primaryCtaLabel}
                  onChange={(e) =>
                    updateContent("hero", { primaryCtaLabel: e.target.value })
                  }
                  placeholder="Apply as Leader"
                  className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                />
                <input
                  type="text"
                  value={content.hero.primaryCtaLink}
                  onChange={(e) =>
                    updateContent("hero", { primaryCtaLink: e.target.value })
                  }
                  placeholder="#apply"
                  className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                />
              </div>

              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                <span className="text-xs font-bold text-gray-700 block">Secondary CTA Button</span>
                <input
                  type="text"
                  value={content.hero.secondaryCtaLabel}
                  onChange={(e) =>
                    updateContent("hero", { secondaryCtaLabel: e.target.value })
                  }
                  placeholder="Apply as Co-Leader"
                  className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                />
                <input
                  type="text"
                  value={content.hero.secondaryCtaLink}
                  onChange={(e) =>
                    updateContent("hero", { secondaryCtaLink: e.target.value })
                  }
                  placeholder="#apply"
                  className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                />
              </div>

              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                <span className="text-xs font-bold text-gray-700 block">Learn More Button</span>
                <input
                  type="text"
                  value={content.hero.learnMoreLabel}
                  onChange={(e) =>
                    updateContent("hero", { learnMoreLabel: e.target.value })
                  }
                  placeholder="Learn more"
                  className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                />
                <input
                  type="text"
                  value={content.hero.learnMoreLink}
                  onChange={(e) =>
                    updateContent("hero", { learnMoreLink: e.target.value })
                  }
                  placeholder="#about"
                  className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: 3. EVENT & COUNTDOWN */}
      {activeTab === "event" && (
        <Card className="bg-white/80 border-white/60 shadow-sm backdrop-blur-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg font-bold" style={{ fontFamily: "Cinzel, serif" }}>
                  Countdown & Event Timing Settings
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Set the target event timestamp and heading for the live countdown.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs font-semibold text-gray-700">Countdown Visible:</span>
                <input
                  type="checkbox"
                  checked={content.event.countdownVisible}
                  onChange={(e) =>
                    updateContent("event", { countdownVisible: e.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className={`text-xs font-bold ${content.event.countdownVisible ? "text-emerald-700" : "text-gray-400"}`}>
                  {content.event.countdownVisible ? "Active" : "Hidden"}
                </span>
              </label>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Target Timestamp (ISO Date)
                </label>
                <input
                  type="text"
                  value={content.event.targetDate}
                  onChange={(e) =>
                    updateContent("event", { targetDate: e.target.value })
                  }
                  placeholder="2027-01-01T00:00:00+05:30"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
                <span className="text-2xs text-gray-500 mt-1 block">
                  Current format: YYYY-MM-DDTHH:mm:ss+TZ
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Event Timezone
                </label>
                <input
                  type="text"
                  value={content.event.timezone}
                  onChange={(e) =>
                    updateContent("event", { timezone: e.target.value })
                  }
                  placeholder="Asia/Kolkata"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Countdown Heading
                </label>
                <input
                  type="text"
                  value={content.event.countdownHeading}
                  onChange={(e) =>
                    updateContent("event", { countdownHeading: e.target.value })
                  }
                  placeholder="Total days left in New Year"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: 4. ANNOUNCEMENT BANNER */}
      {activeTab === "announcement" && (
        <Card className="bg-white/80 border-white/60 shadow-sm backdrop-blur-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg font-bold" style={{ fontFamily: "Cinzel, serif" }}>
                  Announcement Banner
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Display a prominent alert or announcement bar across the top of the homepage.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs font-semibold text-gray-700">Banner Enabled:</span>
                <input
                  type="checkbox"
                  checked={content.announcement.enabled}
                  onChange={(e) =>
                    updateContent("announcement", { enabled: e.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className={`text-xs font-bold ${content.announcement.enabled ? "text-emerald-700" : "text-gray-400"}`}>
                  {content.announcement.enabled ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Announcement Message
              </label>
              <textarea
                value={content.announcement.text}
                onChange={(e) =>
                  updateContent("announcement", { text: e.target.value })
                }
                rows={2}
                placeholder="Enter alert text..."
                className="w-full rounded-md border border-gray-300 bg-white p-2.5 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Visual Style
                </label>
                <select
                  value={content.announcement.style}
                  onChange={(e) =>
                    updateContent("announcement", { style: e.target.value as any })
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="gradient">Liquid Gradient (Violet / Blue)</option>
                  <option value="gold">Golden Celebration</option>
                  <option value="blue">Sapphire Blue Glass</option>
                  <option value="festive">Festive Fireworks Glow</option>
                  <option value="minimal">Minimal Frosted</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Optional Link Label
                </label>
                <input
                  type="text"
                  value={content.announcement.linkLabel || ""}
                  onChange={(e) =>
                    updateContent("announcement", { linkLabel: e.target.value })
                  }
                  placeholder="e.g. Apply Now"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Destination URL or Anchor
                </label>
                <input
                  type="text"
                  value={content.announcement.linkUrl || ""}
                  onChange={(e) =>
                    updateContent("announcement", { linkUrl: e.target.value })
                  }
                  placeholder="#apply or https://..."
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Banner Live Box Preview */}
            <div className="pt-3 border-t border-gray-100">
              <span className="text-2xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
                Live Banner Appearance:
              </span>
              <div
                className={`p-3 rounded-xl border text-center text-xs sm:text-sm font-medium flex items-center justify-center gap-2 ${
                  content.announcement.style === "gold"
                    ? "bg-amber-100/90 text-amber-900 border-amber-300"
                    : content.announcement.style === "blue"
                    ? "bg-blue-600 text-white border-blue-400"
                    : content.announcement.style === "festive"
                    ? "bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white border-purple-400 shadow"
                    : content.announcement.style === "minimal"
                    ? "bg-white/90 text-gray-800 border-gray-300"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-indigo-400 shadow-sm"
                }`}
              >
                <span>{content.announcement.text || "Your announcement text will appear here."}</span>
                {content.announcement.linkLabel && (
                  <span className="underline underline-offset-2 font-bold ml-1">
                    {content.announcement.linkLabel} →
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: 5. FAQS MANAGER */}
      {activeTab === "faqs" && (
        <Card className="bg-white/80 border-white/60 shadow-sm backdrop-blur-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg font-bold" style={{ fontFamily: "Cinzel, serif" }}>
                  Frequently Asked Questions ({content.faqs.length})
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Add, edit, reorder or remove Q&A items shown in the homepage accordion.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const id = `faq-${Date.now()}`;
                  onChange({
                    ...content,
                    faqs: [
                      ...content.faqs,
                      {
                        id,
                        question: "New Question Title?",
                        answer: "Detailed answer explaining rules, guidelines, or timeline...",
                        category: "General",
                      },
                    ],
                  });
                }}
                className="h-8 text-xs bg-blue-600 text-white hover:bg-blue-700 border-transparent shadow-sm"
              >
                <Plus size={13} className="mr-1.5" />
                Add FAQ Item
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4">
            {content.faqs.map((faq, index) => (
              <div
                key={faq.id || index}
                className="p-4 rounded-xl border border-gray-200 bg-white/70 space-y-3 relative group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400">Q{index + 1}:</span>
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => {
                          const updated = [...content.faqs];
                          updated[index] = { ...faq, question: e.target.value };
                          onChange({ ...content, faqs: updated });
                        }}
                        placeholder="Question title..."
                        className="flex-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <textarea
                      value={faq.answer}
                      onChange={(e) => {
                        const updated = [...content.faqs];
                        updated[index] = { ...faq, answer: e.target.value };
                        onChange({ ...content, faqs: updated });
                      }}
                      rows={2}
                      placeholder="Answer..."
                      className="w-full rounded border border-gray-300 bg-white p-2.5 text-xs text-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Reorder and Delete Toolbar */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() =>
                        onChange({
                          ...content,
                          faqs: moveItem(content.faqs, index, "up"),
                        })
                      }
                      title="Move up"
                      className="p-1 rounded text-gray-400 hover:text-black hover:bg-gray-100 disabled:opacity-20"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={index === content.faqs.length - 1}
                      onClick={() =>
                        onChange({
                          ...content,
                          faqs: moveItem(content.faqs, index, "down"),
                        })
                      }
                      title="Move down"
                      className="p-1 rounded text-gray-400 hover:text-black hover:bg-gray-100 disabled:opacity-20"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = content.faqs.filter((_, i) => i !== index);
                        onChange({ ...content, faqs: updated });
                      }}
                      title="Delete FAQ"
                      className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 mt-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: 6. CONTACT & SOCIAL */}
      {activeTab === "contact" && (
        <Card className="bg-white/80 border-white/60 shadow-sm backdrop-blur-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="text-lg font-bold" style={{ fontFamily: "Cinzel, serif" }}>
              Contact Information & Social Destinations
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Verified public communication channels and community server links.
            </p>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Contact Section Heading
                </label>
                <input
                  type="text"
                  value={content.contact.heading}
                  onChange={(e) =>
                    updateContent("contact", { heading: e.target.value })
                  }
                  placeholder="Contact & Community"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Subtitle Prompt
                </label>
                <input
                  type="text"
                  value={content.contact.subtitle}
                  onChange={(e) =>
                    updateContent("contact", { subtitle: e.target.value })
                  }
                  placeholder="Any questions or query? We'd love to hear from you."
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={content.contact.email}
                  onChange={(e) =>
                    updateContent("contact", { email: e.target.value })
                  }
                  placeholder="name@example.com"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Discord Link
                </label>
                <input
                  type="text"
                  value={content.contact.discordUrl}
                  onChange={(e) =>
                    updateContent("contact", { discordUrl: e.target.value })
                  }
                  placeholder="https://discordapp.com/users/..."
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Telegram Link
                </label>
                <input
                  type="text"
                  value={content.contact.telegramUrl}
                  onChange={(e) =>
                    updateContent("contact", { telegramUrl: e.target.value })
                  }
                  placeholder="https://t.me/..."
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  WhatsApp Contact Link (Optional)
                </label>
                <input
                  type="text"
                  value={content.contact.whatsappUrl || ""}
                  onChange={(e) =>
                    updateContent("contact", { whatsappUrl: e.target.value })
                  }
                  placeholder="https://wa.me/..."
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: 7. REVISIONS HISTORY */}
      {activeTab === "revisions" && (
        <Card className="bg-white/80 border-white/60 shadow-sm backdrop-blur-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="text-lg font-bold" style={{ fontFamily: "Cinzel, serif" }}>
              Content Revision History ({revisions.length})
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Audit log of saved configurations and updates.
            </p>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            {revisions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No revisions recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3 rounded-lg border border-gray-200 bg-white/60 flex items-center justify-between text-xs sm:text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={`capitalize font-semibold ${
                          rev.action === "reset"
                            ? "bg-rose-100 text-rose-800 border-rose-300"
                            : rev.action === "initial"
                            ? "bg-blue-100 text-blue-800 border-blue-300"
                            : "bg-emerald-100 text-emerald-800 border-emerald-300"
                        }`}
                      >
                        {rev.action}
                      </Badge>
                      <span className="text-gray-700 font-medium">
                        Revision #{rev.id} by {rev.createdBy || "admin"}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500">
                      {new Date(rev.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL: LIVE PREVIEW (Desktop / Mobile switcher) */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-300 flex flex-col w-full max-w-5xl max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-gray-900" style={{ fontFamily: "Cinzel, serif" }}>
                  Live Homepage Content Preview
                </h3>
                <Badge variant="outline" className="text-2xs bg-amber-50 text-amber-700 border-amber-200">
                  Includes unsaved edits
                </Badge>
              </div>

              {/* Device Selector */}
              <div className="flex items-center gap-1 bg-gray-200/80 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition ${
                    previewDevice === "desktop"
                      ? "bg-white text-black shadow-xs"
                      : "text-gray-600 hover:text-black"
                  }`}
                >
                  <Monitor size={13} />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition ${
                    previewDevice === "mobile"
                      ? "bg-white text-black shadow-xs"
                      : "text-gray-600 hover:text-black"
                  }`}
                >
                  <Smartphone size={13} />
                  <span>Mobile (375px)</span>
                </button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreviewModal(false)}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X size={16} />
              </Button>
            </div>

            {/* Modal Preview Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex justify-center">
              <div
                className={`transition-all duration-200 bg-white/70 backdrop-blur-md rounded-2xl border border-white/50 shadow-md p-4 sm:p-8 space-y-8 ${
                  previewDevice === "mobile" ? "w-[375px] text-xs" : "w-full max-w-4xl"
                }`}
              >
                {/* 1. Announcement Banner Preview */}
                {content.announcement.enabled && (
                  <div
                    className={`p-3 rounded-xl border text-center font-medium flex items-center justify-center gap-1.5 ${
                      content.announcement.style === "gold"
                        ? "bg-amber-100 text-amber-900 border-amber-300"
                        : content.announcement.style === "blue"
                        ? "bg-blue-600 text-white border-blue-400"
                        : content.announcement.style === "festive"
                        ? "bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white border-purple-400 shadow"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-indigo-400"
                    }`}
                  >
                    <span>{content.announcement.text}</span>
                    {content.announcement.linkLabel && (
                      <span className="underline font-bold ml-1">
                        {content.announcement.linkLabel} →
                      </span>
                    )}
                  </div>
                )}

                {/* 2. Hero Section Preview */}
                {content.hero.visible && (
                  <div className="text-center space-y-4 py-6 border-b border-gray-200/60">
                    <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight" style={{ fontFamily: "Cinzel, serif" }}>
                      <span className="block text-gray-800">{content.hero.titleLine1}</span>
                      <span className="block text-blue-600">{content.hero.titleLine2}</span>
                    </h1>
                    <p className="text-gray-700 max-w-xl mx-auto text-sm sm:text-base">
                      {content.hero.subtitle}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <Button size="sm" className="bg-blue-600 text-white">
                        {content.hero.primaryCtaLabel}
                      </Button>
                      <Button size="sm" variant="outline" className="bg-white/80">
                        {content.hero.secondaryCtaLabel}
                      </Button>
                      <Button size="sm" variant="ghost">
                        {content.hero.learnMoreLabel}
                      </Button>
                    </div>
                  </div>
                )}

                {/* 3. About MEP Section Preview */}
                {content.about.visible && (
                  <div className="space-y-6 py-4">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900" style={{ fontFamily: "Cinzel, serif" }}>
                        {content.about.heading}
                      </h2>
                      {content.about.subtitle && (
                        <p className="font-semibold text-blue-800 text-sm mt-1">
                          {content.about.subtitle}
                        </p>
                      )}
                    </div>

                    <p className="text-gray-800 leading-relaxed font-medium">
                      {content.about.introParagraph}
                    </p>

                    {/* Additional Paragraphs */}
                    {content.about.additionalParagraphs.map((para, i) => (
                      <p key={i} className="text-gray-700 leading-relaxed">
                        {para}
                      </p>
                    ))}

                    {/* Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {content.about.infoCards.map((card, i) => (
                        <div key={i} className="p-3 rounded-xl bg-white/80 border border-gray-200">
                          <h5 className="font-bold text-sm text-gray-800 mb-1" style={{ fontFamily: "Cinzel, serif" }}>
                            {card.title}
                          </h5>
                          <p className="text-xs text-gray-600 leading-relaxed">{card.text}</p>
                        </div>
                      ))}
                    </div>

                    {content.about.calloutText && (
                      <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-center">
                        <p className="text-xs text-blue-900 font-medium">{content.about.calloutText}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. FAQs Preview */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <h3 className="font-bold text-xl text-gray-900" style={{ fontFamily: "Cinzel, serif" }}>
                    Frequently Asked Questions ({content.faqs.length})
                  </h3>
                  <div className="space-y-2">
                    {content.faqs.slice(0, 4).map((faq, i) => (
                      <div key={i} className="p-3 rounded-lg bg-white/80 border border-gray-200 text-xs">
                        <p className="font-bold text-gray-800">{faq.question}</p>
                        <p className="text-gray-600 mt-1 leading-relaxed">{faq.answer}</p>
                      </div>
                    ))}
                    {content.faqs.length > 4 && (
                      <p className="text-2xs text-gray-500 text-center">+ {content.faqs.length - 4} more FAQ items</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: RESET TO DEFAULTS */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md bg-white shadow-2xl border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg text-rose-600 flex items-center gap-2">
                <AlertTriangle size={20} />
                Confirm Reset to Default Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-700">
                Are you sure you want to restore the default MEP 2027 website text, headings, and FAQ entries?
              </p>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                ✓ <strong>Safe operation:</strong> This only restores default text content. It will <strong>NOT</strong> delete any applications or modify leader seat assignments.
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    setShowResetConfirm(false);
                    await onResetDefault();
                  }}
                >
                  Yes, Reset Content
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
