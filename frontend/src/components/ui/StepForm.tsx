import { type ReactNode, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface Step {
  label: string
  content: ReactNode
  isValid?: boolean
}

interface StepFormProps {
  steps: Step[]
  onSubmit: () => void | Promise<void>
  isSubmitting?: boolean
  submitLabel?: string
  className?: string
}

export function StepForm({
  steps,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Indsend',
  className,
}: StepFormProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1
  const step = steps[currentStep]

  const next = () => {
    if (!isLast) setCurrentStep((s) => s + 1)
  }

  const prev = () => {
    if (!isFirst) setCurrentStep((s) => s - 1)
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1 flex-1">
            <button
              onClick={() => i < currentStep && setCurrentStep(i)}
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-display font-semibold transition-colors',
                i === currentStep
                  ? 'bg-primary-600 text-white'
                  : i < currentStep
                    ? 'bg-primary-200 text-primary-700 cursor-pointer'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed',
              )}
            >
              {i < currentStep ? '✓' : i + 1}
            </button>
            {i < steps.length - 1 && (
              <div className={cn('h-0.5 flex-1', i < currentStep ? 'bg-primary-400' : 'bg-gray-200')} />
            )}
          </div>
        ))}
      </div>

      {/* Step label */}
      <h3 className="font-display font-semibold text-gray-900 mb-4">{step.label}</h3>

      {/* Step content */}
      <div className="flex-1 min-h-0">{step.content}</div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        <Button variant="secondary" size="sm" onClick={prev} disabled={isFirst}>
          <ChevronLeft className="h-4 w-4" />
          Tilbage
        </Button>

        {isLast ? (
          <Button size="sm" onClick={onSubmit} disabled={isSubmitting || step.isValid === false}>
            {isSubmitting ? 'Sender...' : submitLabel}
          </Button>
        ) : (
          <Button size="sm" onClick={next} disabled={step.isValid === false}>
            Næste
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
