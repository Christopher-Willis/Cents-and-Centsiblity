import { Text, TouchableOpacity } from 'react-native';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** true (default) = rounded-2xl, for category-style chip lists. false = rounded-lg, for segmented toggles. */
  pill?: boolean;
  /** Box-model classes — always pass padding here, e.g. 'py-1.5 px-3' or 'flex-1 py-2.5 px-3'. */
  className?: string;
  textClassName?: string;
}

export default function Chip({
  label,
  selected,
  onPress,
  pill = true,
  className = '',
  textClassName = '',
}: ChipProps) {
  const radius = pill ? 'rounded-2xl' : 'rounded-lg';
  return (
    <TouchableOpacity
      className={`border ${radius} ${selected ? 'bg-mint border-mint' : 'bg-surface2 border-white/10'} ${className}`}
      onPress={onPress}
    >
      <Text
        className={`text-[13px] ${selected ? 'font-semibold text-midnight' : 'text-ink-muted'} ${textClassName}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
