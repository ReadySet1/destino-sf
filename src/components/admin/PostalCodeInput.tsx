'use client';

import { useState, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface PostalCodeInputProps {
  value: string; // comma-separated string
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function PostalCodeInput({ value, onChange, placeholder }: PostalCodeInputProps) {
  const [inputValue, setInputValue] = useState('');

  // Parse comma-separated string into array
  const postalCodes = value
    .split(',')
    .map(code => code.trim())
    .filter(code => code.length > 0);

  const addPostalCode = (code: string) => {
    const trimmedCode = code.trim();
    if (trimmedCode && !postalCodes.includes(trimmedCode)) {
      const newCodes = [...postalCodes, trimmedCode];
      onChange(newCodes.join(', '));
    }
    setInputValue('');
  };

  const removePostalCode = (codeToRemove: string) => {
    const newCodes = postalCodes.filter(code => code !== codeToRemove);
    onChange(newCodes.join(', '));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPostalCode(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && postalCodes.length > 0) {
      // Remove last postal code when backspace is pressed on empty input
      removePostalCode(postalCodes[postalCodes.length - 1]);
    } else if (e.key === ',') {
      e.preventDefault();
      addPostalCode(inputValue);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addPostalCode(inputValue);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const codes = pastedText
      .split(/[\s,]+/)
      .map(code => code.trim())
      .filter(code => code.length > 0);

    const newCodes = [...postalCodes];
    codes.forEach(code => {
      if (!newCodes.includes(code)) {
        newCodes.push(code);
      }
    });

    onChange(newCodes.join(', '));
    setInputValue('');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-gray-50 min-h-[80px]">
        {postalCodes.map(code => (
          <Badge
            key={code}
            variant="secondary"
            className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 hover:bg-blue-200"
          >
            <span className="font-mono text-xs">{code}</span>
            <button
              type="button"
              onClick={() => removePostalCode(code)}
              className="ml-1 hover:bg-blue-300 rounded-full p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {postalCodes.length === 0 && (
          <span className="text-sm text-gray-400 italic">No postal codes added yet...</span>
        )}
      </div>
      <Input
        type="text"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onPaste={handlePaste}
        placeholder={placeholder || 'Type a postal code and press Enter or comma'}
        className="w-full"
      />
      <div className="flex items-start justify-between text-xs text-gray-500">
        <p>Press Enter, comma, or paste multiple codes separated by commas or spaces</p>
        <p className="text-right font-medium">{postalCodes.length} codes</p>
      </div>
    </div>
  );
}
