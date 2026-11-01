/**
 * Google Firebase Project ID Validation Utility
 * 
 * Strict compliance with Google Cloud / Firebase Project ID specification:
 * 1. Must be between 6 and 30 characters long.
 * 2. Can only contain lowercase letters, numbers, and hyphens.
 * 3. NO capital letters are permitted under any circumstances.
 * 4. Must start with a lowercase letter (a-z).
 * 5. Cannot end with a hyphen.
 * 6. Cannot contain consecutive hyphens (--).
 * 7. Blocks placeholder / dummy test strings (like 'Hhuju', 'asdfgh', 'qwerty', etc.).
 */

export interface ProjectIdValidationResult {
  isValid: boolean;
  error?: string;
  normalizedId?: string;
  characterCount?: number;
}

export function validateFirebaseProjectId(rawId: string): ProjectIdValidationResult {
  const trimmed = (rawId || '').trim();

  // 1. Check for empty input
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Firebase Project ID cannot be blank. Please enter your Project ID from the Firebase Console.',
      characterCount: 0
    };
  }

  const charCount = trimmed.length;

  // 2. Uppercase character check (Explicitly catches cases like "Hhuju")
  if (/[A-Z]/.test(trimmed)) {
    return {
      isValid: false,
      error: `Firebase ID "${trimmed}" is INVALID: Capital letters are strictly forbidden. Project IDs must be entirely lowercase (e.g. "${trimmed.toLowerCase()}").`,
      characterCount: charCount
    };
  }

  // 3. Minimum length check (Catches short strings like "hhuju" which is only 5 chars)
  if (charCount < 6) {
    return {
      isValid: false,
      error: `Firebase ID "${trimmed}" is INVALID: Too short (${charCount}/6 characters). Google requires Firebase Project IDs to be at least 6 characters long.`,
      characterCount: charCount
    };
  }

  // 4. Maximum length check
  if (charCount > 30) {
    return {
      isValid: false,
      error: `Firebase ID "${trimmed}" is INVALID: Too long (${charCount}/30 characters). Project IDs cannot exceed 30 characters.`,
      characterCount: charCount
    };
  }

  // 5. Must start with a lowercase letter
  if (!/^[a-z]/.test(trimmed)) {
    return {
      isValid: false,
      error: `Firebase ID "${trimmed}" is INVALID: Must start with a lowercase letter (a-z), not a number or hyphen.`,
      characterCount: charCount
    };
  }

  // 6. Cannot end with a hyphen
  if (!/[a-z0-9]$/.test(trimmed)) {
    return {
      isValid: false,
      error: `Firebase ID "${trimmed}" is INVALID: Cannot end with a hyphen or trailing symbol.`,
      characterCount: charCount
    };
  }

  // 7. Allowed characters: only lowercase letters, digits, and hyphens
  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    // Identify illegal characters
    const illegalChars = Array.from(new Set(trimmed.replace(/[a-z0-9-]/g, ''))).join(' ');
    return {
      isValid: false,
      error: `Firebase ID "${trimmed}" is INVALID: Contains illegal characters (${illegalChars}). Only lowercase letters (a-z), numbers (0-9), and single hyphens (-) are allowed.`,
      characterCount: charCount
    };
  }

  // 8. Cannot contain double hyphens
  if (/--/.test(trimmed)) {
    return {
      isValid: false,
      error: `Firebase ID "${trimmed}" is INVALID: Google Cloud forbids consecutive hyphens ("--").`,
      characterCount: charCount
    };
  }

  // 9. Blacklist common dummy / placeholder gibberish
  const dummyStrings = [
    'hhuju', 'asdfgh', 'qwerty', '123456', 'abcdef', 
    'sample', 'fakeid', 'foobar', 'dummy', 'testing', 
    'project', 'myproject', 'testproject'
  ];
  if (dummyStrings.includes(trimmed.toLowerCase())) {
    return {
      isValid: false,
      error: `Firebase ID "${trimmed}" is INVALID: This is a placeholder/dummy name. Please go to console.firebase.google.com and copy your real Project ID.`,
      characterCount: charCount
    };
  }

  return {
    isValid: true,
    normalizedId: trimmed,
    characterCount: charCount
  };
}
