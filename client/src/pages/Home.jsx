import React, { lazy, Suspense } from 'react'
import Hero from '../components/Hero'

const FeaturedSection = lazy(() => import('../components/FeaturedSection'))
const Banner = lazy(() => import('../components/Banner'))
const Testimonial = lazy(() => import('../components/Testimonial'))
const Newsletter = lazy(() => import('../components/Newsletter'))

const SectionFallback = () => (
  <div className="min-h-[12rem] w-full" aria-hidden />
)

const Home = () => {
  return (
    <>
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
        <Newsletter />
      </Suspense>
    </>
  )
}

export default Home
