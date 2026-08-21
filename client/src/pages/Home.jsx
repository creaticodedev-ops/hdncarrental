import React, { lazy, Suspense } from 'react'
import Hero from '../components/Hero'
import SeoHead from '../seo/SeoHead'
import { localBusinessJsonLd, organizationJsonLd, websiteJsonLd } from '../seo/jsonLd'

const FeaturedSection = lazy(() => import('../components/FeaturedSection'))
const Banner = lazy(() => import('../components/Banner'))
const Testimonial = lazy(() => import('../components/Testimonial'))
const WhyChoose = lazy(() => import('../components/WhyChoose'))
const SeoHomeModule = lazy(() => import('../components/SeoHomeModule'))

const FeaturedFallback = () => (
  <div className="min-h-[8rem] w-full md:min-h-[12rem]" aria-hidden />
)

const SectionFallback = () => (
  <div className="min-h-[5rem] w-full md:min-h-[12rem]" aria-hidden />
)

const Home = () => {
  return (
    <>
      <SeoHead
        title="Location de voitures au Maroc | HDN Car"
        description="Location de voitures au Maroc — HDN Car à Safi. Réservez en ligne pour Casablanca, Marrakech, Agadir et plus. Flotte récente, tarifs clairs."
        path="/"
        jsonLd={[organizationJsonLd(), websiteJsonLd(), localBusinessJsonLd()]}
      />
      <Hero />
      <Suspense fallback={<FeaturedFallback />}>
        <FeaturedSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <Banner />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <Testimonial />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <WhyChoose />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <SeoHomeModule />
      </Suspense>
    </>
  )
}

export default Home
