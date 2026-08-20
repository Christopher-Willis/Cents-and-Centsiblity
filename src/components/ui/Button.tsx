import { Text, TouchableOpacity } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'secondary-muted' | 'danger' | 'danger-tinted';

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; text: string }> = {
  primary: { bg: 'bg-mint', text: 'text-midnight' },
  secondary: { bg: 'bg-surface2', text: 'text-ink' },
  'secondary-muted': { bg: 'bg-surface2', text: 'text-ink-muted' },
  danger: { bg: 'bg-coral', text: 'text-midnight' },
  'danger-tinted': { bg: 'bg-coral/15', text: 'text-coral' },
};

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** 'pill' = rounded-full (default), 'rounded' = rounded-md for compact inline actions. */
  shape?: 'pill' | 'rounded';
  /** Box-model classes (padding, margin, flex, etc.) — always pass padding here. */
  className?: string;
  /** Text size/weight overrides only — never color, the variant already sets that. */
  textClassName?: string;
  disabled?: boolean;
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  shape = 'pill',
  className = '',
  textClassName = '',
  disabled,
}: ButtonProps) {
  const { bg, text } = VARIANT_STYLES[variant];
  const radius = shape === 'rounded' ? 'rounded-md' : 'rounded-full';
  return (
    <TouchableOpacity
      className={`items-center justify-center ${radius} ${bg} ${className}`}
      onPress={onPress}
      disabled={disabled}
    >
      <Text className={`font-semibold ${text} ${textClassName}`}>{label}</Text>
    </TouchableOpacity>
  );
}
