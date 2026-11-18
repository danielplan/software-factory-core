import { Pressable, Text } from 'react-native';
import { makeStyles } from '@/theme/make-styles';
import { radius, space, touchTarget, type } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'link';

/**
 * An action with a label. `primary` is the main action of a screen, `link`
 * a secondary text action. The caller owns the workflow.
 */
export function Button({
  children,
  onPress,
  variant = 'primary',
}: Readonly<{
  children: string;
  onPress: () => void;
  variant?: ButtonVariant;
}>) {
  const s = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={children}
      onPress={onPress}
      style={({ pressed }) => [
        variant === 'primary' ? s.filled : s.plain,
        pressed && s.pressed,
      ]}
    >
      <Text style={[s.label, s[`${variant}Label`]]}>{children}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  filled: {
    backgroundColor: colors.accent,
    borderRadius: radius.xl,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: space.l,
    marginVertical: space.s,
  },
  plain: {
    minHeight: touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.m,
  },
  pressed: { opacity: 0.8 },
  label: { ...type.label, color: colors.onAccent, textAlign: 'center' },
  primaryLabel: {},
  linkLabel: { color: colors.link },
}));
