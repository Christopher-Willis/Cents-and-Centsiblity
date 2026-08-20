import { Text, TouchableOpacity } from 'react-native';
import Card from './Card';

interface MonthNavigatorProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
}

export default function MonthNavigator({ label, onPrev, onNext }: MonthNavigatorProps) {
  return (
    <Card className="mb-4 flex-row items-center justify-between p-3">
      <TouchableOpacity className="px-4 py-2" onPress={onPrev}>
        <Text className="text-xl font-bold text-mint">{'<'}</Text>
      </TouchableOpacity>
      <Text className="text-lg font-semibold text-ink">{label}</Text>
      <TouchableOpacity className="px-4 py-2" onPress={onNext}>
        <Text className="text-xl font-bold text-mint">{'>'}</Text>
      </TouchableOpacity>
    </Card>
  );
}
