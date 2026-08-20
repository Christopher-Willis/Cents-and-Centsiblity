import { ReactNode } from 'react';
import { View } from 'react-native';

interface CardProps {
  children: ReactNode;
  /** Box-model classes (padding, margin, flex, etc.) — always pass padding here. */
  className?: string;
  tone?: 'surface' | 'surface2';
}

export default function Card({ children, className = '', tone = 'surface' }: CardProps) {
  const bg = tone === 'surface2' ? 'bg-surface2' : 'bg-surface';
  return (
    <View className={`rounded-2xl border border-white/[0.06] ${bg} ${className}`}>{children}</View>
  );
}
