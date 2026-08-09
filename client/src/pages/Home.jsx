import React, { lazy, Suspense } from 'react'
import Hero from '../components/Hero'
import SeoHead from '../seo/SeoHead'
import { localBusinessJsonLd, organizationJsonLd, websiteJsonLd } from '../seo/jsonLd'

const FeaturedSection = lazy(() => import('../components/FeaturedSection'))
const Banner = lazy(() => import('../components/Banner'))
const Testimonial = lazy(() => import('../components/Testimonial'))
const WhyChoose = lazy(() => import('../components/WhyChoose'))
const SeoHomeModule = lazy(() => import('../components/SeoHomeModule'))

const SectionFallback = () => (
  <div className="min-h-[12rem] w-full" aria-hidden />
)

const Home = () => {
  return (
    <>
      <SeoHead
        title="HDN Car — Location de voiture au Maroc"
        description="HDN Car — location de voiture premium au Maroc. Réservez en ligne, aéroports actifs et flotte récente."
        path="/"
        jsonLd={[organizationJsonLd(), websiteJsonLd(), localBusinessJsonLd()]}
      />
      <Hero />
      <Suspense fallback={<SectionFallback />}>
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
