import {
  ValidateBy,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

const CUID_REGEX = /^c[0-9a-z]{24}$/;

export function IsCuid(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isCuid',
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && CUID_REGEX.test(value);
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a valid CUID`;
        },
      },
    },
    validationOptions,
  );
}
