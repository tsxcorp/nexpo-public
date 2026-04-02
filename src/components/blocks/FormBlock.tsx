import VForm from '@/components/base/VForm'
import { Forms } from '@/directus/types'
import BlockContainer from '@/components/BlockContainer'
import TypographyTitle from '@/components/typography/TypographyTitle'
import TypographyHeadline from '@/components/typography/TypographyHeadline'
import { findTranslation, toDirectusLang } from '@/lib/utils/translation-helpers'

interface FormBlockProps {
  title?: string
  headline?: string
  form: Forms
  translations?: {
    languages_code: string
    title?: string
    headline?: string
  }[]
  id: string
}

interface FormBlockComponentProps {
  data: FormBlockProps
  lang: string
}

const FormBlock = ({ data, lang }: FormBlockComponentProps) => {
  if (!data || !data.form) {
    return null;
  }

  const directusLang = toDirectusLang(lang);

  const translation = findTranslation(data.translations, lang);
  const title = translation?.title || data.title;
  const headline = translation?.headline || data.headline;

  // Transform form.fields to schema expected by VForm
  const formWithSchema = {
    ...data.form,
    is_allow_group: data.form.is_allow_group || false,
    template_email: data.form.template_email,
    template_email_group: data.form.template_email_group,
    qr_code_field: data.form.qr_code_field,
    schema: (data.form.fields || []).map((field, index) => {
      const fieldTranslation = field?.translations?.find(
        (t) => t.languages_code === directusLang
      );

      const fieldName = field?.name || field?.id || `field_${index}`;

      return {
        id: field?.id || `field_${index}`,
        name: fieldName,
        type: field?.type || 'input',
        label: fieldTranslation?.label || field?.name || fieldName,
        placeholder: fieldTranslation?.placeholder || '',
        help: fieldTranslation?.help || '',
        validation: field?.validation || '',
        width: field?.width || '100',
        options: fieldTranslation?.options || [],
        is_required: field?.is_required || false,
        is_group_field: field?.is_group_field || false,
        is_email_contact: field?.is_email_contact || false,
        event_id: field?.event_id,
        tenant_id: field?.tenant_id,
        conditions: field?.conditions || [],
      };
    }),
    submit_label:
      findTranslation(data.form.translations, lang)?.submit_label || data.form.submit_label || 'Submit',
    success_message:
      findTranslation(data.form.translations, lang)?.success_message || data.form.success_message || 'Form submitted successfully',
  };

  return (
    <BlockContainer>
      <div className='card mx-auto mt-4 max-w-4xl'>
        <div className='card-body'>
          {title && (
            <TypographyTitle className='text-[var(--color-gray)] '>{title}</TypographyTitle>
          )}
          {headline && (
            <TypographyHeadline
              className="text-[var(--color-primary)] font-semibold [font-family:var(--font-display)]"
              content={headline}
            />
          )}
          <VForm form={formWithSchema} className='mt-4' />
        </div>
      </div>
    </BlockContainer>
  );
};

export default FormBlock
