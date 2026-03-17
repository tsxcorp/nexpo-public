import { createItem } from '@directus/sdk'
import { NextRequest, NextResponse } from 'next/server'
import directusApi from '@/directus/client'

export interface FormSubmission {
  answers: Array<{
    field: string
    value: string
  }>
  form: string
  is_lead?: boolean
  date_started?: string
  date_sumitted?: string
  group_id?: string
  registration_id?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: FormSubmission = await req.json()
    const { answers, form } = body

    // Validate required fields
    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Answers array is required' },
        { status: 400 }
      )
    }

    if (!form) {
      return NextResponse.json(
        { error: 'Form ID is required' },
        { status: 400 }
      )
    }

    // Create the form submission
    const submissionData: any = {
      answers,
      form,
      status: 'published',
      date_sumitted: new Date().toISOString()
    }

          // Add optional fields if provided
          if (body.is_lead !== undefined) {
            submissionData.is_lead = body.is_lead
          }
          if (body.date_started) {
            submissionData.date_started = body.date_started
          }
          if (body.group_id) {
            submissionData.group_id = body.group_id
          }
          if (body.registration_id) {
            submissionData.registration_id = body.registration_id
          }

    const response = await directusApi.request(
      createItem('form_submissions', submissionData)
    )

    return NextResponse.json(response)
  } catch (error) {
    console.error('Form submission error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to submit form',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}


