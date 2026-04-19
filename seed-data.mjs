import { drizzle } from "drizzle-orm/mysql2";
import { eq, sql } from "drizzle-orm";
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean as mysqlBoolean } from "drizzle-orm/mysql-core";
import dotenv from "dotenv";
dotenv.config();

// Re-define tables inline for the seed script
const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

const useCases = mysqlTable("use_cases", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 300 }).notNull().unique(),
  description: text("description").notNull(),
  submitterId: int("submitterId").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  isHighlight: mysqlBoolean("isHighlight").default(false).notNull(),
  upvoteCount: int("upvoteCount").default(0).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  sessionReplayUrl: text("sessionReplayUrl"),
  deliverableUrl: text("deliverableUrl"),
  language: varchar("language", { length: 10 }).default("en").notNull(),
  rejectionReason: text("rejectionReason"),
  consentToContact: mysqlBoolean("consentToContact").default(false).notNull(),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

const useCaseCategories = mysqlTable("use_case_categories", {
  id: int("id").autoincrement().primaryKey(),
  useCaseId: int("useCaseId").notNull(),
  categoryId: int("categoryId").notNull(),
});

const screenshots = mysqlTable("screenshots", {
  id: int("id").autoincrement().primaryKey(),
  useCaseId: int("useCaseId").notNull(),
  url: text("url").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
});

const db = drizzle(process.env.DATABASE_URL);

// Sample screenshots from placeholder services
const placeholderScreenshots = [
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=500&fit=crop",
];

const sampleUseCases = [
  {
    title: "Competitive Market Analysis Dashboard",
    slug: "competitive-market-analysis-dashboard-" + Date.now().toString(36),
    description: "Built a comprehensive competitive analysis dashboard that tracks 50+ competitors across pricing, features, and market positioning. Manus automated the entire data collection pipeline, web scraping, and visualization — what would have taken a team of analysts weeks was done in a single afternoon session.",
    isHighlight: true,
    upvoteCount: 142,
    viewCount: 3200,
    language: "en",
    categoryIds: [1, 2, 16], // Marketing, Business Analysis, Research
    sessionReplayUrl: "https://manus.im/share/example-1",
    deliverableUrl: "https://example.com/dashboard",
  },
  {
    title: "Series A Pitch Deck for AI Startup",
    slug: "series-a-pitch-deck-ai-startup-" + Date.now().toString(36) + "a",
    description: "Created a polished 25-slide investor pitch deck complete with market sizing, competitive landscape, financial projections, and custom data visualizations. Manus researched the market, designed the slides, and produced a presentation-ready deck in under 2 hours.",
    isHighlight: true,
    upvoteCount: 98,
    viewCount: 2100,
    language: "en",
    categoryIds: [7, 11, 14], // VC/PE, Startups, Slides
    sessionReplayUrl: "https://manus.im/share/example-2",
  },
  {
    title: "E-commerce Product Catalog Website",
    slug: "ecommerce-product-catalog-website-" + Date.now().toString(36) + "b",
    description: "Designed and deployed a fully responsive e-commerce product catalog with 200+ products, category filtering, search, and a shopping cart. Built entirely through conversation with Manus — from wireframe to production deployment.",
    isHighlight: false,
    upvoteCount: 76,
    viewCount: 1800,
    language: "en",
    categoryIds: [8, 13], // E-commerce, Web Development
    deliverableUrl: "https://example.com/shop",
  },
  {
    title: "Quarterly Financial Report Automation",
    slug: "quarterly-financial-report-automation-" + Date.now().toString(36) + "c",
    description: "Automated the generation of quarterly financial reports by connecting to accounting APIs, processing transaction data, and producing formatted PDF reports with charts and executive summaries. Reduced report preparation time from 3 days to 30 minutes.",
    isHighlight: true,
    upvoteCount: 115,
    viewCount: 2800,
    language: "en",
    categoryIds: [3, 17], // Finance, Data & Spreadsheets
    sessionReplayUrl: "https://manus.im/share/example-4",
  },
  {
    title: "Multi-Channel Ad Campaign Creative Generator",
    slug: "multi-channel-ad-campaign-creative-" + Date.now().toString(36) + "d",
    description: "Generated a complete set of ad creatives for Facebook, Instagram, Google Display, and LinkedIn — including copy variations, image assets, and A/B test variants. Manus handled the entire creative production pipeline from brief to final assets.",
    isHighlight: false,
    upvoteCount: 63,
    viewCount: 1400,
    language: "en",
    categoryIds: [4, 18], // Advertising, Image & Video Generation
  },
  {
    title: "SaaS Product Roadmap & Feature Prioritization",
    slug: "saas-product-roadmap-feature-prioritization-" + Date.now().toString(36) + "e",
    description: "Built an interactive product roadmap by analyzing customer feedback from 500+ support tickets, NPS surveys, and feature requests. Manus categorized themes, scored impact vs. effort, and produced a prioritized roadmap with Gantt charts.",
    isHighlight: false,
    upvoteCount: 54,
    viewCount: 1200,
    language: "en",
    categoryIds: [5, 16], // Product Management, Research
  },
  {
    title: "Real Estate Market Comparison Report",
    slug: "real-estate-market-comparison-report-" + Date.now().toString(36) + "f",
    description: "Produced a 40-page commercial real estate market comparison report covering 5 metropolitan areas with demographic data, rental yields, vacancy rates, and investment recommendations. Complete with interactive maps and data tables.",
    isHighlight: false,
    upvoteCount: 41,
    viewCount: 950,
    language: "en",
    categoryIds: [9, 16, 17], // Commercial Real Estate, Research, Data
  },
  {
    title: "Sales Pipeline Analytics with CRM Integration",
    slug: "sales-pipeline-analytics-crm-" + Date.now().toString(36) + "g",
    description: "Connected to HubSpot CRM via Manus connectors to build a real-time sales pipeline dashboard. Tracks deal velocity, conversion rates, and revenue forecasting with automated weekly email reports to the sales team.",
    isHighlight: true,
    upvoteCount: 89,
    viewCount: 2400,
    language: "en",
    categoryIds: [6, 19, 17], // Sales, Connectors, Data
    sessionReplayUrl: "https://manus.im/share/example-8",
    deliverableUrl: "https://example.com/sales-dashboard",
  },
  {
    title: "Government Grant Application Assistant",
    slug: "government-grant-application-assistant-" + Date.now().toString(36) + "h",
    description: "Built a web application that helps small businesses find and apply for government grants. Manus researched available programs, built the matching algorithm, and created a step-by-step application wizard with document generation.",
    isHighlight: false,
    upvoteCount: 37,
    viewCount: 800,
    language: "en",
    categoryIds: [10, 12, 13], // Smart Cities, SMBs, Web Development
  },
  {
    title: "AI-Powered Customer Onboarding Flow",
    slug: "ai-powered-customer-onboarding-flow-" + Date.now().toString(36) + "i",
    description: "Designed and implemented a complete customer onboarding experience with personalized welcome emails, interactive product tours, and progress tracking. The entire flow was built as a web app with Manus Skills for automation.",
    isHighlight: false,
    upvoteCount: 48,
    viewCount: 1100,
    language: "en",
    categoryIds: [5, 13, 20], // Product Management, Web Development, Skills
  },
  {
    title: "社交媒体内容日历生成器",
    slug: "social-media-content-calendar-generator-" + Date.now().toString(36) + "j",
    description: "使用 Manus 为品牌创建了一个完整的社交媒体内容日历，包括30天的帖子计划、配图生成和文案撰写。支持微信、微博、小红书等多个平台的内容适配。",
    isHighlight: false,
    upvoteCount: 55,
    viewCount: 1300,
    language: "zh",
    categoryIds: [1, 18], // Marketing, Image & Video Generation
  },
  {
    title: "Startup Investor Research & Outreach Automation",
    slug: "startup-investor-research-outreach-" + Date.now().toString(36) + "k",
    description: "Automated investor research by scraping Crunchbase, LinkedIn, and portfolio pages to build a targeted list of 200 VCs with personalized outreach emails. Manus handled the research, data enrichment, and email drafting in a single session.",
    isHighlight: true,
    upvoteCount: 102,
    viewCount: 2600,
    language: "en",
    categoryIds: [7, 11, 15], // VC/PE, Startups, Mail Manus
  },
];

