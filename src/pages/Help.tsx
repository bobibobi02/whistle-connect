import { Link } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  MessageSquare,
  Shield,
  CreditCard,
  Users,
  Flag,
  FileText,
  Bug,
} from "lucide-react";

const faqs = [
  {
    question: "How do I create a post?",
    answer:
      "Click the 'Create Post' button in the header or navigate to a community and use the create post form. You can add text, images, videos, polls, or live stream links to your posts.",
  },
  {
    question: "How do I join a community?",
    answer:
      "Navigate to the Communities page, find a community you're interested in, and click the 'Join' button. Once joined, you'll see posts from that community in your feed.",
  },
  {
    question: "How does the voting system work?",
    answer:
      "Use the upvote and downvote buttons on posts and comments. Upvotes increase the content's visibility and contribute to the author's karma score.",
  },
  {
    question: "What are boosts?",
    answer:
      "Boosts are a way to support creators by sending them a tip. Boosted posts display a special badge, and the creator receives the boost amount.",
  },
  {
    question: "How do I report inappropriate content?",
    answer:
      "Click the three-dot menu on any post or comment and select 'Report'. Choose a reason and provide additional details if needed. Our moderation team will review the report.",
  },
  {
    question: "How do I change my notification settings?",
    answer:
      "Go to Settings and navigate to the Notifications section. You can customize which notifications you receive via email and in-app.",
  },
  {
    question: "How do I delete my account?",
    answer:
      "Go to Settings > Account and scroll to the 'Delete Account' section. This action is permanent and cannot be undone.",
  },
  {
    question: "What is NSFW content?",
    answer:
      "NSFW (Not Safe For Work) content contains mature themes. Such content is blurred by default and requires you to enable NSFW viewing in your settings.",
  },
];

const helpCategories = [
  {
    icon: MessageSquare,
    title: "Getting Started",
    description: "Learn the basics of using Whistle",
    links: [
      { label: "Create your first post", href: "/create" },
      { label: "Join communities", href: "/communities" },
    ],
  },
  {
    icon: Shield,
    title: "Safety & Privacy",
    description: "Protect your account and data",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Content Policy", href: "/content-policy" },
    ],
  },
  {
    icon: CreditCard,
    title: "Payments & Boosts",
    description: "Support creators and promoted content",
    links: [
      { label: "Refund Policy", href: "/refunds" },
      { label: "Creator Terms", href: "/creator-terms" },
    ],
  },
  {
    icon: Users,
    title: "Community Guidelines",
    description: "Rules for participating",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Content Policy", href: "/content-policy" },
    ],
  },
];

export default function Help() {
  return (
    <PageShell maxWidth="max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Help Center</h1>
        <p className="text-muted-foreground">
          Find answers to common questions or get in touch with support
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 justify-center mb-8">
        <Button asChild variant="outline">
          <Link to="/report-bug">
            <Bug className="h-4 w-4 mr-2" />
            Report a Bug
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/contact">
            <MessageSquare className="h-4 w-4 mr-2" />
            Contact Us
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/content-policy">
            <Flag className="h-4 w-4 mr-2" />
            Report Abuse
          </Link>
        </Button>
      </div>

      {/* Help Categories */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {helpCategories.map((category) => (
          <Card key={category.title}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <category.icon className="h-5 w-5 text-primary" />
                {category.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {category.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {category.links.map((link) => (
                  <Button
                    key={link.href}
                    variant="secondary"
                    size="sm"
                    asChild
                  >
                    <Link to={link.href}>{link.label}</Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Legal Links */}
      <div className="mt-8 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Legal & Policies
        </h2>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link to="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          <Link to="/content-policy" className="text-primary hover:underline">
            Content Policy
          </Link>
          <Link to="/cookies" className="text-primary hover:underline">
            Cookie Notice
          </Link>
          <Link to="/copyright" className="text-primary hover:underline">
            Copyright & DMCA
          </Link>
          <Link to="/refunds" className="text-primary hover:underline">
            Refund Policy
          </Link>
          <Link to="/advertiser-terms" className="text-primary hover:underline">
            Advertiser Terms
          </Link>
          <Link to="/creator-terms" className="text-primary hover:underline">
            Creator Terms
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
