import { ReactNode } from 'react';
import { Text, View } from 'react-native';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Box-model classes for the wrapper, e.g. 'mt-4' for a bare message. */
  className?: string;
}

export default function EmptyState({
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <View className={`items-center ${className}`}>
      <Text className="text-ink-muted">{title}</Text>
      {description && (
        <Text className="mt-2 text-center text-[13px] text-ink-muted">{description}</Text>
      )}
      {action}
    </View>
  );
}
