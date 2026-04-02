import BlockContainer from '@/components/BlockContainer'
import { findTranslation } from '@/lib/utils/translation-helpers'

interface RawHtml {
  id: string
  raw_html?: string
  translations?: Array<{
    raw_html?: string
    languages_code: string
  }>
}

interface RawHtmlBlockProps {
  data: RawHtml
  lang: string
}

export default function RawHtmlBlock({ data, lang }: RawHtmlBlockProps) {
  const translation = findTranslation(data.translations, lang)
  const rawHtml = translation?.raw_html || data.raw_html || ''

  return (
    <BlockContainer>
      <div dangerouslySetInnerHTML={{ __html: rawHtml }}></div>
    </BlockContainer>
  )
}
