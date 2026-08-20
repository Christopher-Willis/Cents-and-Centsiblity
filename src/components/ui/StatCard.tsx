import { Text } from 'react-native';
import Card from './Card';

interface StatCardProps {
  label: string;
  value: string;
  /** Color override for the value text, e.g. 'text-mint' for a highlighted total. */
  valueClassName?: string;
  /** Box-model classes for the wrapping Card, e.g. 'flex-1'. */
  className?: string;
}

export default function StatCard({
  label,
  value,
  valueClassName = 'text-ink',
  className = '',
}: StatCardProps) {
  return (
    <Card className={`items-center p-4 ${className}`}>
      <Text className="mb-1 text-[13px] font-semibold text-ink-muted">{label}</Text>
      <Text className={`font-display mt-1 text-lg ${valueClassName}`}>{value}</Text>
    </Card>
  );
}
