'use client'
import React, { useRef, useState } from 'react'
import VIcon from '@/components/base/VIcon'
import TypographyTitle from '@/components/typography/TypographyTitle'
import TypographyHeadline from '@/components/typography/TypographyHeadline'
import BlockContainer from '@/components/BlockContainer'
import { getDirectusMedia } from '@/lib/utils/directus-helpers'
import Image from 'next/image'
import clsx from 'clsx'
import { findTranslation } from '@/lib/utils/translation-helpers'

interface TestimonialTranslation {
  languages_code: string
  title?: string
  subtitle?: string
  content?: string
}

interface Testimonial {
  id: string | number
  title: string
  subtitle: string
  image: string
  company: string
  company_logo: string
  link: string
  content: string
  translations?: TestimonialTranslation[]
}

interface Testimonials {
  id: string
  title?: string
  headline?: string
  subtitle?: string
  testimonials: { testimonial: Testimonial }[]
  translations?: Array<{
    title?: string
    headline?: string
    subtitle?: string
    languages_code: string
  }>
}

interface TestimonialsBlockProps {
  data: Testimonials
  lang: string
}

export default function TestimonialsBlock({ data, lang }: TestimonialsBlockProps) {
  const translation = findTranslation(data.translations, lang)
  const title = translation?.title || data.title || ''
  const headline = translation?.headline || data.headline || ''
  const subtitle = translation?.subtitle || data.subtitle || ''

  const testimonialContainer = useRef<HTMLDivElement>(null)
  const testimonialRefs = useRef<HTMLDivElement[]>([])
  const [currentItemIdx, setCurrentItemIdx] = useState(0)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const testimonialWidth = testimonialRefs.current[0].offsetWidth
    const testimonialCenter = testimonialWidth / 2
    const scrollLeft = e.currentTarget.scrollLeft
    const scrollCenter = scrollLeft + testimonialCenter
    const closestTestimonial = Math.round(scrollCenter / testimonialWidth)

    if (scrollLeft === 0) {
      setCurrentItemIdx(0)
    } else if (
      scrollLeft + e.currentTarget.offsetWidth + 1 >=
      e.currentTarget.scrollWidth
    ) {
      setCurrentItemIdx(testimonialRefs.current.length - 1)
    } else {
      setCurrentItemIdx(closestTestimonial)
    }
  }

  const handleIndicatorButton = (index: number) => {
    if (testimonialContainer.current && testimonialRefs.current[index]) {
      testimonialContainer.current.scrollLeft =
        testimonialRefs.current[index].offsetLeft - 16
    }
  }

  const handleNavButton = (direction: 'left' | 'right') => {
    if (
      testimonialContainer.current &&
      testimonialRefs.current[currentItemIdx]
    ) {
      if (direction === 'left') {
        testimonialContainer.current.scrollLeft -=
          testimonialRefs.current[currentItemIdx].offsetWidth
      } else {
        testimonialContainer.current.scrollLeft +=
          testimonialRefs.current[currentItemIdx].offsetWidth
      }
    }
  }

  return (
    <BlockContainer className="relative overflow-hidden" fullWidth>
      <div className="relative space-y-4 pt-16 text-center">
        <TypographyTitle
          className="text-[var(--color-gray)] font-[var(--font-display) ] font-semibold"
        >
          {title}
        </TypographyTitle>
        <TypographyHeadline
          content={headline}
          size="xl"
          className="font-[var(--font-display) ] font-semibold text-[var(--color-primary)]"
        />
        <p className="mx-auto max-w-4xl text-center leading-7 text-gray-500">
          {subtitle}
        </p>
      </div>
      <div className="relative mt-8">
        <div className="flex items-center justify-end space-x-8 px-6">
          {/* Indicator Dots */}
          <div className="inline-flex space-x-2">
            {Array.isArray(data.testimonials) && (() => {
              const filtered = data.testimonials
                .filter(item => item && (("testimonial" in item && item.testimonial?.id) || ("testimonials_id" in item && (item as any).testimonials_id)));
              return filtered
                .map((item, itemIdx) => {
                  let key: string | number =
                    "testimonial" in item && typeof item.testimonial?.id === 'string'
                      ? item.testimonial.id
                      : "testimonials_id" in item && typeof (item as any).testimonials_id === 'string'
                      ? (item as any).testimonials_id
                      : `idx-${itemIdx}`;
                  return (
                    <button
                      key={key}
                      className={clsx(
                        "h-3 w-10 rounded-full transition-all duration-200",
                        itemIdx === currentItemIdx
                          ? "bg-[var(--color-primary)] shadow"
                          : "bg-gray-200"
                      )}
                      style={{
                        border: itemIdx === currentItemIdx ? '2px solid var(--color-primary)' : undefined,
                        boxShadow: itemIdx === currentItemIdx ? '0 2px 8px 0 rgba(30,64,175,0.15)' : undefined,
                      }}
                      onClick={() => handleIndicatorButton(itemIdx)}
                      aria-label={`Go to testimonial ${itemIdx + 1}`}
                    />
                  );
                })
                .filter(Boolean);
            })()}
          </div>
          {/* Navigation Buttons */}
          <div className="flex space-x-2 justify-self-end">
            <button
              disabled={currentItemIdx === 0}
              className={clsx(
                "flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200",
                "bg-[var(--color-primary)] text-white shadow hover:bg-white hover:text-[var(--color-primary)] border-2 border-[var(--color-primary)]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              onClick={() => handleNavButton('left')}
              aria-label="Previous testimonial"
            >
              <VIcon icon="heroicons:arrow-left" className="h-5 w-5" />
            </button>
            <button
              disabled={currentItemIdx === data.testimonials.length - 1}
              className={clsx(
                "flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200",
                "bg-[var(--color-primary)] text-white shadow hover:bg-white hover:text-[var(--color-primary)] border-2 border-[var(--color-primary)]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              onClick={() => handleNavButton('right')}
              aria-label="Next testimonial"
            >
              <VIcon icon="heroicons:arrow-right" className="h-5 w-5" />
            </button>
          </div>
        </div>
        {/* Testimonial Cards */}
        <div
          className="scrollbar-hide flex snap-x space-x-6 overflow-x-auto scroll-smooth px-4 py-6 md:px-6 md:pt-8 lg:px-8"
          style={{ background: 'rgba(30,64,175,0.04)' }}
          ref={testimonialContainer}
          onScroll={handleScroll}
        >
          {Array.isArray(data.testimonials) && data.testimonials
            .filter(item => item && (("testimonial" in item && item.testimonial?.id) || ("testimonials_id" in item && (item as any).testimonials_id)))
            .map((item, itemIdx) => {
              const testimonial = "testimonial" in item ? item.testimonial : (item as any).testimonials_id;
              const testimonialTranslation = findTranslation<TestimonialTranslation>(
                (testimonial.translations as TestimonialTranslation[] | undefined),
                lang
              );
              const testimonialTitle = testimonialTranslation?.title || testimonial.title;
              const testimonialSubtitle = testimonialTranslation?.subtitle || testimonial.subtitle;
              const testimonialContent = testimonialTranslation?.content || testimonial.content;

              return (
                <div
                  key={testimonial.id || `testimonial-${itemIdx}`}
                  ref={el => {
                    if (el) testimonialRefs.current[itemIdx] = el;
                  }}
                  className="relative flex w-[350px] flex-shrink-0 snap-center flex-col justify-between overflow-hidden bg-white p-8 shadow-lg rounded-3xl border border-gray-100 transition-all duration-300 hover:shadow-2xl lg:w-[600px]"
                  style={{
                    borderColor: 'var(--color-primary, #1E40AF)',
                  }}
                >
                  <div
                    className="prose prose-sm relative font-[var(--font-body)] md:prose-base text-gray-700"
                    dangerouslySetInnerHTML={{ __html: testimonialContent }}
                  />
                  <div className="mt-6 flex items-center space-x-4 border-t pt-6">
                    {testimonial.image ? (
                      <Image
                        className="inline-block h-16 w-16 rounded-full border-2 border-[var(--color-primary)] object-cover"
                        width={64}
                        height={64}
                        src={getDirectusMedia(testimonial.image)}
                        alt={testimonialTitle || ''}
                      />
                    ) : (
                      <VIcon
                        icon="ic:baseline-account-circle"
                        className="inline-block h-16 w-16 rounded-full border-2 border-[var(--color-primary)] bg-gray-100"
                      />
                    )}
                    <div className="text-left">
                      <p className="font-[var(--font-body) ] font-semibold text-lg text-[var(--color-primary)]">{testimonialTitle}</p>
                      <p className="font-[var(--font-body)] text-sm text-gray-500">{testimonialSubtitle} {testimonial.company ? `at ${testimonial.company}` : ''}</p>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </BlockContainer>
  );
}
