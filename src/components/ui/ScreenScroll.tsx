import { ReactNode } from 'react';
import { ScrollView, Text } from 'react-native';

interface ScreenScrollProps {
  title: string;
  children: ReactNode;
}

export default function ScreenScroll({ title, children }: ScreenScrollProps) {
  return (
    <ScrollView className="flex-1 bg-midnight" contentContainerClassName="p-4 pb-32">
      <Text className="mb-4 text-2xl font-bold text-ink">{title}</Text>
      {children}
    </ScrollView>
  );
}
