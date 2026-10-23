import { useParams } from "react-router";
import { legalNav, site } from "@/config/site";
import { legalCopy } from "@/data/legal";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import NotFound from "./NotFound";

export default function Legal() {
  const { slug } = useParams();
  const page = legalNav.find((item) => item.to === `/legal/${slug}`);
  const body = slug ? legalCopy[slug] : undefined;
  useDocumentTitle(page?.label);

  if (!page || !body) return <NotFound />;

  return (
    <PageTransition>
      <PageHeader eyebrow="Legal" title={[page.label]} intro={body.intro} />
      <section className="container-site pb-section">
        <div className="max-w-prose border-t border-line pt-10 text-muted">
          {body.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-6 first:mt-0">
              {paragraph}
            </p>
          ))}
          <p className="mt-6">
            Questions?{" "}
            <a href={`mailto:${site.contactEmail}`} className="link-underline text-ivory">
              {site.contactEmail}
            </a>
          </p>
        </div>
      </section>
    </PageTransition>
  );
}