async function seed() {
  console.log("Starting seed...");

  // First, ensure we have a seed user
  const existingUsers = await db.select().from(users).limit(1);
  let submitterId;
  if (existingUsers.length > 0) {
    submitterId = existingUsers[0].id;
    console.log(`Using existing user id=${submitterId}`);
  } else {
    const result = await db.insert(users).values({
      openId: "seed-user-001",
      name: "Manus Community",
      email: "community@manus.im",
      role: "user",
    });
    submitterId = result[0].insertId;
    console.log(`Created seed user id=${submitterId}`);
  }

  for (let i = 0; i < sampleUseCases.length; i++) {
    const uc = sampleUseCases[i];
    console.log(`Seeding: ${uc.title}`);

    const result = await db.insert(useCases).values({
      title: uc.title,
      slug: uc.slug,
      description: uc.description,
      submitterId,
      status: "approved",
      isHighlight: uc.isHighlight,
      upvoteCount: uc.upvoteCount,
      viewCount: uc.viewCount,
      sessionReplayUrl: uc.sessionReplayUrl || null,
      deliverableUrl: uc.deliverableUrl || null,
      language: uc.language,
      consentToContact: true,
      approvedAt: new Date(),
    });

    const ucId = result[0].insertId;

    // Insert categories
    if (uc.categoryIds.length > 0) {
      await db.insert(useCaseCategories).values(
        uc.categoryIds.map(catId => ({ useCaseId: ucId, categoryId: catId }))
      );
    }

    // Insert 2 screenshots per use case
    const ssIdx1 = i % placeholderScreenshots.length;
    const ssIdx2 = (i + 1) % placeholderScreenshots.length;
    await db.insert(screenshots).values([
      { useCaseId: ucId, url: placeholderScreenshots[ssIdx1], fileKey: `seed/${ucId}/1.jpg`, sortOrder: 0 },
      { useCaseId: ucId, url: placeholderScreenshots[ssIdx2], fileKey: `seed/${ucId}/2.jpg`, sortOrder: 1 },
    ]);
  }

  console.log(`Seeded ${sampleUseCases.length} use cases successfully!`);
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
