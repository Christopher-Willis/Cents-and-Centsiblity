import { StyleProp, Text, TextInput, TextInputProps, TextStyle, View } from 'react-native';

interface FormFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
  multiline?: boolean;
  numberOfLines?: number;
  autoFocus?: boolean;
  /** Wrapper spacing, e.g. 'mb-3' (default) or 'mb-3 flex-1'. */
  className?: string;
  /** Extra input-only classes, e.g. 'min-h-[100px]' for a textarea. */
  inputClassName?: string;
  inputStyle?: StyleProp<TextStyle>;
}

export default function FormField({
  label,
  className = 'mb-3',
  inputClassName = '',
  inputStyle,
  ...inputProps
}: FormFieldProps) {
  return (
    <View className={className}>
      {label && <Text className="mb-1 text-[13px] font-semibold text-ink-muted">{label}</Text>}
      <TextInput
        className={`rounded-xl border border-white/10 bg-surface2 px-3 py-2.5 text-ink ${inputClassName}`}
        placeholderTextColor="#8b939f"
        style={inputStyle}
        {...inputProps}
      />
    </View>
  );
}
