import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportError } from "@/lib/error-tracking";

/**
 * ============================================================
 * Section Error Boundary — حماية كل قسم على حدة
 * ============================================================
 * بدلاً من Error Boundary عام يُسقط الصفحة بالكامل عند أي خطأ،
 * هذا الـ boundary يلف كل section ويعرض fallback مخفف:
 *
 *   <SectionErrorBoundary name="FeaturedProducts">
 *     <FeaturedProducts />
 *   </SectionErrorBoundary>
 *
 * إذا أخطأ أحد الأقسام، باقي الصفحة تعمل بشكل طبيعي.
 * ============================================================
 */

interface Props {
  children: ReactNode;
  /** اسم القسم — يظهر في Error Tracking */
  name: string;
  /** Fallback مخصص بدلاً من الافتراضي */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // تسجيل الخطأ في نظام التتبع مع اسم القسم
    reportError(error, {
      feature: "section",
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
      section: this.props.name,
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      // Fallback افتراضي — مخفي بصرياً ولا يزعج المستخدم
      return (
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground">
            لم نستطع تحميل هذا القسم. جرّب تحديث الصفحة.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
