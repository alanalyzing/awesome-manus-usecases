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
  "cat.public-services": string;
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
  "gallery.noResults": string;
  "gallery.noResultsDesc": string;
  "gallery.beFirst": string;
  "gallery.loadMore": string;
  "gallery.upvote": string;
  "gallery.views": string;
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
    "sidebar.highlights": "Only Possible with Manus",
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
    "cat.public-services": "Public Services",
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
    "gallery.search": "Search use cases...",
    "gallery.sortPopular": "Most Popular",
    "gallery.sortNewest": "Newest",
    "gallery.sortViews": "Most Viewed",
    "gallery.noResults": "No use cases found",
    "gallery.noResultsDesc": "There are no use cases in this category yet.",
    "gallery.beFirst": "Be the first to submit one!",
    "gallery.loadMore": "Load More",
    "gallery.upvote": "Upvote",
    "gallery.views": "views",
    "detail.sessionReplay": "Session Replay",
    "detail.deliverable": "View Deliverable",
    "detail.share": "Share",
    "detail.copied": "Link copied!",
    "detail.related": "Related Use Cases",
    "detail.submittedBy": "Submitted by",
    "detail.onlyManus": "Only Possible with Manus",
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
    "admin.highlight": "Only Possible with Manus",
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
    "hero.desc": "A curated gallery of real-world use cases from the Manus community. Browse by industry, feature, or explore what's only possible with Manus.",
    "hero.submitCta": "Share your use case",
    "hero.highlightsCta": "Only Possible with Manus",
    "hero.highlightsCtaShort": "Highlights",
    "hero.useCases": "Use Cases",
    "hero.categories": "Categories",
    "hero.languages": "Languages",
    "sidebar.learnMore": "Learn More",
    "sidebar.aboutPortal": "About This Portal",
    "sidebar.trendingThisWeek": "Trending This Week",
  },
  zh: {
    "nav.useCaseLibrary": "Awesome Manus 用例",
    "nav.submit": "提交用例",
    "nav.admin": "管理后台",
    "nav.login": "登录",
    "nav.logout": "退出",
    "sidebar.byJobFunction": "按职能/行业",
    "sidebar.byFeature": "按功能",
    "sidebar.highlights": "Manus 独有",
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
    "cat.public-services": "公共服务",
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
    "gallery.search": "搜索用例...",
    "gallery.sortPopular": "最受欢迎",
    "gallery.sortNewest": "最新",
    "gallery.sortViews": "最多浏览",
    "gallery.noResults": "暂无用例",
    "gallery.noResultsDesc": "该分类下暂无用例。",
    "gallery.beFirst": "成为第一个提交者！",
    "gallery.loadMore": "加载更多",
    "gallery.upvote": "点赞",
    "gallery.views": "浏览",
    "detail.sessionReplay": "会话回放",
    "detail.deliverable": "查看成果",
    "detail.share": "分享",
    "detail.copied": "链接已复制！",
    "detail.related": "相关用例",
    "detail.submittedBy": "提交者",
    "detail.onlyManus": "Manus 独有",
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
    "admin.highlight": "Manus 独有",
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
    "hero.desc": "来自 Manus 社区的真实用例精选集。按行业、功能浏览，或探索 Manus 独有的可能性。",
    "hero.submitCta": "分享你的用例",
    "hero.highlightsCta": "Manus 独有",
    "hero.highlightsCtaShort": "精选",
    "hero.useCases": "用例",
    "hero.categories": "分类",
    "hero.languages": "语言",
    "sidebar.learnMore": "了解更多",
    "sidebar.aboutPortal": "关于本站",
    "sidebar.trendingThisWeek": "本周热门",
  },
  ja: {
    "nav.useCaseLibrary": "Awesome Manus ユースケース",
    "nav.submit": "ユースケースを投稿",
    "nav.admin": "管理画面",
    "nav.login": "ログイン",
    "nav.logout": "ログアウト",
    "sidebar.byJobFunction": "職種・業界別",
    "sidebar.byFeature": "機能別",
    "sidebar.highlights": "Manusだけの事例",
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
    "cat.public-services": "公共サービス",
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
    "gallery.search": "ユースケースを検索...",
    "gallery.sortPopular": "人気順",
    "gallery.sortNewest": "新着順",
    "gallery.sortViews": "閲覧数順",
    "gallery.noResults": "ユースケースが見つかりません",
    "gallery.noResultsDesc": "このカテゴリにはまだユースケースがありません。",
    "gallery.beFirst": "最初の投稿者になりましょう！",
    "gallery.loadMore": "もっと見る",
    "gallery.upvote": "いいね",
    "gallery.views": "閲覧",
    "detail.sessionReplay": "セッションリプレイ",
    "detail.deliverable": "成果物を見る",
    "detail.share": "共有",
    "detail.copied": "リンクをコピーしました！",
    "detail.related": "関連ユースケース",
    "detail.submittedBy": "投稿者",
    "detail.onlyManus": "Manusだけの事例",
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
    "hero.desc": "Manusコミュニティからの実際のユースケースを厳選したギャラリー。業界、機能別に閲覧するか、Manusでしか実現できないものを探索しましょう。",
    "hero.submitCta": "ユースケースを共有",
    "hero.highlightsCta": "Manusならでは",
    "hero.highlightsCtaShort": "注目",
    "hero.useCases": "ユースケース",
    "hero.categories": "カテゴリ",
    "hero.languages": "言語",
    "sidebar.learnMore": "詳しく見る",
    "sidebar.aboutPortal": "このポータルについて",
    "sidebar.trendingThisWeek": "今週のトレンド",
  },
  ko: {
    "nav.useCaseLibrary": "Awesome Manus 유스케이스",
    "nav.submit": "유스케이스 제출",
    "nav.admin": "관리자",
    "nav.login": "로그인",
    "nav.logout": "로그아웃",
    "sidebar.byJobFunction": "직무/산업별",
    "sidebar.byFeature": "기능별",
    "sidebar.highlights": "Manus만의 사례",
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
    "cat.public-services": "공공 서비스",
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
    "gallery.search": "유스케이스 검색...",
    "gallery.sortPopular": "인기순",
    "gallery.sortNewest": "최신순",
    "gallery.sortViews": "조회순",
    "gallery.noResults": "유스케이스가 없습니다",
    "gallery.noResultsDesc": "이 카테고리에는 아직 유스케이스가 없습니다.",
    "gallery.beFirst": "첫 번째 제출자가 되어보세요!",
    "gallery.loadMore": "더 보기",
    "gallery.upvote": "추천",
    "gallery.views": "조회",
    "detail.sessionReplay": "세션 리플레이",
    "detail.deliverable": "결과물 보기",
    "detail.share": "공유",
    "detail.copied": "링크가 복사되었습니다!",
    "detail.related": "관련 유스케이스",
    "detail.submittedBy": "제출자",
    "detail.onlyManus": "Manus만의 사례",
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
    "hero.desc": "Manus 커뮤니티의 실제 사용 사례를 엄선한 갤러리입니다. 산업별, 기능별로 탐색하거나 Manus만의 가능성을 발견하세요.",
    "hero.submitCta": "사용 사례 공유",
    "hero.highlightsCta": "Manus만 가능",
    "hero.highlightsCtaShort": "하이라이트",
    "hero.useCases": "사용 사례",
    "hero.categories": "카테고리",
    "hero.languages": "언어",
    "sidebar.learnMore": "더 알아보기",
    "sidebar.aboutPortal": "이 포털 소개",
    "sidebar.trendingThisWeek": "이번 주 트렌드",
  },
  "pt-BR": {
    "nav.useCaseLibrary": "Awesome Manus Use Cases",
    "nav.submit": "Enviar Caso de Uso",
    "nav.admin": "Admin",
    "nav.login": "Entrar",
    "nav.logout": "Sair",
    "sidebar.byJobFunction": "Por Função/Indústria",
    "sidebar.byFeature": "Por Recurso",
    "sidebar.highlights": "Só Possível com Manus",
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
    "cat.public-services": "Serviços Públicos",
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
    "gallery.search": "Pesquisar casos de uso...",
    "gallery.sortPopular": "Mais Popular",
    "gallery.sortNewest": "Mais Recente",
    "gallery.sortViews": "Mais Visualizado",
    "gallery.noResults": "Nenhum caso de uso encontrado",
    "gallery.noResultsDesc": "Ainda não há casos de uso nesta categoria.",
    "gallery.beFirst": "Seja o primeiro a enviar!",
    "gallery.loadMore": "Carregar Mais",
    "gallery.upvote": "Votar",
    "gallery.views": "visualizações",
    "detail.sessionReplay": "Replay da Sessão",
    "detail.deliverable": "Ver Entrega",
    "detail.share": "Compartilhar",
    "detail.copied": "Link copiado!",
    "detail.related": "Casos de Uso Relacionados",
    "detail.submittedBy": "Enviado por",
    "detail.onlyManus": "Só Possível com Manus",
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
    "hero.desc": "Uma galeria curada de casos de uso reais da comunidade Manus. Navegue por setor, recurso ou explore o que só é possível com o Manus.",
    "hero.submitCta": "Compartilhe seu caso de uso",
    "hero.highlightsCta": "Só Possível com Manus",
    "hero.highlightsCtaShort": "Destaques",
    "hero.useCases": "Casos de Uso",
    "hero.categories": "Categorias",
    "hero.languages": "Idiomas",
    "sidebar.learnMore": "Saiba Mais",
    "sidebar.aboutPortal": "Sobre Este Portal",
    "sidebar.trendingThisWeek": "Tendências da Semana",
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
