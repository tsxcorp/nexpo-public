'use client'

import { Forms, FormField } from '@/directus/types'
import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import VAlert from '@/components/base/VAlert'
import { useForm } from 'react-hook-form'
import { ErrorMessage } from '@hookform/error-message'
import DirectusFormBuilder from '@/components/form/DirectusFormBuilder'
import { cn } from '@/lib/utils/tw'
import formTheme from '@/form.theme'
import { useRouter } from '@/lib/navigation'
import VButton from '@/components/base/VButton'
import { v4 as uuidv4 } from 'uuid'
import { useFormConditions } from '@/hooks/use-form-conditions'

interface FormProps {
  form: Forms
  className?: string
}

function transformSchema(schema: FormField[] = []) {
  return schema.map((item) => {
    const newItem = { ...item };
    // Map type to FormKit-compatible type
    if (newItem.type === 'input') {
      newItem.$formkit = 'text';
    } else {
      newItem.$formkit = newItem.type;
    }
    // Set outerclass based on width
    switch (newItem.width) {
      case '33':
        newItem.outerclass = 'md:col-span-2';
        break;
      case '50':
        newItem.outerclass = 'md:col-span-3';
        break;
      case '67':
        newItem.outerclass = 'md:col-span-4';
        break;
      case '100':
        newItem.outerclass = 'md:col-span-6';
        break;
      default:
        newItem.outerclass = 'md:col-span-6';
    }
    // Add validation rules
    if (newItem.validation) {
      newItem.validation = newItem.validation;
    }
    // For select fields, ensure options are formatted
    if (newItem.type === 'select' && newItem.options) {
      newItem.options = newItem.options.map((opt: { label: string; value: string }) => ({
        label: opt.label,
        value: opt.value,
      }));
    }
    return newItem;
  });
}

// Helper function to separate fields by group
function separateFieldsByGroup(schema: FormField[] = []) {
  const leadFields = schema.filter(field => !field.is_group_field);
  const groupFields = schema.filter(field => field.is_group_field);
  
  return { leadFields, groupFields };
}

