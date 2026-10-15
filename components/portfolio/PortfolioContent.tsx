import Services from "@/components/services/Services";
import Projects from "@/components/projects/Projects";
import Testimonials from "@/components/testimonials/Testimonials";
import {
  getPublicCategories,
  getPublicProjects,
  getPublicServices,
  getPublicTestimonials,
} from "@/lib/portfolio";

export {
  type PublicListing as Listing,
  type PublicProject,
  type PublicService,
  type PublicTestimonial,
} from "@/lib/portfolio";

export default async function PortfolioContent() {
  const [services, projects, testimonials, serviceCategories, projectCategories] =
    await Promise.all([
      getPublicServices(),
      getPublicProjects(),
      getPublicTestimonials(),
      getPublicCategories("SERVICE"),
      getPublicCategories(),
    ]);
  const serviceCategoryNames = new Map(
    serviceCategories.map((category) => [category.id, category.name]),
  );
  const projectCategoryNames = new Map(
    projectCategories.map((category) => [category.id, category.name]),
  );

  return (
    <>
      <Services services={services} categoryNames={serviceCategoryNames} />
      <Projects projects={projects} categoryNames={projectCategoryNames} />
      <Testimonials testimonials={testimonials} />
    </>
  );
}

export function PortfolioContentLoading() {
  return (
    <div aria-label="Cargando contenido del portafolio" aria-busy="true">
      {[0, 1, 2].map((section) => (
        <section
          key={section}
          className="border-t border-white/10 bg-slate-900"
        >
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <div className="h-4 w-32 animate-pulse rounded bg-white/10 motion-reduce:animate-none" />
            <div className="mt-5 h-10 max-w-lg animate-pulse rounded bg-white/10 motion-reduce:animate-none" />
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((card) => (
                <div
                  key={card}
                  className="h-52 animate-pulse rounded-2xl border border-white/10 bg-white/5 motion-reduce:animate-none"
                />
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
