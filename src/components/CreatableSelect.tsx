import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Plus, X, Search, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  count?: number;
  subtitle?: string;
  icon?: React.ElementType;
}

export interface CreatableSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | SelectOption>;
  onCreateOption?: (newOption: string) => Promise<void> | void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  allowCreate?: boolean;
  isClearable?: boolean;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  dropdownClassName?: string;
  formatCreateLabel?: (inputValue: string) => string;
}

export const CreatableSelect: React.FC<CreatableSelectProps> = ({
  id,
  value,
  onChange,
  options,
  onCreateOption,
  placeholder = 'Selecione ou digite para criar...',
  searchPlaceholder = 'Buscar ou digitar novo...',
  emptyLabel,
  allowCreate = true,
  isClearable = false,
  disabled = false,
  required = false,
  className = '',
  dropdownClassName = '',
  formatCreateLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [isCreating, setIsCreating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Normalize options into a standard format
  const normalizedOptions: SelectOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Normalize text for search comparison (ignores accents & case)
  const normalizeText = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions;
    const query = normalizeText(searchTerm);
    return normalizedOptions.filter(
      (opt) =>
        normalizeText(opt.label).includes(query) ||
        normalizeText(opt.value).includes(query) ||
        (opt.subtitle && normalizeText(opt.subtitle).includes(query))
    );
  }, [normalizedOptions, searchTerm]);

  // Check if current search term exactly matches an existing option
  const exactMatchExists = useMemo(() => {
    if (!searchTerm.trim()) return false;
    const query = normalizeText(searchTerm);
    return normalizedOptions.some(
      (opt) => normalizeText(opt.label) === query || normalizeText(opt.value) === query
    );
  }, [normalizedOptions, searchTerm]);

  // Format the new created option name (Title Case for general names, or trimmed)
  const formatNewOption = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    return trimmed
      .split(' ')
      .map((word) => {
        if (word.length <= 2) return word.toLowerCase();
        // Capitalize first letter
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelectOption = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleCreateAndSelect = async (rawName: string) => {
    const formatted = formatNewOption(rawName);
    if (!formatted) return;

    setIsCreating(true);
    try {
      if (onCreateOption) {
        await onCreateOption(formatted);
      }
      onChange(formatted);
      setIsOpen(false);
      setSearchTerm('');
      setHighlightedIndex(-1);
    } catch (err) {
      console.error('Erro ao criar nova opção:', err);
      // Even if remote save fails, select locally
      onChange(formatted);
      setIsOpen(false);
      setSearchTerm('');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalItems = filteredOptions.length + (!exactMatchExists && searchTerm.trim() && allowCreate ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 >= totalItems ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 < 0 ? totalItems - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }

      // If user highlighted a specific option
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelectOption(filteredOptions[highlightedIndex].value);
      } else if (!exactMatchExists && searchTerm.trim() && allowCreate) {
        // Highlighted the "Create" button or just hit Enter on new typed term
        handleCreateAndSelect(searchTerm);
      } else if (filteredOptions.length > 0) {
        // Default to first match if available
        handleSelectOption(filteredOptions[0].value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // Selected label to display
  const selectedOption = normalizedOptions.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : value;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Control Button / Display Field */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition outline-none cursor-pointer select-none ${
          disabled
            ? 'bg-black/20 border-white/5 text-slate-500 cursor-not-allowed'
            : isOpen
            ? 'bg-black/60 border-blue-500 text-slate-100 ring-1 ring-blue-500/30'
            : value
            ? 'bg-black/40 border-white/10 text-slate-200 hover:border-white/20'
            : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'
        }`}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {displayLabel ? (
            <span className="truncate text-white font-semibold flex items-center gap-1.5">
              {displayLabel}
              {selectedOption?.count !== undefined && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/10 text-slate-300 font-mono">
                  {selectedOption.count}
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-500 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          {isClearable && value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-1 rounded-md hover:bg-white/10 hover:text-rose-400 transition"
              title="Limpar seleção"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-400' : 'text-slate-400'}`}
          />
        </div>
      </button>

      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          tabIndex={-1}
          required={required}
          value={value}
          onChange={() => {}}
          className="sr-only"
        />
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl bg-[#14151d] border border-white/15 shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-72 animate-in fade-in zoom-in-95 duration-100 ${dropdownClassName}`}
        >
          {/* Search Input Header */}
          <div className="p-2 border-b border-white/10 bg-[#181924] flex items-center gap-2 shrink-0">
            <Search size={13} className="text-slate-400 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  inputRef.current?.focus();
                }}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10"
          >
            {/* Empty selection option if emptyLabel provided */}
            {emptyLabel && !searchTerm && (
              <button
                type="button"
                onClick={() => handleSelectOption('')}
                className={`w-full px-2.5 py-2 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                  !value
                    ? 'bg-blue-600/20 text-blue-300 font-bold'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{emptyLabel}</span>
                {!value && <Check size={13} className="text-blue-400 shrink-0" />}
              </button>
            )}

            {/* List Existing Filtered Options */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = highlightedIndex === idx;

                return (
                  <button
                    key={`${opt.value}-${idx}`}
                    type="button"
                    onClick={() => handleSelectOption(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between gap-2 transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/25 text-blue-300 font-bold border border-blue-500/30'
                        : isHighlighted
                        ? 'bg-white/10 text-white'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <span className="truncate">{opt.label}</span>
                      {opt.subtitle && (
                        <span className="text-[10px] text-slate-400 truncate">
                          ({opt.subtitle})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.count !== undefined && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-slate-400 font-mono">
                          {opt.count}
                        </span>
                      )}
                      {isSelected && <Check size={13} className="text-blue-400" />}
                    </div>
                  </button>
                );
              })
            ) : !allowCreate || !searchTerm.trim() ? (
              <div className="py-4 text-center text-xs text-slate-400">
                Nenhum item encontrado
              </div>
            ) : null}

            {/* Creatable Action Button if value doesn't exist */}
            {allowCreate && searchTerm.trim() && !exactMatchExists && (
              <div className="pt-1 mt-1 border-t border-white/10">
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => handleCreateAndSelect(searchTerm)}
                  onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                  className={`w-full px-2.5 py-2.5 rounded-lg text-left text-xs font-bold flex items-center gap-2 transition cursor-pointer border ${
                    highlightedIndex === filteredOptions.length
                      ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/30 text-blue-200 border-blue-500/50 shadow-sm'
                      : 'bg-blue-600/15 text-blue-300 border-blue-500/30 hover:bg-blue-600/25'
                  }`}
                >
                  <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Plus size={13} className="stroke-[3]" />
                  </div>
                  <div className="truncate min-w-0">
                    <span className="text-slate-300 font-normal">Criar </span>
                    <strong className="text-white underline decoration-blue-400 font-bold">
                      "{formatCreateLabel ? formatCreateLabel(searchTerm) : formatNewOption(searchTerm)}"
                    </strong>
                  </div>
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/20 font-mono shrink-0">
                    Enter ↵
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
