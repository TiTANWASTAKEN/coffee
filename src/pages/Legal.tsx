import { useParams } from "react-router";
import { legalNav, site } from "@/config/site";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import NotFound from "./NotFound";

/** Placeholder legal pages — replace with reviewed policy text before launch. */
export default function Legal() {
  const { slug } = useParams();
  const page = legalNav.find((item) => item.to === `/legal/${slug}`);
  useDocumentTitle(page?.label);

  if (!page) return <NotFound />;

  return (
    <PageTransition>
      <PageHeader eyebrow="Legal" title={[page.label]} intro="This page is being prepared." />
      <section className="container-site pb-section">
        <div className="max-w-prose border-t border-line pt-10 text-muted">
          <p>
            Our {page.label.toLowerCase()} policy will be published here before launch. Purchases are currently made through Amazon, and are covered by
            Amazon’s own terms and policies.
          </p>
          <p className="mt-6">
            Questions in the meantime?{" "}
            <a href={`mailto:${site.contactEmail}`} className="link-underline text-ivory">
              {site.contactEmail}
            </a>
          </p>
        </div>
      </section>
    </PageTransition>
  );
}
