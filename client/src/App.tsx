import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { I18nProvider } from "./contexts/I18nContext";
import Home from "./pages/Home";
import SubmitPage from "./pages/Submit";
import SubmitSuccessPage from "./pages/SubmitSuccess";
import AdminPage from "./pages/Admin";
import UseCaseDetailPage from "./pages/UseCaseDetail";
import MySubmissionsPage from "./pages/MySubmissions";
import AboutPage from "./pages/About";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/submit" component={SubmitPage} />
      <Route path="/submit/success" component={SubmitSuccessPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/my-submissions" component={MySubmissionsPage} />
      <Route path="/use-case/:slug" component={UseCaseDetailPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <I18nProvider>
          <TooltipProvider>
            <Toaster />
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:text-sm focus:font-medium focus:shadow-lg"
            >
              Skip to main content
            </a>
            <Router />
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
