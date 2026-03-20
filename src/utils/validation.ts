export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateTravelEntry = (params: {
  imageUri: string | null;
  address: string;
}): ValidationResult => {
  const errors: string[] = [];
  if (!params.imageUri) errors.push('Please take or select a photo for this entry.');
  if (!params.address || params.address.trim().length === 0)
    errors.push('Address is required. Please enable location access or tap Retry.');
  if (params.address && params.address.trim().length > 500)
    errors.push('Address is too long.');
  return { isValid: errors.length === 0, errors };
};

export const generateEntryId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;