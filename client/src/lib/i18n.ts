import { createContext, useContext } from "react";

export type Locale = "en" | "zh" | "ja" | "ko" | "pt-BR";

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "EN" },
  { code: "zh", label: "简体中文", flag: "中" },
  { code: "ja", label: "日本語", flag: "日" },
  { code: "ko", label: "한국어", flag: "한" },
  { code: "pt-BR", label: "Português (BR)", flag: "PT" },
];

type TranslationKeys = {
  // Nav & layout
  "nav.useCaseLibrary": string;
  "nav.submit": string;
  "nav.admin": string;
  "nav.login": string;
  "nav.logout": string;
  // Sidebar
  "sidebar.byJobFunction": string;
  "sidebar.byFeature": string;
  "sidebar.highlights": string;
  "sidebar.allUseCases": string;
  // Categories - Job Functions
  "cat.marketing": string;
  "cat.business-analysis": string;
  "cat.finance": string;
  "cat.advertising": string;
  "cat.product-management": string;
  "cat.sales": string;
  "cat.vc-pe": string;
  "cat.e-commerce": string;
  "cat.commercial-real-estate": string;
  "cat.smart-cities": string;
  "cat.startups": string;
  "cat.others-job": string;
  "cat.others-feature": string;
  // Categories - Features
  "cat.web-development": string;
  "cat.slides": string;
  "cat.research": string;
  "cat.mail-manus": string;
  "cat.data-spreadsheets": string;
  "cat.image-video-generation": string;
  "cat.connectors": string;
  "cat.skills": string;
  "cat.apps": string;
  "cat.scheduled-tasks": string;
  "cat.browser": string;
  // Gallery
  "gallery.search": string;
  "gallery.sortPopular": string;
  "gallery.sortNewest": string;
  "gallery.sortViews": string;
  "gallery.sortScore": string;
  "gallery.noResults": string;
  "gallery.noResultsDesc": string;
  "gallery.beFirst": string;
  "gallery.loadMore": string;
  "gallery.upvote": string;
  "gallery.views": string;
  "gallery.allCategories": string;
  "gallery.filterByCategory": string;
  // Detail
  "detail.sessionReplay": string;
  "detail.deliverable": string;
  "detail.share": string;
  "detail.copied": string;
  "detail.related": string;
  "detail.submittedBy": string;
  "detail.onlyManus": string;
  // Submit
  "submit.title": string;
  "submit.heading": string;
  "submit.desc": string;
  "submit.useCaseTitle": string;
  "submit.description": string;
  "submit.jobFunction": string;
  "submit.features": string;
  "submit.screenshots": string;
  "submit.screenshotHelp": string;
  "submit.sessionReplayUrl": string;
  "submit.deliverableUrl": string;
  "submit.language": string;
  "submit.consent": string;
  "submit.submitBtn": string;
  "submit.submitting": string;
  "submit.success": string;
  "submit.successDesc": string;
  "submit.backToGallery": string;
  // Submit guidelines
  "submit.guidelinesTitle": string;
  "submit.guidelinesIntro": string;
  "submit.guideStep1Title": string;
  "submit.guideStep1Desc": string;
  "submit.guideStep2Title": string;
  "submit.guideStep2Desc": string;
  "submit.guideStep3Title": string;
  "submit.guideStep3Desc": string;
  "submit.guideStep4Title": string;
  "submit.guideStep4Desc": string;
  "submit.titlePlaceholder": string;
  "submit.descPlaceholder": string;
  "submit.titleHint": string;
  "submit.descHint": string;
  "submit.sessionReplayHint": string;
  "submit.deliverableHint": string;
  // Admin
  "admin.title": string;
  "admin.submissions": string;
  "admin.pending": string;
  "admin.approved": string;
  "admin.rejected": string;
  "admin.all": string;
  "admin.approve": string;
  "admin.reject": string;
  "admin.rejectReason": string;
  "admin.highlight": string;
  "admin.categories": string;
  "admin.stats": string;
  "admin.totalSubmissions": string;
  "admin.totalUpvotes": string;
  "admin.totalViews": string;
  // Hero
  "hero.title1": string;
  "hero.title2": string;
  "hero.desc": string;
  "hero.submitCta": string;
  "hero.highlightsCta": string;
  "hero.highlightsCtaShort": string;
  "hero.useCases": string;
  "hero.categories": string;
  "hero.languages": string;
  // Sidebar extra
  "sidebar.learnMore": string;
  "sidebar.aboutPortal": string;
  "sidebar.trendingThisWeek": string;
  // Gallery extra
  "gallery.allUseCases": string;
  "gallery.searchResults": string;
  "gallery.allScores": string;
  "gallery.scoreAbove": string;
  "gallery.showingOf": string;
  "gallery.seenAll": string;
  // Sidebar leaderboard
  "sidebar.viewLeaderboard": string;
  "sidebar.useCaseCount": string;
  "sidebar.useCasesCount": string;
  "sidebar.likes": string;
  "sidebar.topContributors": string;
  "gallery.clearAll": string;
  "common.anonymous": string;
  // Welcome popup
  "welcome.title": string;
  "welcome.subtitle": string;
  "welcome.desc": string;
  "welcome.shareBtn": string;
  "welcome.teamBtn": string;
  "welcome.dismiss": string;
  "chatbot.title": string;
  "chatbot.desc": string;
  "chatbot.tooltip": string;
  "chatbot.placeholder": string;
  "chatbot.empty": string;
  "chatbot.suggest1": string;
  "chatbot.suggest2": string;
  "chatbot.suggest3": string;
  "chatbot.suggest4": string;
  "chatbot.suggest5": string;
  "chatbot.suggest6": string;
  "chatbot.askAi": string;
  "onboarding.title": string;
  "onboarding.step.upvote": string;
  "onboarding.step.search": string;
  "onboarding.step.submit": string;
  "onboarding.complete": string;
  "onboarding.toast.upvote": string;
  // Common
  "common.loading": string;
  "common.error": string;
  "common.save": string;
  "common.cancel": string;
  "common.close": string;
  "common.loginRequired": string;
  "common.loginRequiredDesc": string;
};

