import { Box, Input, InputGroup, InputRightElement } from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'

export type FilterableSelectOption = { value: string; label: string }

type FilterableSelectProps = {
  options: FilterableSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyLabel?: string
  isDisabled?: boolean
  title?: string
}

export function FilterableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  emptyLabel = '— none —',
  isDisabled,
  title,
}: FilterableSelectProps) {
  const selectedOption = options.find((o) => o.value === value) ?? null
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  function open() {
    if (isDisabled) return
    setQuery('')
    setIsOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function close() {
    setIsOpen(false)
    setQuery('')
  }

  function select(v: string) {
    onChange(v)
    close()
  }

  useEffect(() => {
    if (!isOpen) return
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [isOpen])

  const displayValue = isOpen ? query : (selectedOption?.label ?? '')

  return (
    <Box ref={containerRef} position="relative" width="100%" title={title}>
      <InputGroup size="sm">
        <Input
          ref={inputRef}
          value={displayValue}
          placeholder={selectedOption ? undefined : placeholder}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={open}
          onClick={open}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close()
            if (e.key === 'Enter' && filtered.length > 0) select(filtered[0].value)
          }}
          cursor={isDisabled ? 'not-allowed' : isOpen ? 'text' : 'pointer'}
          isDisabled={isDisabled}
          paddingRight={value ? '2rem' : undefined}
          _focus={{ boxShadow: isOpen ? undefined : 'none' }}
        />
        {value && !isDisabled && (
          <InputRightElement>
            <Box
              as="button"
              type="button"
              display="flex"
              alignItems="center"
              justifyContent="center"
              width="1.25rem"
              height="1.25rem"
              borderRadius="sm"
              color="gray.400"
              _hover={{ color: 'gray.600', background: 'gray.100' }}
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); select('') }}
            >
              <XIcon />
            </Box>
          </InputRightElement>
        )}
      </InputGroup>

      {isOpen && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          right={0}
          zIndex={200}
          background="white"
          boxShadow="md"
          borderRadius="md"
          border="1px solid"
          borderColor="gray.200"
          maxHeight="220px"
          overflowY="auto"
          marginTop="2px"
        >
          <DropdownItem
            label={emptyLabel}
            isSelected={value === ''}
            isPlaceholder
            onClick={() => select('')}
          />
          {filtered.length === 0 ? (
            <Box paddingX="0.75rem" paddingY="0.4rem" fontSize="sm" color="gray.400">
              No matches
            </Box>
          ) : (
            filtered.map((o) => (
              <DropdownItem
                key={o.value}
                label={o.label}
                isSelected={o.value === value}
                onClick={() => select(o.value)}
              />
            ))
          )}
        </Box>
      )}
    </Box>
  )
}

function DropdownItem({
  label,
  isSelected,
  isPlaceholder,
  onClick,
}: {
  label: string
  isSelected: boolean
  isPlaceholder?: boolean
  onClick: () => void
}) {
  return (
    <Box
      paddingX="0.75rem"
      paddingY="0.4rem"
      fontSize="sm"
      cursor="pointer"
      userSelect="none"
      background={isSelected && !isPlaceholder ? 'blue.50' : undefined}
      color={isPlaceholder ? 'gray.400' : isSelected ? 'blue.700' : 'gray.700'}
      _hover={{ background: isSelected && !isPlaceholder ? 'blue.100' : 'gray.50' }}
      onPointerDown={(e) => e.preventDefault()} // keep input focused until selection made
      onClick={onClick}
    >
      {label}
    </Box>
  )
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