function VForm(props: FormProps) {
  const { form } = props
  console.log('🔴 VForm RENDERING - Schema Length:', form.schema?.length);

  const router = useRouter()
  const searchParams = useSearchParams()
  const registrationId = searchParams.get('registration_id') ?? undefined

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [groupSections, setGroupSections] = useState<number[]>([])

  const schema = useMemo(() => transformSchema(form.schema || []), [form.schema])
  const { leadFields, groupFields } = useMemo(() => separateFieldsByGroup(schema), [schema])
  
  console.log('VForm - Lead fields:', leadFields);
  console.log('VForm - Group fields:', groupFields);
  console.log('VForm - Form allows groups:', form.is_allow_group);

  const hookForm = useForm<any>()

  // Logic điều kiện form
  const { visible, fieldOptions, fieldDisabled, fieldRequired } = useFormConditions(schema as any, hookForm)

  console.log('useFormConditions result:', { visible, fieldDisabled, fieldRequired });

  // Add new group section
  const addGroupSection = () => {
    const newIndex = groupSections.length
    setGroupSections([...groupSections, newIndex])
  }

  // Remove group section
  const removeGroupSection = (index: number) => {
    setGroupSections(groupSections.filter((_, i) => i !== index))
    // Clear form data for this section
    const sectionPrefix = `group_${index}_`
    groupFields.forEach(field => {
      hookForm.unregister(`${sectionPrefix}${field.name}`)
    })
  }

  async function uploadFileField(file: File): Promise<string> {
    const fd = new FormData()
    fd.append('file', file, file.name)
    if (props.form.event_id) fd.append('event_id', String(props.form.event_id))
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) throw new Error('File upload failed')
    const { id } = await res.json()
    return id as string
  }

  async function submitForm(data: any) {
    setLoading(true)
    // Build name → UUID map so form_answers.field receives the field UUID (FK to form_fields.id)
    const nameToIdMap = schema.reduce((acc, f) => {
      if (f.name && f.id) acc[f.name] = f.id;
      return acc;
    }, {} as Record<string, string>);

    // Identify file/image fields and upload them first
    const fileFieldNames = new Set(
      schema.filter(f => f.type === 'file' || f.type === 'image').map(f => f.name)
    )

    try {
      // Upload any file/image values to Directus, replace with UUID
      for (const [key, value] of Object.entries(data)) {
        const baseName = key.replace(/^group_\d+_/, '')
        if (fileFieldNames.has(baseName) && value instanceof FileList && value.length > 0) {
          data[key] = await uploadFileField(value[0])
        }
      }

      // If form doesn't allow groups, use original logic
      if (!form.is_allow_group || groupFields.length === 0) {
        const answers = Object.entries(data).map(([fieldName, value]) => ({
          field: nameToIdMap[fieldName] || fieldName,
          value: String(value || '')
        }));

        const response = await fetch('/api/form-submissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            answers,
            form: props.form.id,
            date_started: new Date().toISOString(),
            registration_id: registrationId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to submit form')
        }
      } else {
        // Group form logic
        const leadData: Record<string, any> = {}
        const groupData: Record<number, Record<string, any>> = {}

        // Separate lead data and group data
        Object.entries(data).forEach(([key, value]) => {
          if (key.startsWith('group_')) {
            const [_, sectionIndex, fieldName] = key.split('_')
            const sectionIdx = parseInt(sectionIndex)
            if (!groupData[sectionIdx]) {
              groupData[sectionIdx] = {}
            }
            groupData[sectionIdx][fieldName] = value
          } else {
            leadData[key] = value
          }
        })

        // Check if there are any group members added
        const hasGroupMembers = Object.keys(groupData).length > 0

        if (!hasGroupMembers) {
          // No group members added, create single submission without is_lead and group_id
          const allAnswers = Object.entries(data).map(([fieldName, value]) => ({
            field: nameToIdMap[fieldName] || fieldName,
            value: String(value || '')
          }));

          const response = await fetch('/api/form-submissions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              answers: allAnswers,
              form: props.form.id,
              date_started: new Date().toISOString(),
              registration_id: registrationId,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to submit form')
          }
        } else {
          // Has group members, generate group_id and create lead + group submissions
          const groupId = uuidv4()
          const submissions = []

          // Lead submission (only lead fields)
          const leadAnswers = Object.entries(leadData).map(([fieldName, value]) => ({
            field: nameToIdMap[fieldName] || fieldName,
            value: String(value || '')
          }));

          submissions.push({
            answers: leadAnswers,
            form: props.form.id,
            is_lead: true,
            date_started: new Date().toISOString(),
            group_id: groupId,
            status: 'published',
            date_sumitted: new Date().toISOString(),
          })

          // Group submissions (only group fields for each section)
          Object.entries(groupData).forEach(([sectionIndex, sectionData]) => {
            const groupAnswers = Object.entries(sectionData).map(([fieldName, value]) => ({
              field: nameToIdMap[fieldName] || fieldName,
              value: String(value || '')
            }));

            submissions.push({
              answers: groupAnswers,
              form: props.form.id,
              is_lead: false,
              date_started: new Date().toISOString(),
              group_id: groupId,
              status: 'published',
              date_sumitted: new Date().toISOString(),
            })
          })

          // Batch create all submissions
          const response = await fetch('/api/form-submissions/batch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              submissions,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to submit form')
          }
        }
      }

      setSuccess(true)
      if (form.on_success === 'redirect' && form.redirect_url) {
        // Phase 3.8: substitute {{registration_id}} from API response
        // The submitForm handler needs to read the API response for this.
        return router.push(form.redirect_url)
      }
    } catch (err) {
      setError(err as any)
    } finally {
      setLoading(false)
    }
  }

  const renderField = (element: any, sectionIndex?: number) => {
    const fieldName = sectionIndex !== undefined ? `group_${sectionIndex}_${element.name}` : element.name
    
    console.log(`Rendering field: ${element.label} (ID: ${element.id}) with registered name: ${fieldName}`);
    if (visible[element.id || element.name] === false) return null;

    return (
      <div
        key={`${fieldName}-${element.name}`}
        className={cn(element.outerclass, 'w-full')}
      >
        <label className='label' htmlFor={fieldName}>
          <span className='label-text text-gray-900'>{element.label}</span>
          {fieldRequired[element.id || element.name] && <span className='text-red-500 ml-1'>*</span>}
        </label>
        <DirectusFormBuilder 
          element={{
            ...element, 
            name: fieldName,
            options: (fieldOptions[element.id || element.name] || element.options) as any
          }} 
          hookForm={hookForm} 
          disabled={fieldDisabled[element.id || element.name]}
          required={fieldRequired[element.id || element.name]}
        />
        <ErrorMessage
          errors={hookForm.formState.errors}
          name={fieldName}
          render={({ message }) => (
            <VAlert type='error'>{message}</VAlert>
          )}
        />
      </div>
    )
  }

  return (
    <div className={cn(
      props.className,
      'max-w-4xl mx-auto bg-white border-2 border-[var(--color-primary)] rounded-[12px] shadow-md p-8'
    )}>
      <div className='mb-4'>
        {error && <VAlert type='error'>{(error as any)?.message || String(error)}</VAlert>}
        {form.on_success === 'message' && success && (
          <VAlert
            type='success'
            html={
              form.success_message ?? 'Success! Your form has been submitted.'
            }
          ></VAlert>
        )}
      </div>

      {!success && (
        <form className={formTheme.formClass} onSubmit={hookForm.handleSubmit(submitForm)}>
          <div className='grid gap-6 md:grid-cols-6'>
            {/* Render all fields normally first */}
            {schema.map((element) => {
              if (visible[element.id || element.name] === false) return null;
              
              return (
                <div
                  key={`fields-${element.name}`}
                  className={cn(element.outerclass, 'w-full')}
                >
                  <label className='label' htmlFor={element.name}>
                    <span className='label-text text-gray-900'>{element.label}</span>
                    {fieldRequired[element.id || element.name] && <span className='text-red-500 ml-1'>*</span>}
                  </label>
                  <DirectusFormBuilder 
                    element={{
                      ...element,
                      options: (fieldOptions[element.id || element.name] || element.options) as any
                    }} 
                    hookForm={hookForm} 
                    disabled={fieldDisabled[element.id || element.name]}
                    required={fieldRequired[element.id || element.name]}
                  />
                  <ErrorMessage
                    errors={hookForm.formState.errors}
                    name={element.name}
                    render={({ message }) => (
                      <VAlert type='error'>{message}</VAlert>
                    )}
                  />
                </div>
              );
            })}

            {/* Add Group Section if form allows groups and has group fields */}
            {form.is_allow_group && groupFields.length > 0 && (
              <div className='col-span-6 mt-8'>
                <div className='flex justify-between items-center mb-4'>
                  <h3 className='text-lg font-semibold text-gray-900'>
                    Thành viên nhóm
                  </h3>
                  <VButton
                    type='button'
                    variant='outline'
                    onClick={addGroupSection}
                    className='text-sm'
                  >
                    + Thêm thành viên
                  </VButton>
                </div>

                {groupSections.map((sectionIndex) => (
                  <div key={sectionIndex} className='mb-6 p-4 border border-gray-200 rounded-lg'>
                    <div className='flex justify-between items-center mb-4'>
                      <h4 className='text-md font-medium text-gray-700'>
                        Thành viên {sectionIndex + 1}
                      </h4>
                      <VButton
                        type='button'
                        variant='ghost'
                        onClick={() => removeGroupSection(sectionIndex)}
                        className='text-red-600 hover:text-red-800 text-sm'
                      >
                        Xóa
                      </VButton>
                    </div>
                    <div className='grid gap-6 md:grid-cols-6'>
                      {groupFields.map((element) => renderField(element, sectionIndex))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className='col-span-6 mx-auto'>
            <div className='form-control mt-6'>
              <button 
                type='submit'
                className='bg-[var(--color-primary)] text-white px-4 py-2 rounded-md disabled:opacity-50'
                disabled={loading}
              >
                {loading && <span className='loading loading-spinner mr-2'></span>}
                {form.translations?.[0]?.submit_label || form.submit_label || 'Submit'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

export default VForm