const translations: Record<Locale, TranslationKeys> = {
  en: {
    "nav.useCaseLibrary": "Awesome Manus Use Cases",
    "nav.submit": "Submit Use Case",
    "nav.admin": "Admin",
    "nav.login": "Sign In",
    "nav.logout": "Sign Out",
    "sidebar.byJobFunction": "By Job Function",
    "sidebar.byFeature": "By Feature",
    "sidebar.highlights": "Highlights",
    "sidebar.allUseCases": "All Use Cases",
    "cat.marketing": "Marketing",
    "cat.business-analysis": "Business Analysis",
    "cat.finance": "Finance",
    "cat.advertising": "Advertising",
    "cat.product-management": "Product Management",
    "cat.sales": "Sales",
    "cat.vc-pe": "VC / PE",
    "cat.e-commerce": "E-commerce",
    "cat.commercial-real-estate": "Commercial Real Estate",
    "cat.smart-cities": "Smart Cities",
    "cat.startups": "Startups",
    "cat.others-job": "Others",
    "cat.others-feature": "Others",
    "cat.web-development": "Web Development",
    "cat.slides": "Slides",
    "cat.research": "Research",
    "cat.mail-manus": "Mail Manus",
    "cat.data-spreadsheets": "Data & Spreadsheets",
    "cat.image-video-generation": "Image & Video Generation",
    "cat.connectors": "Connectors",
    "cat.skills": "Skills",
    "cat.apps": "Desktop & Mobile Apps",
    "cat.scheduled-tasks": "Scheduled Tasks",
    "cat.browser": "Browser",
    "gallery.search": "Search use cases by categories",
    "gallery.sortPopular": "Most Popular",
    "gallery.sortNewest": "Newest",
    "gallery.sortViews": "Most Viewed",
    "gallery.sortScore": "Top Rated",
    "gallery.noResults": "No use cases found",
    "gallery.noResultsDesc": "There are no use cases in this category yet.",
    "gallery.beFirst": "Be the first to submit one!",
    "gallery.loadMore": "Load More",
    "gallery.upvote": "Upvote",
    "gallery.views": "views",
    "gallery.allCategories": "All Categories",
    "gallery.filterByCategory": "Filter by Category",
    "detail.sessionReplay": "Session Replay",
    "detail.deliverable": "View Deliverable",
    "detail.share": "Share",
    "detail.copied": "Link copied!",
    "detail.related": "Related Use Cases",
    "detail.submittedBy": "Submitted by",
    "detail.onlyManus": "Highlights",
    "submit.title": "Submit a Use Case",
    "submit.heading": "Share Your Manus Story",
    "submit.desc": "Show the community what you've built with Manus. Your submission will be reviewed before publishing.",
    "submit.useCaseTitle": "Use Case Title",
    "submit.description": "Description",
    "submit.jobFunction": "Job Function / Industry",
    "submit.features": "Feature Categories",
    "submit.screenshots": "Screenshots",
    "submit.screenshotHelp": "Upload up to 5 images (PNG, JPG, WebP, GIF — max 5 MB each)",
    "submit.sessionReplayUrl": "Session Replay URL",
    "submit.deliverableUrl": "Final Deliverable URL (optional)",
    "submit.language": "Use Case Language",
    "submit.consent": "I'm open to being contacted for an interview about this use case",
    "submit.submitBtn": "Submit Use Case",
    "submit.submitting": "Submitting...",
    "submit.success": "Submission Received!",
    "submit.successDesc": "Your use case has been submitted and is under review. We'll notify you once it's approved.",
    "submit.backToGallery": "Back to Gallery",
    "submit.guidelinesTitle": "Submission Guidelines",
    "submit.guidelinesIntro": "Follow these steps to create a compelling submission that stands out.",
    "submit.guideStep1Title": "Write a clear, specific title",
    "submit.guideStep1Desc": "Describe what you built, not how. Good: \"Competitive Market Analysis Dashboard\". Avoid: \"My Manus Project\".",
    "submit.guideStep2Title": "Tell the full story",
    "submit.guideStep2Desc": "Explain the problem you solved, how Manus helped, and what the outcome was. Include specific results if possible.",
    "submit.guideStep3Title": "Add compelling screenshots",
    "submit.guideStep3Desc": "Show the final result first, then key steps. Crop to the relevant area — avoid full-desktop screenshots with toolbars.",
    "submit.guideStep4Title": "Include links when possible",
    "submit.guideStep4Desc": "A session replay or deliverable link lets reviewers verify your work and greatly increases approval chances.",
    "submit.titlePlaceholder": "e.g. Quarterly Financial Report Automation",
    "submit.descPlaceholder": "What problem did you solve?\nHow did Manus help?\nWhat was the outcome?",
    "submit.titleHint": "Be specific — mention the deliverable or outcome (max 200 characters)",
    "submit.descHint": "Tip: Describe the problem, your approach with Manus, and the results",
    "submit.sessionReplayHint": "Link to the Manus session replay",
    "submit.deliverableHint": "Link to the final output — website, document, dashboard, etc.",
    "admin.title": "Admin Dashboard",
    "admin.submissions": "Submissions",
    "admin.pending": "Pending",
    "admin.approved": "Approved",
    "admin.rejected": "Rejected",
    "admin.all": "All",
    "admin.approve": "Approve",
    "admin.reject": "Reject",
    "admin.rejectReason": "Reason for rejection",
    "admin.highlight": "Highlights",
    "admin.categories": "Categories",
    "admin.stats": "Statistics",
    "admin.totalSubmissions": "Total Submissions",
    "admin.totalUpvotes": "Total Upvotes",
    "admin.totalViews": "Total Views",
    "common.loading": "Loading...",
    "common.error": "Something went wrong",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.close": "Close",
    "common.loginRequired": "Sign In Required",
    "common.loginRequiredDesc": "Please sign in with your Manus account to continue.",
    "hero.title1": "Discover what people build",
    "hero.title2": "with Manus",
    "hero.desc": "A curated gallery of real-world use cases from the Manus community. Browse by industry, feature, or explore our highlighted picks.",
    "hero.submitCta": "Share your use case",
    "hero.highlightsCta": "Highlights",
    "hero.highlightsCtaShort": "Highlights",
    "hero.useCases": "Use Cases",
    "hero.categories": "Categories",
    "hero.languages": "Languages",
    "sidebar.learnMore": "Learn More",
    "sidebar.aboutPortal": "About This Portal",
    "sidebar.trendingThisWeek": "Trending This Week",
    "gallery.allUseCases": "All Use Cases",
    "gallery.searchResults": "Search Results",
    "gallery.allScores": "All Scores",
    "gallery.scoreAbove": "Score",
    "gallery.showingOf": "Showing {0} of {1} use cases",
    "gallery.seenAll": "You've seen all {0} use cases",
    "sidebar.viewLeaderboard": "View full leaderboard",
    "sidebar.useCaseCount": "use case",
    "sidebar.useCasesCount": "use cases",
    "sidebar.likes": "likes",
    "sidebar.topContributors": "Top Contributors",
    "gallery.clearAll": "Clear all",
    "common.anonymous": "Anonymous",
    "welcome.title": "Welcome to the Awesome Use Case Library!",
    "welcome.subtitle": "Discover what the Manus community is building",
    "welcome.desc": "Browse real-world use cases, get inspired, and share your own creations with the community.",
    "welcome.shareBtn": "Share Your Use Case",
    "welcome.teamBtn": "Learn About Team Plan",
    "welcome.dismiss": "Start Browsing",
    "chatbot.title": "AI Use Case Finder",
    "chatbot.desc": "Describe what you want to build and I'll find the best matching use cases.",
    "chatbot.tooltip": "Ask AI to find use cases",
    "chatbot.placeholder": "What do you want to build with Manus?",
    "chatbot.empty": "Ask me anything about Manus use cases",
    "chatbot.suggest1": "Marketing analytics dashboard",
    "chatbot.suggest2": "Real estate property analysis",
    "chatbot.suggest3": "Financial data visualization",
    "chatbot.suggest4": "E-commerce product video creation",
    "chatbot.suggest5": "Competitive intelligence research",
    "chatbot.suggest6": "Sales prospecting automation",
    "chatbot.askAi": "Ask AI",
    "onboarding.title": "Getting Started",
    "onboarding.step.upvote": "Upvote a use case",
    "onboarding.step.search": "Search for use cases",
    "onboarding.step.submit": "Submit your use case",
    "onboarding.complete": "All done!",
    "onboarding.toast.upvote": "Try upvoting a use case you like!",
  },
  zh: {
    "nav.useCaseLibrary": "Awesome Manus 用例",
    "nav.submit": "提交用例",
    "nav.admin": "管理后台",
    "nav.login": "登录",
    "nav.logout": "退出",
    "sidebar.byJobFunction": "按职能/行业",
    "sidebar.byFeature": "按功能",
    "sidebar.highlights": "精选",
    "sidebar.allUseCases": "全部用例",
    "cat.marketing": "市场营销",
    "cat.business-analysis": "商业分析",
    "cat.finance": "金融",
    "cat.advertising": "广告",
    "cat.product-management": "产品管理",
    "cat.sales": "销售",
    "cat.vc-pe": "风投/私募",
    "cat.e-commerce": "电子商务",
    "cat.commercial-real-estate": "商业地产",
    "cat.smart-cities": "智慧城市",
    "cat.startups": "创业公司",
    "cat.others-job": "其他",
    "cat.others-feature": "其他",
    "cat.web-development": "网站开发",
    "cat.slides": "演示文稿",
    "cat.research": "研究",
    "cat.mail-manus": "Mail Manus",
    "cat.data-spreadsheets": "数据与表格",
    "cat.image-video-generation": "图像与视频生成",
    "cat.connectors": "连接器",
    "cat.skills": "技能",
    "cat.apps": "桌面和移动应用",
    "cat.scheduled-tasks": "定时任务",
    "cat.browser": "浏览器",
    "gallery.search": "按分类搜索用例",
    "gallery.sortPopular": "最受欢迎",
    "gallery.sortNewest": "最新",
    "gallery.sortViews": "最多浏览",
    "gallery.sortScore": "最高评分",
    "gallery.noResults": "暂无用例",
    "gallery.noResultsDesc": "该分类下暂无用例。",
    "gallery.beFirst": "成为第一个提交者！",
    "gallery.loadMore": "加载更多",
    "gallery.upvote": "点赞",
    "gallery.views": "浏览",
    "gallery.allCategories": "所有分类",
    "gallery.filterByCategory": "按分类筛选",
    "detail.sessionReplay": "会话回放",
    "detail.deliverable": "查看成果",
    "detail.share": "分享",
    "detail.copied": "链接已复制！",
    "detail.related": "相关用例",
    "detail.submittedBy": "提交者",
    "detail.onlyManus": "精选",
    "submit.title": "提交用例",
    "submit.heading": "分享你的 Manus 故事",
    "submit.desc": "向社区展示你用 Manus 构建的成果。提交后将经过审核才会发布。",
    "submit.useCaseTitle": "用例标题",
    "submit.description": "描述",
    "submit.jobFunction": "职能/行业",
    "submit.features": "功能分类",
    "submit.screenshots": "截图",
    "submit.screenshotHelp": "最多上传5张图片（PNG、JPG、WebP、GIF — 每张最大5MB）",
    "submit.sessionReplayUrl": "会话回放链接",
    "submit.deliverableUrl": "最终成果链接（可选）",
    "submit.language": "用例语言",
    "submit.consent": "我愿意就此用例接受采访联系",
    "submit.submitBtn": "提交用例",
    "submit.submitting": "提交中...",
    "submit.success": "提交成功！",
    "submit.successDesc": "您的用例已提交，正在审核中。审核通过后会通知您。",
    "submit.backToGallery": "返回用例库",
    "submit.guidelinesTitle": "提交指南",
    "submit.guidelinesIntro": "按照以下步骤创建引人注目的提交。",
    "submit.guideStep1Title": "写一个清晰、具体的标题",
    "submit.guideStep1Desc": "描述你构建了什么，而非如何构建。好的例子：\"竞争市场分析仪表盘\"。避免：\"我的 Manus 项目\"。",
    "submit.guideStep2Title": "讲述完整的故事",
    "submit.guideStep2Desc": "说明你解决了什么问题、Manus 如何帮助你、以及最终成果。尽量包含具体数据。",
    "submit.guideStep3Title": "添加有说服力的截图",
    "submit.guideStep3Desc": "先展示最终成果，再展示关键步骤。裁剪到相关区域，避免包含工具栏的全屏截图。",
    "submit.guideStep4Title": "尽量包含链接",
    "submit.guideStep4Desc": "会话回放或成果链接能让审核者验证你的工作，大大提高通过率。",
    "submit.titlePlaceholder": "例如：季度财务报告自动化",
    "submit.descPlaceholder": "你解决了什么问题？\nManus 如何帮助你？\n最终成果是什么？",
    "submit.titleHint": "请具体说明——提及成果或产出（最多200字符）",
    "submit.descHint": "提示：描述问题、你使用 Manus 的方法和结果",
    "submit.sessionReplayHint": "Manus 会话回放链接",
    "submit.deliverableHint": "最终产出链接——网站、文档、仪表盘等",
    "admin.title": "管理后台",
    "admin.submissions": "提交列表",
    "admin.pending": "待审核",
    "admin.approved": "已通过",
    "admin.rejected": "已拒绝",
    "admin.all": "全部",
    "admin.approve": "通过",
    "admin.reject": "拒绝",
    "admin.rejectReason": "拒绝原因",
    "admin.highlight": "精选",
    "admin.categories": "分类",
    "admin.stats": "统计",
    "admin.totalSubmissions": "总提交数",
    "admin.totalUpvotes": "总点赞数",
    "admin.totalViews": "总浏览数",
    "common.loading": "加载中...",
    "common.error": "出了点问题",
    "common.save": "保存",
    "common.cancel": "取消",
    "common.close": "关闭",
    "common.loginRequired": "需要登录",
    "common.loginRequiredDesc": "请使用 Manus 账号登录以继续。",
    "hero.title1": "发现人们用 Manus",
    "hero.title2": "构建的作品",
    "hero.desc": "来自 Manus 社区的真实用例精选集。按行业、功能浏览，或探索我们的精选推荐。",
    "hero.submitCta": "分享你的用例",
    "hero.highlightsCta": "精选",
    "hero.highlightsCtaShort": "精选",
    "hero.useCases": "用例",
    "hero.categories": "分类",
    "hero.languages": "语言",
    "sidebar.learnMore": "了解更多",
    "sidebar.aboutPortal": "关于本站",
    "sidebar.trendingThisWeek": "本周热门",
    "gallery.allUseCases": "全部用例",
    "gallery.searchResults": "搜索结果",
    "gallery.allScores": "所有评分",
    "gallery.scoreAbove": "分以上",
    "gallery.showingOf": "显示 {1} 个用例中的 {0} 个",
    "gallery.seenAll": "已浏览全部 {0} 个用例",
    "sidebar.viewLeaderboard": "查看完整排行榜",
    "sidebar.useCaseCount": "个用例",
    "sidebar.useCasesCount": "个用例",
    "sidebar.likes": "个赞",
    "sidebar.topContributors": "最佳贡献者",
    "gallery.clearAll": "清除全部",
    "common.anonymous": "匿名",
    "welcome.title": "欢迎来到 Awesome 用例库！",
    "welcome.subtitle": "探索 Manus 社区正在构建的精彩作品",
    "welcome.desc": "浏览真实用例，获取灵感，并与社区分享你的创作。",
    "welcome.shareBtn": "分享你的用例",
    "welcome.teamBtn": "了解团队版",
    "welcome.dismiss": "开始浏览",
    "chatbot.title": "AI 用例发现",
    "chatbot.desc": "描述你想构建的内容，我会为你找到最匹配的用例。",
    "chatbot.tooltip": "让 AI 帮你找用例",
    "chatbot.placeholder": "你想用 Manus 构建什么？",
    "chatbot.empty": "问我任何关于 Manus 用例的问题",
    "chatbot.suggest1": "营销分析仪表板",
    "chatbot.suggest2": "房地产物业分析",
    "chatbot.suggest3": "金融数据可视化",
    "chatbot.suggest4": "电商产品视频制作",
    "chatbot.suggest5": "竞争情报研究",
    "chatbot.suggest6": "销售线索自动化",
    "chatbot.askAi": "问 AI",
    "onboarding.title": "开始使用",
    "onboarding.step.upvote": "为用例点赞",
    "onboarding.step.search": "搜索用例",
    "onboarding.step.submit": "提交你的用例",
    "onboarding.complete": "全部完成！",
    "onboarding.toast.upvote": "试试为你喜欢的用例点赞吧！",
  },
  ja: {
    "nav.useCaseLibrary": "Awesome Manus ユースケース",
    "nav.submit": "ユースケースを投稿",
    "nav.admin": "管理画面",
    "nav.login": "ログイン",
    "nav.logout": "ログアウト",
    "sidebar.byJobFunction": "職種・業界別",
    "sidebar.byFeature": "機能別",
    "sidebar.highlights": "注目",
    "sidebar.allUseCases": "すべてのユースケース",
    "cat.marketing": "マーケティング",
    "cat.business-analysis": "ビジネス分析",
    "cat.finance": "金融",
    "cat.advertising": "広告",
    "cat.product-management": "プロダクト管理",
    "cat.sales": "営業",
    "cat.vc-pe": "VC / PE",
    "cat.e-commerce": "Eコマース",
    "cat.commercial-real-estate": "商業不動産",
    "cat.smart-cities": "スマートシティ",
    "cat.startups": "スタートアップ",
    "cat.others-job": "その他",
    "cat.others-feature": "その他",
    "cat.web-development": "Web開発",
    "cat.slides": "スライド",
    "cat.research": "リサーチ",
    "cat.mail-manus": "Mail Manus",
    "cat.data-spreadsheets": "データ＆スプレッドシート",
    "cat.image-video-generation": "画像・動画生成",
    "cat.connectors": "コネクター",
    "cat.skills": "スキル",
    "cat.apps": "デスクトップ＆モバイルアプリ",
    "cat.scheduled-tasks": "スケジュールタスク",
    "cat.browser": "ブラウザ",
    "gallery.search": "カテゴリでユースケースを検索",
    "gallery.sortPopular": "人気順",
    "gallery.sortNewest": "新着順",
    "gallery.sortViews": "閲覧数順",
    "gallery.sortScore": "高評価順",
    "gallery.noResults": "ユースケースが見つかりません",
    "gallery.noResultsDesc": "このカテゴリにはまだユースケースがありません。",
    "gallery.beFirst": "最初の投稿者になりましょう！",
    "gallery.loadMore": "もっと見る",
    "gallery.upvote": "いいね",
    "gallery.views": "閲覧",
    "gallery.allCategories": "すべてのカテゴリ",
    "gallery.filterByCategory": "カテゴリで絞り込む",
    "detail.sessionReplay": "セッションリプレイ",
    "detail.deliverable": "成果物を見る",
    "detail.share": "共有",
    "detail.copied": "リンクをコピーしました！",
    "detail.related": "関連ユースケース",
    "detail.submittedBy": "投稿者",
    "detail.onlyManus": "注目",
    "submit.title": "ユースケースを投稿",
    "submit.heading": "あなたのManusストーリーを共有",
    "submit.desc": "Manusで作ったものをコミュニティに紹介しましょう。投稿は公開前に審査されます。",
    "submit.useCaseTitle": "ユースケースタイトル",
    "submit.description": "説明",
    "submit.jobFunction": "職種・業界",
    "submit.features": "機能カテゴリ",
    "submit.screenshots": "スクリーンショット",
    "submit.screenshotHelp": "最大5枚（PNG、JPG、WebP、GIF — 各5MBまで）",
    "submit.sessionReplayUrl": "セッションリプレイURL",
    "submit.deliverableUrl": "成果物URL（任意）",
    "submit.language": "ユースケースの言語",
    "submit.consent": "このユースケースについてインタビューのご連絡をいただけると嬉しいです",
    "submit.submitBtn": "投稿する",
    "submit.submitting": "投稿中...",
    "submit.success": "投稿完了！",
    "submit.successDesc": "ユースケースが投稿されました。審査後に通知いたします。",
    "submit.backToGallery": "ギャラリーに戻る",
    "submit.guidelinesTitle": "投稿ガイドライン",
    "submit.guidelinesIntro": "以下のステップに従って、魅力的な投稿を作成しましょう。",
    "submit.guideStep1Title": "明確で具体的なタイトルを書く",
    "submit.guideStep1Desc": "何を作ったかを説明しましょう。良い例：\"競合市場分析ダッシュボード\"。避ける例：\"私のManusプロジェクト\"。",
    "submit.guideStep2Title": "ストーリー全体を伝える",
    "submit.guideStep2Desc": "解決した問題、Manusがどう役立ったか、結果を説明しましょう。可能なら具体的な数値も含めてください。",
    "submit.guideStep3Title": "説得力のあるスクリーンショットを追加",
    "submit.guideStep3Desc": "最終結果を最初に、次に重要なステップを表示。関連部分にトリミングし、ツールバー付きのフルスクリーンは避けましょう。",
    "submit.guideStep4Title": "可能な限りリンクを含める",
    "submit.guideStep4Desc": "セッションリプレイや成果物のリンクがあると、審査者が確認でき、承認率が大幅に上がります。",
    "submit.titlePlaceholder": "例：四半期財務レポート自動化",
    "submit.descPlaceholder": "どんな問題を解決しましたか？\nManusがどう役立ちましたか？\n結果はどうでしたか？",
    "submit.titleHint": "具体的に——成果物や結果を記載（最大200文字）",
    "submit.descHint": "ヒント：問題、Manusでのアプローチ、結果を説明しましょう",
    "submit.sessionReplayHint": "Manusセッションリプレイリンク",
    "submit.deliverableHint": "最終成果物のリンク——ウェブサイト、ドキュメント、ダッシュボードなど",
    "admin.title": "管理画面",
    "admin.submissions": "投稿一覧",
    "admin.pending": "審査待ち",
    "admin.approved": "承認済み",
    "admin.rejected": "却下",
    "admin.all": "すべて",
    "admin.approve": "承認",
    "admin.reject": "却下",
    "admin.rejectReason": "却下理由",
    "admin.highlight": "Manusだけの事例",
    "admin.categories": "カテゴリ",
    "admin.stats": "統計",
    "admin.totalSubmissions": "総投稿数",
    "admin.totalUpvotes": "総いいね数",
    "admin.totalViews": "総閲覧数",
    "common.loading": "読み込み中...",
    "common.error": "エラーが発生しました",
    "common.save": "保存",
    "common.cancel": "キャンセル",
    "common.close": "閉じる",
    "common.loginRequired": "ログインが必要です",
    "common.loginRequiredDesc": "続けるにはManusアカウントでログインしてください。",
    "hero.title1": "Manusで人々が",
    "hero.title2": "何を作るか発見しよう",
    "hero.desc": "Manusコミュニティからの実際のユースケースを厳選したギャラリー。業界、機能別に閲覧するか、おすすめの精選ピックを探索しましょう。",
    "hero.submitCta": "ユースケースを共有",
    "hero.highlightsCta": "注目",
    "hero.highlightsCtaShort": "注目",
    "hero.useCases": "ユースケース",
    "hero.categories": "カテゴリ",
    "hero.languages": "言語",
    "sidebar.learnMore": "詳しく見る",
    "sidebar.aboutPortal": "このポータルについて",
    "sidebar.trendingThisWeek": "今週のトレンド",
    "gallery.allUseCases": "すべてのユースケース",
    "gallery.searchResults": "検索結果",
    "gallery.allScores": "すべてのスコア",
    "gallery.scoreAbove": "以上",
    "gallery.showingOf": "{1}件中{0}件を表示",
    "gallery.seenAll": "全{0}件を表示しました",
    "sidebar.viewLeaderboard": "全ランキングを見る",
    "sidebar.useCaseCount": "件",
    "sidebar.useCasesCount": "件",
    "sidebar.likes": "いいね",
    "sidebar.topContributors": "トップコントリビューター",
    "gallery.clearAll": "すべてクリア",
    "common.anonymous": "匿名",
    "welcome.title": "Awesome ユースケースライブラリへようこそ！",
    "welcome.subtitle": "Manus コミュニティが構築しているものを発見",
    "welcome.desc": "実際のユースケースを閲覧し、インスピレーションを得て、あなたの作品をコミュニティと共有しましょう。",
    "welcome.shareBtn": "ユースケースを共有",
    "welcome.teamBtn": "チームプランについて",
    "welcome.dismiss": "ブラウジングを開始",
    "chatbot.title": "AI ユースケース検索",
    "chatbot.desc": "作りたいものを説明してください。最適なユースケースを見つけます。",
    "chatbot.tooltip": "AIにユースケースを探してもらう",
    "chatbot.placeholder": "Manusで何を作りたいですか？",
    "chatbot.empty": "Manusのユースケースについて何でも聞いてください",
    "chatbot.suggest1": "マーケティング分析ダッシュボード",
    "chatbot.suggest2": "不動産物件分析",
    "chatbot.suggest3": "金融データの可視化",
    "chatbot.suggest4": "EC商品動画の作成",
    "chatbot.suggest5": "競合インテリジェンス調査",
    "chatbot.suggest6": "営業リード自動化",
    "chatbot.askAi": "AIに聞く",
    "onboarding.title": "はじめよう",
    "onboarding.step.upvote": "ユースケースに投票",
    "onboarding.step.search": "ユースケースを検索",
    "onboarding.step.submit": "ユースケースを提出",
    "onboarding.complete": "完了！",
    "onboarding.toast.upvote": "気に入ったユースケースに投票してみましょう！",
  },
  ko: {
    "nav.useCaseLibrary": "Awesome Manus 유스케이스",
    "nav.submit": "유스케이스 제출",
    "nav.admin": "관리자",
    "nav.login": "로그인",
    "nav.logout": "로그아웃",
    "sidebar.byJobFunction": "직무/산업별",
    "sidebar.byFeature": "기능별",
    "sidebar.highlights": "하이라이트",
    "sidebar.allUseCases": "모든 유스케이스",
    "cat.marketing": "마케팅",
    "cat.business-analysis": "비즈니스 분석",
    "cat.finance": "금융",
    "cat.advertising": "광고",
    "cat.product-management": "제품 관리",
    "cat.sales": "영업",
    "cat.vc-pe": "VC / PE",
    "cat.e-commerce": "이커머스",
    "cat.commercial-real-estate": "상업용 부동산",
    "cat.smart-cities": "스마트 시티",
    "cat.startups": "스타트업",
    "cat.others-job": "기타",
    "cat.others-feature": "기타",
    "cat.web-development": "웹 개발",
    "cat.slides": "슬라이드",
    "cat.research": "리서치",
    "cat.mail-manus": "Mail Manus",
    "cat.data-spreadsheets": "데이터 & 스프레드시트",
    "cat.image-video-generation": "이미지 & 영상 생성",
    "cat.connectors": "커넥터",
    "cat.skills": "스킬",
    "cat.apps": "데스크톱 및 모바일 앱",
    "cat.scheduled-tasks": "예약 작업",
    "cat.browser": "브라우저",
    "gallery.search": "카테고리별 유스케이스 검색",
    "gallery.sortPopular": "인기순",
    "gallery.sortNewest": "최신순",
    "gallery.sortViews": "조회순",
    "gallery.sortScore": "최고 평점",
    "gallery.noResults": "유스케이스가 없습니다",
    "gallery.noResultsDesc": "이 카테고리에는 아직 유스케이스가 없습니다.",
    "gallery.beFirst": "첫 번째 제출자가 되어보세요!",
    "gallery.loadMore": "더 보기",
    "gallery.upvote": "추천",
    "gallery.views": "조회",
    "gallery.allCategories": "모든 카테고리",
    "gallery.filterByCategory": "카테고리 필터",
    "detail.sessionReplay": "세션 리플레이",
    "detail.deliverable": "결과물 보기",
    "detail.share": "공유",
    "detail.copied": "링크가 복사되었습니다!",
    "detail.related": "관련 유스케이스",
    "detail.submittedBy": "제출자",
    "detail.onlyManus": "하이라이트",
    "submit.title": "유스케이스 제출",
    "submit.heading": "당신의 Manus 이야기를 공유하세요",
    "submit.desc": "Manus로 만든 것을 커뮤니티에 보여주세요. 제출 후 검토를 거쳐 게시됩니다.",
    "submit.useCaseTitle": "유스케이스 제목",
    "submit.description": "설명",
    "submit.jobFunction": "직무/산업",
    "submit.features": "기능 카테고리",
    "submit.screenshots": "스크린샷",
    "submit.screenshotHelp": "최대 5장 (PNG, JPG, WebP, GIF — 각 5MB 이하)",
    "submit.sessionReplayUrl": "세션 리플레이 URL",
    "submit.deliverableUrl": "최종 결과물 URL (선택)",
    "submit.language": "유스케이스 언어",
    "submit.consent": "이 유스케이스에 대한 인터뷰 연락을 환영합니다",
    "submit.submitBtn": "제출하기",
    "submit.submitting": "제출 중...",
    "submit.success": "제출 완료!",
    "submit.successDesc": "유스케이스가 제출되었습니다. 검토 후 알려드리겠습니다.",
    "submit.backToGallery": "갤러리로 돌아가기",
    "submit.guidelinesTitle": "제출 가이드라인",
    "submit.guidelinesIntro": "다음 단계를 따라 매력적인 제출을 만들어 보세요.",
    "submit.guideStep1Title": "명확하고 구체적인 제목 작성",
    "submit.guideStep1Desc": "무엇을 만들었는지 설명하세요. 좋은 예: \"경쟁 시장 분석 대시보드\". 피해야 할 예: \"내 Manus 프로젝트\"",
    "submit.guideStep2Title": "전체 스토리 전달",
    "submit.guideStep2Desc": "해결한 문제, Manus가 어떻게 도움이 되었는지, 결과를 설명하세요. 가능하면 구체적인 수치를 포함하세요.",
    "submit.guideStep3Title": "설득력 있는 스크린샷 추가",
    "submit.guideStep3Desc": "최종 결과를 먼저 보여주고, 그 다음 핵심 단계를 보여주세요. 관련 부분만 자르고 툴바 포함 전체 화면은 피하세요.",
    "submit.guideStep4Title": "가능한 한 링크 포함",
    "submit.guideStep4Desc": "세션 리플레이나 결과물 링크가 있으면 검토자가 확인할 수 있어 승인률이 크게 높아집니다.",
    "submit.titlePlaceholder": "예: 분기 재무 보고서 자동화",
    "submit.descPlaceholder": "어떤 문제를 해결했나요?\nManus가 어떻게 도움이 되었나요?\n결과는 어떠나요?",
    "submit.titleHint": "구체적으로——결과물이나 성과를 언급 (최대 200자)",
    "submit.descHint": "팁: 문제, Manus를 활용한 방법, 결과를 설명하세요",
    "submit.sessionReplayHint": "Manus 세션 리플레이 링크",
    "submit.deliverableHint": "최종 결과물 링크——웹사이트, 문서, 대시보드 등",
    "admin.title": "관리자 대시보드",
    "admin.submissions": "제출 목록",
    "admin.pending": "대기 중",
    "admin.approved": "승인됨",
    "admin.rejected": "거부됨",
    "admin.all": "전체",
    "admin.approve": "승인",
    "admin.reject": "거부",
    "admin.rejectReason": "거부 사유",
    "admin.highlight": "Manus만의 사례",
    "admin.categories": "카테고리",
    "admin.stats": "통계",
    "admin.totalSubmissions": "총 제출 수",
    "admin.totalUpvotes": "총 추천 수",
    "admin.totalViews": "총 조회 수",
    "common.loading": "로딩 중...",
    "common.error": "문제가 발생했습니다",
    "common.save": "저장",
    "common.cancel": "취소",
    "common.close": "닫기",
    "common.loginRequired": "로그인 필요",
    "common.loginRequiredDesc": "계속하려면 Manus 계정으로 로그인해 주세요.",
    "hero.title1": "사람들이 Manus로",
    "hero.title2": "무엇을 만드는지 발견하세요",
    "hero.desc": "Manus 커뮤니티의 실제 사용 사례를 엄선한 갤러리입니다. 산업별, 기능별로 탐색하거나 엄선된 추천 사례를 확인하세요.",
    "hero.submitCta": "사용 사례 공유",
    "hero.highlightsCta": "하이라이트",
    "hero.highlightsCtaShort": "하이라이트",
    "hero.useCases": "사용 사례",
    "hero.categories": "카테고리",
    "hero.languages": "언어",
    "sidebar.learnMore": "더 알아보기",
    "sidebar.aboutPortal": "이 포털 소개",
    "sidebar.trendingThisWeek": "이번 주 트렌드",
    "gallery.allUseCases": "모든 유스케이스",
    "gallery.searchResults": "검색 결과",
    "gallery.allScores": "모든 점수",
    "gallery.scoreAbove": "점 이상",
    "gallery.showingOf": "{1}개 중 {0}개 표시",
    "gallery.seenAll": "전체 {0}개를 모두 확인했습니다",
    "sidebar.viewLeaderboard": "전체 리더보드 보기",
    "sidebar.useCaseCount": "건",
    "sidebar.useCasesCount": "건",
    "sidebar.likes": "추천",
    "sidebar.topContributors": "톱 기여자",
    "gallery.clearAll": "모두 지우기",
    "common.anonymous": "익명",
    "welcome.title": "Awesome 유스케이스 라이브러리에 오신 것을 환영합니다!",
    "welcome.subtitle": "Manus 커뮤니티가 만들고 있는 것을 발견하세요",
    "welcome.desc": "실제 유스케이스를 탐색하고, 영감을 얻고, 커뮤니티와 여러분의 창작물을 공유하세요.",
    "welcome.shareBtn": "유스케이스 공유",
    "welcome.teamBtn": "팀 플랜 알아보기",
    "welcome.dismiss": "둘러보기 시작",
    "chatbot.title": "AI 유스케이스 찾기",
    "chatbot.desc": "만들고 싶은 것을 설명하면 가장 적합한 유스케이스를 찾아드립니다.",
    "chatbot.tooltip": "AI에게 유스케이스 찾기",
    "chatbot.placeholder": "Manus로 무엇을 만들고 싶으세요?",
    "chatbot.empty": "Manus 유스케이스에 대해 무엇이든 물어보세요",
    "chatbot.suggest1": "마케팅 분석 대시보드",
    "chatbot.suggest2": "부동산 물건 분석",
    "chatbot.suggest3": "금융 데이터 시각화",
    "chatbot.suggest4": "이커머스 제품 영상 제작",
    "chatbot.suggest5": "경쟁 인텔리전스 리서치",
    "chatbot.suggest6": "영업 리드 자동화",
    "chatbot.askAi": "AI에게 물어보기",
    "onboarding.title": "시작하기",
    "onboarding.step.upvote": "사용 사례에 투표",
    "onboarding.step.search": "사용 사례 검색",
    "onboarding.step.submit": "사용 사례 제출",
    "onboarding.complete": "모두 완료!",
    "onboarding.toast.upvote": "마음에 드는 사용 사례에 투표해 보세요!",
  },
  "pt-BR": {
    "nav.useCaseLibrary": "Awesome Manus Use Cases",
    "nav.submit": "Enviar Caso de Uso",
    "nav.admin": "Admin",
    "nav.login": "Entrar",
    "nav.logout": "Sair",
    "sidebar.byJobFunction": "Por Função/Indústria",
    "sidebar.byFeature": "Por Recurso",
    "sidebar.highlights": "Destaques",
    "sidebar.allUseCases": "Todos os Casos de Uso",
    "cat.marketing": "Marketing",
    "cat.business-analysis": "Análise de Negócios",
    "cat.finance": "Finanças",
    "cat.advertising": "Publicidade",
    "cat.product-management": "Gestão de Produto",
    "cat.sales": "Vendas",
    "cat.vc-pe": "VC / PE",
    "cat.e-commerce": "E-commerce",
    "cat.commercial-real-estate": "Imóveis Comerciais",
    "cat.smart-cities": "Cidades Inteligentes",
    "cat.startups": "Startups",
    "cat.others-job": "Outros",
    "cat.others-feature": "Outros",
    "cat.web-development": "Desenvolvimento Web",
    "cat.slides": "Slides",
    "cat.research": "Pesquisa",
    "cat.mail-manus": "Mail Manus",
    "cat.data-spreadsheets": "Dados e Planilhas",
    "cat.image-video-generation": "Geração de Imagem e Vídeo",
    "cat.connectors": "Conectores",
    "cat.skills": "Skills",
    "cat.apps": "Apps Desktop e Mobile",
    "cat.scheduled-tasks": "Tarefas Agendadas",
    "cat.browser": "Navegador",
    "gallery.search": "Pesquisar casos de uso por categorias",
    "gallery.sortPopular": "Mais Popular",
    "gallery.sortNewest": "Mais Recente",
    "gallery.sortViews": "Mais Visualizado",
    "gallery.sortScore": "Melhor Avaliado",
    "gallery.noResults": "Nenhum caso de uso encontrado",
    "gallery.noResultsDesc": "Ainda não há casos de uso nesta categoria.",
    "gallery.beFirst": "Seja o primeiro a enviar!",
    "gallery.loadMore": "Carregar Mais",
    "gallery.upvote": "Votar",
    "gallery.views": "visualizações",
    "gallery.allCategories": "Todas as Categorias",
    "gallery.filterByCategory": "Filtrar por Categoria",
    "detail.sessionReplay": "Replay da Sessão",
    "detail.deliverable": "Ver Entrega",
    "detail.share": "Compartilhar",
    "detail.copied": "Link copiado!",
    "detail.related": "Casos de Uso Relacionados",
    "detail.submittedBy": "Enviado por",
    "detail.onlyManus": "Destaques",
    "submit.title": "Enviar Caso de Uso",
    "submit.heading": "Compartilhe sua História com Manus",
    "submit.desc": "Mostre à comunidade o que você construiu com Manus. Sua submissão será revisada antes da publicação.",
    "submit.useCaseTitle": "Título do Caso de Uso",
    "submit.description": "Descrição",
    "submit.jobFunction": "Função/Indústria",
    "submit.features": "Categorias de Recurso",
    "submit.screenshots": "Capturas de Tela",
    "submit.screenshotHelp": "Até 5 imagens (PNG, JPG, WebP, GIF — máx. 5 MB cada)",
    "submit.sessionReplayUrl": "URL do Replay da Sessão",
    "submit.deliverableUrl": "URL da Entrega Final (opcional)",
    "submit.language": "Idioma do Caso de Uso",
    "submit.consent": "Estou aberto(a) a ser contatado(a) para uma entrevista sobre este caso de uso",
    "submit.submitBtn": "Enviar Caso de Uso",
    "submit.submitting": "Enviando...",
    "submit.success": "Submissão Recebida!",
    "submit.successDesc": "Seu caso de uso foi enviado e está em revisão. Notificaremos quando for aprovado.",
    "submit.backToGallery": "Voltar à Galeria",
    "submit.guidelinesTitle": "Diretrizes de Submissão",
    "submit.guidelinesIntro": "Siga estes passos para criar uma submissão atraente.",
    "submit.guideStep1Title": "Escreva um título claro e específico",
    "submit.guideStep1Desc": "Descreva o que você construiu. Bom exemplo: \"Painel de Análise de Mercado Competitivo\". Evite: \"Meu Projeto Manus\".",
    "submit.guideStep2Title": "Conte a história completa",
    "submit.guideStep2Desc": "Explique o problema resolvido, como o Manus ajudou e qual foi o resultado. Inclua dados específicos se possível.",
    "submit.guideStep3Title": "Adicione capturas de tela convincentes",
    "submit.guideStep3Desc": "Mostre o resultado final primeiro, depois os passos-chave. Recorte para a área relevante — evite capturas de tela inteiras com barras de ferramentas.",
    "submit.guideStep4Title": "Inclua links quando possível",
    "submit.guideStep4Desc": "Um replay de sessão ou link de entrega permite que os revisores verifiquem seu trabalho e aumenta muito as chances de aprovação.",
    "submit.titlePlaceholder": "ex: Automação de Relatório Financeiro Trimestral",
    "submit.descPlaceholder": "Qual problema você resolveu?\nComo o Manus ajudou?\nQual foi o resultado?",
    "submit.titleHint": "Seja específico — mencione a entrega ou resultado (máx. 200 caracteres)",
    "submit.descHint": "Dica: Descreva o problema, sua abordagem com Manus e os resultados",
    "submit.sessionReplayHint": "Link do replay da sessão Manus",
    "submit.deliverableHint": "Link da entrega final — site, documento, painel, etc.",
    "admin.title": "Painel Admin",
    "admin.submissions": "Submissões",
    "admin.pending": "Pendente",
    "admin.approved": "Aprovado",
    "admin.rejected": "Rejeitado",
    "admin.all": "Todos",
    "admin.approve": "Aprovar",
    "admin.reject": "Rejeitar",
    "admin.rejectReason": "Motivo da rejeição",
    "admin.highlight": "Só Possível com Manus",
    "admin.categories": "Categorias",
    "admin.stats": "Estatísticas",
    "admin.totalSubmissions": "Total de Submissões",
    "admin.totalUpvotes": "Total de Votos",
    "admin.totalViews": "Total de Visualizações",
    "common.loading": "Carregando...",
    "common.error": "Algo deu errado",
    "common.save": "Salvar",
    "common.cancel": "Cancelar",
    "common.close": "Fechar",
    "common.loginRequired": "Login Necessário",
    "common.loginRequiredDesc": "Faça login com sua conta Manus para continuar.",
    "hero.title1": "Descubra o que as pessoas",
    "hero.title2": "constroem com o Manus",
    "hero.desc": "Uma galeria curada de casos de uso reais da comunidade Manus. Navegue por setor, recurso ou explore nossas escolhas em destaque.",
    "hero.submitCta": "Compartilhe seu caso de uso",
    "hero.highlightsCta": "Destaques",
    "hero.highlightsCtaShort": "Destaques",
    "hero.useCases": "Casos de Uso",
    "hero.categories": "Categorias",
    "hero.languages": "Idiomas",
    "sidebar.learnMore": "Saiba Mais",
    "sidebar.aboutPortal": "Sobre Este Portal",
    "sidebar.trendingThisWeek": "Tendências da Semana",
    "gallery.allUseCases": "Todos os Casos de Uso",
    "gallery.searchResults": "Resultados da Pesquisa",
    "gallery.allScores": "Todas as Pontuações",
    "gallery.scoreAbove": "Pontuação",
    "gallery.showingOf": "Mostrando {0} de {1} casos de uso",
    "gallery.seenAll": "Você viu todos os {0} casos de uso",
    "sidebar.viewLeaderboard": "Ver ranking completo",
    "sidebar.useCaseCount": "caso de uso",
    "sidebar.useCasesCount": "casos de uso",
    "sidebar.likes": "votos",
    "sidebar.topContributors": "Maiores Contribuidores",
    "gallery.clearAll": "Limpar tudo",
    "common.anonymous": "Anônimo",
    "welcome.title": "Bem-vindo à Biblioteca de Casos de Uso!",
    "welcome.subtitle": "Descubra o que a comunidade Manus está construindo",
    "welcome.desc": "Navegue por casos de uso reais, inspire-se e compartilhe suas criações com a comunidade.",
    "welcome.shareBtn": "Compartilhe Seu Caso de Uso",
    "welcome.teamBtn": "Conheça o Plano Team",
    "welcome.dismiss": "Começar a Navegar",
    "chatbot.title": "Buscador de Casos de Uso IA",
    "chatbot.desc": "Descreva o que você quer construir e encontrarei os melhores casos de uso.",
    "chatbot.tooltip": "Pedir à IA para encontrar casos de uso",
    "chatbot.placeholder": "O que você quer construir com Manus?",
    "chatbot.empty": "Pergunte-me qualquer coisa sobre casos de uso do Manus",
    "chatbot.suggest1": "Painel de análise de marketing",
    "chatbot.suggest2": "Análise de propriedades imobiliárias",
    "chatbot.suggest3": "Visualização de dados financeiros",
    "chatbot.suggest4": "Criação de vídeos de produtos e-commerce",
    "chatbot.suggest5": "Pesquisa de inteligência competitiva",
    "chatbot.suggest6": "Automação de prospecção de vendas",
    "chatbot.askAi": "Perguntar à IA",
    "onboarding.title": "Primeiros Passos",
    "onboarding.step.upvote": "Votar em um caso de uso",
    "onboarding.step.search": "Pesquisar casos de uso",
    "onboarding.step.submit": "Enviar seu caso de uso",
    "onboarding.complete": "Tudo pronto!",
    "onboarding.toast.upvote": "Tente votar em um caso de uso que você goste!",
  },
};

export type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof TranslationKeys) => string;
};

export const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export function useI18n() {
  return useContext(I18nContext);
}

export function getTranslation(locale: Locale) {
  return (key: keyof TranslationKeys): string => {
    return translations[locale]?.[key] ?? translations.en[key] ?? key;
  };
}
