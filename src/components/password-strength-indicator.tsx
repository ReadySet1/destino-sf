'use client';

import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

export function PasswordStrengthIndicator() {
  const [password, setPassword] = useState('');
  const [requirements, setRequirements] = useState<PasswordRequirement[]>([
    { label: 'At least 8 characters', test: pwd => pwd.length >= 8, met: false },
    { label: 'Contains uppercase letter', test: pwd => /[A-Z]/.test(pwd), met: false },
    { label: 'Contains lowercase letter', test: pwd => /[a-z]/.test(pwd), met: false },
    { label: 'Contains number', test: pwd => /\d/.test(pwd), met: false },
    {
      label: 'Contains special character',
      test: pwd => /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      met: false,
    },
  ]);

  useEffect(() => {
    // Listen for password input changes
    const passwordInput = document.getElementById('password') as HTMLInputElement;

    const handlePasswordChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const newPassword = target.value;
      setPassword(newPassword);

      // Update requirements
      setRequirements(prev =>
        prev.map(req => ({
          ...req,
          met: req.test(newPassword),
        }))
      );
    };

    if (passwordInput) {
      passwordInput.addEventListener('input', handlePasswordChange);
      return () => passwordInput.removeEventListener('input', handlePasswordChange);
    }
  }, []);

  const getStrengthLevel = () => {
    const metCount = requirements.filter(req => req.met).length;
    if (metCount === 0) return { level: 'none', color: 'bg-gray-200', text: '' };
    if (metCount <= 2) return { level: 'weak', color: 'bg-red-500', text: 'Weak' };
    if (metCount <= 3) return { level: 'fair', color: 'bg-yellow-500', text: 'Fair' };
    if (metCount <= 4) return { level: 'good', color: 'bg-blue-500', text: 'Good' };
    return { level: 'strong', color: 'bg-green-500', text: 'Strong' };
  };

  const strength = getStrengthLevel();
  const metCount = requirements.filter(req => req.met).length;

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Password strength</span>
          <span
            className={`font-medium ${
              strength.level === 'weak'
                ? 'text-red-600'
                : strength.level === 'fair'
                  ? 'text-yellow-600'
                  : strength.level === 'good'
                    ? 'text-blue-600'
                    : strength.level === 'strong'
                      ? 'text-green-600'
                      : 'text-gray-600'
            }`}
          >
            {strength.text}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${(metCount / requirements.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center space-x-2 text-xs">
            {req.met ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <X className="h-3 w-3 text-gray-400" />
            )}
            <span className={req.met ? 'text-green-600' : 'text-gray-500'}>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
